const Bot = require('bot-sdk');
const PlayerInfo = Bot.Directive.AudioPlayer.PlayerInfo;
const AudioPlay = Bot.Directive.AudioPlayer.Play;
const AudioStop = Bot.Directive.AudioPlayer.Stop;
const PlayPauseButton = Bot.Directive.AudioPlayer.Control.PlayPauseButton;
const NextButoon = Bot.Directive.AudioPlayer.Control.NextButton;
const PreviousButton = Bot.Directive.AudioPlayer.Control.PreviousButton;
const logger = require('./logger').logger;
const Action = require('./db/action');
class DuerOSBot extends Bot {
    constructor(postData) {
        super(postData);
        this.user = this.request.getUserId() + '' || '';
        this.deviceId = this.request.getData().context.System.device.deviceId || '';
        this.location = this.request.getLocation() || '';
        this.search = this.getSessionAttribute('search') || '';
        //开始
        this.addLaunchHandler(() => {
            let isScreen = this.isSupportDisplay();
            logger.info(`Bot:::addLaunch:::用户ID:${this.user}:::设备ID:${this.deviceId}:::地理位置:${this.location}`);
            //登录或注册用户
            this.setSessionAttribute('outTime', (new Date().getTime()) + 30 * 60 * 1000 + ''); //默认定时30分钟
            if (isScreen) {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.renderList().then(res => {
                        logger.info(`Bot:::addLaunch:::设备ID:${this.deviceId}:::有屏`)
                        resolve({
                            directives: [res],
                            outputSpeech: '欢迎使用小花乐队',
                            shouldEndSession: false
                        });
                    }).catch(err => {
                        logger.error(`Bot:::addLaunch:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            outputSpeech: '欢迎使用小花乐队',
                            shouldEndSession: false
                        })
                    });
                });
            } else {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.getPlayData('轻音乐').then(res => {
                        logger.info(`Bot:::addLaunch:::设备ID:${this.deviceId}:::无屏音箱:::res.name:${res.name}`);
                        resolve({
                            directives: this.getDirecter(0, res),
                            outputSpeech: '欢迎使用小花乐队',
                            shouldEndSession: false
                        });
                    }).catch(err => {
                        logger.error(`Bot:::addLaunch:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            outputSpeech: '欢迎使用小花乐队',
                            shouldEndSession: false
                        })
                    })
                });
            }
        });
        //退出
        this.addSessionEndedHandler(() => {
            logger.info(`Bot:::退出:::设备ID:${this.deviceId}`);
            this.updateHistory();
            let directive = new AudioStop();
            this.endSession();
            return {
                directives: [directive]
            };
        });
        //停止/退出
        this.addIntentHandler('ai.dueros.common.stop_intent', () => {
            logger.info(`Bot:::stop_intent:::设备ID:${this.deviceId}`);
            this.updateHistory();
            let directive = new AudioStop();
            this.endSession();
            return {
                directives: [directive]
            };
        });
        //返回
        this.addIntentHandler('flowerBack', () => {
            this.waitAnswer();
            this.setExpectSpeech(false);
            logger.info(`Bot:::flowerBack:::设备ID:${this.deviceId}:::start`);
            return new Promise((resolve, reject) => {
                this.renderList().then(res => {
                    resolve({
                        directives: [res],
                        shouldEndSession: false
                    });
                }).catch(err => {
                    logger.error(`Bot:::flowerBack:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                    resolve({
                        outputSpeech: '刚刚小花没听清，请再对小花说一遍',
                        shouldEndSession: false
                    })
                });
            });
        });
        //播放技能
        this.addIntentHandler('flowerPlay', () => {
            //模糊
            let word_class = this.getSlot('word_class') || '';
            //明确
            let word_setTime = this.getSlot('sys.number');
            let durration = this.getSlot('durration');
            let word_No = this.getSlot('sys.No')
            let speech = ''; //播放前小度要说的话
            let isScreen = this.isSupportDisplay();
            logger.info(`Bot:::flowerPlay:::设备ID:${this.deviceId}:::word_class:${word_class}:::word_No:${word_No}:::word_setTime:${word_setTime}:::durration:${durration}`);
            if (word_setTime && durration) { //用户设置了定时
                let outTime = 0;
                switch (durration) {
                    case '时':
                        outTime = (new Date().getTime()) + word_setTime * 60 * 60 * 1000;
                        break;
                    case '分':
                        outTime = (new Date().getTime()) + word_setTime * 60 * 1000;
                        break;
                    case '秒':
                        outTime = (new Date().getTime()) + word_setTime * 1000;
                        break;
                    default:
                        outTime = (new Date().getTime()) + word_setTime * 60 * 1000;
                }
                speech = '已经为您定时';
                this.setSessionAttribute('outTime', outTime + '');
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    outputSpeech: speech,
                    shouldEndSession: false
                }
            } else if (!isScreen) {
                this.setSessionAttribute('outTime', (new Date().getTime()) + 30 * 60 * 1000 + ''); //默认定时30分钟                
            }
            if (word_No) {
                if (word_No > 6) {
                    word_No = 6;
                } else if (word_No < 1) {
                    word_No = 1;
                }
                return new Promise((resolve, reject) => {
                    Action.queryAlbumAudio({
                        unique: word_No
                    }, (res) => {
                        logger.info(`Bot:::flowerPlay:::设备ID:${this.deviceId}:::album:${word_No}:::${JSON.stringify(res)}`);
                        let history = this.getSessionAttribute('history') || '';
                        history = history == '' ? res.unique : history + '#' + res.unique;
                        this.setSessionAttribute('history', history);
                        this.setSessionAttribute('playData', res);
                        this.setSessionAttribute('search', res.label);
                        this.setSessionAttribute('playStart', new Date().getTime());
                        this.waitAnswer();
                        this.setExpectSpeech(false);
                        if (res.unique) {
                            // Action.addHistory({
                            //     userId: this.user,
                            //     deviceId: this.deviceId,
                            //     audio: res.unique,
                            //     album: res.album,
                            //     search: res.label,
                            //     name: res.name,
                            //     playTime: 0
                            // }); //播放记录写入数据库
                            resolve({
                                outputSpeech: '好的，开始为您播放',
                                directives: this.getDirecter(0, res),
                                shouldEndSession: false
                            });
                        } else {
                            resolve({
                                outputSpeech: '当前网络不太好，请检查网络后再试',
                                shouldEndSession: false
                            })
                        }
                    });
                })
            }
            if (word_class) {
                switch (word_class) {
                    case '轻音乐':
                        speech = '好的，为您播放轻音乐';
                        break;
                    case '古风':
                        speech = '好的，为您播放古风';
                        break;
                    case 'DJ':
                        speech = '好的，为您播放DJ';
                        break;
                    case '钢琴曲':
                        speech = '正在为您讲钢琴曲';
                        break;
                    default:
                        speech = '好的，开始为您播放';
                        break;
                }
            } else {
                word_class = this.search;
            }
            this.waitAnswer();
            this.setExpectSpeech(false);
            return new Promise((resolve, reject) => {
                this.getPlayData(word_class, 1).then(res => {
                    logger.info(`Bot:::flowerPlay:::deviceID:${this.deviceId}:::res.name:${res.name}`);
                    resolve({
                        directives: this.getDirecter(0, res),
                        outputSpeech: speech,
                        shouldEndSession: false
                    });
                }).catch(err => {
                    logger.error(`Bot:::flowerPlay:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                    resolve({
                        outputSpeech: '刚刚小花没听清，请再对小花说一遍',
                        shouldEndSession: false
                    })
                })
            });
        });
        //取消
        this.addIntentHandler('ai.dueros.common.cancel_intent', () => {
            logger.info(`Bot:::cancel_intent:::设备ID:${this.deviceId}:::start`);
            this.waitAnswer();
            return {
                outputSpeech: '那你还想听别的什么吗？',
                shouldEndSession: false
            };
        });
        //确认
        this.addIntentHandler('ai.dueros.common.confirm_intent', () => {
            logger.info(`Bot:::confirm_intent:::设备ID:${this.deviceId}start`);
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                shouldEndSession: false
            }
        });
        //听不懂
        this.addIntentHandler('ai.dueros.common.default_intent', () => {
            logger.info(`Bot:::default_intent:::设备ID:${this.deviceId}:::start`);
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                outputSpeech: '小花没听懂呢，可以对我说轻音乐，或者钢琴曲哦',
                shouldEndSession: false
            }
        });
        //上一个
        this.addIntentHandler('ai.dueros.common.previous_intent', () => {
            let history = this.getSessionAttribute('history') || '';
            let playData = this.getSessionAttribute('playData');
            history = history == '' ? [] : history.toString().split('#');
            logger.info(`Bot:::previous_intent:::设备ID:${this.deviceId}:::playData.name:${playData.name}:::history:${history.join('#')}`);
            if (history.length > 1 && playData) {
                logger.info(`Bot:::previous_intent:::设备ID:${this.deviceId}:::history:${JSON.stringify(history)}`);
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.getPrevAudio().then(res => {
                        logger.info(`Bot:::previous_intent:::设备ID:${this.deviceId}:::history:${JSON.stringify(history)}:::res.name:${res.name}`);
                        resolve({
                            directives: this.getDirecter(0, res),
                            outputSpeech: `即将播放上一首${res.name}`,
                            shouldEndSession: false
                        })
                    }).catch(err => {
                        logger.error(`Bot:::previous_intent:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            outputSpeech: '刚刚小花没听清，请再对小花说一遍',
                            shouldEndSession: false
                        })
                    });
                })
            } else if (playData) {
                logger.info(`Bot:::previous_intent:::设备ID:${this.deviceId}:::无历史有播放数据`);
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    outputSpeech: '这是第一首了哦',
                    shouldEndSession: false
                };
            } else {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.getPlayData(this.search).then(res => {
                        logger.info(`Bot:::previous_intent:::设备ID:${this.deviceId}:::无历史无播放数据:::res.name:${res.name}`);
                        resolve({
                            directives: this.getDirecter(0, res),
                            shouldEndSession: false
                        });
                    }).catch(err => {
                        logger.error(`Bot:::previous_intent:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            outputSpeech: '刚刚小花没听清，请再对小花说一遍',
                            shouldEndSession: false
                        })
                    });
                })
            }
        });
        //下一个
        this.addIntentHandler('ai.dueros.common.next_intent', () => {
            this.waitAnswer();
            this.setExpectSpeech(false);
            logger.info(`Bot:::next_intent:::设备ID:${this.deviceId}:::start`);
            return new Promise((resolve, reject) => {
                this.getNextAudio().then(res => {
                    logger.info(`Bot:::next_intent:::设备ID:${this.deviceId}:::res.name:${res.name}`);
                    resolve({
                        directives: this.getDirecter(0, res),
                        outputSpeech: `下一首${res.name}`,
                        shouldEndSession: false
                    });
                }).catch(err => {
                    logger.error(`Bot:::next_intent:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                    resolve({
                        outputSpeech: '刚刚小花没听清，请再对小花说一遍',
                        shouldEndSession: false
                    })
                });
            })
        });
        //暂停
        this.addIntentHandler('ai.dueros.common.pause_intent', () => {
            logger.info(`Bot:::pause_intent:::设备ID:${this.deviceId}`);
            this.setSessionAttribute('outTime', 0 + '');
            this.updateHistory();
            let directive = new AudioStop();
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                directives: [directive],
                outputSpeech: '好的，已为您暂停',
                shouldEndSession: false
            }
        });
        //继续
        this.addIntentHandler('ai.dueros.common.continue_intent', () => {
            let offsetInMilliSeconds = this.getSessionAttribute('offsetInMilliSeconds') || 0;
            let playData = this.getSessionAttribute('playData');
            logger.info(`Bot:::continue_intent:::设备ID:${this.deviceId}:::start`);
            this.setSessionAttribute('outTime', (new Date().getTime()) + 30 * 60 * 1000 + ''); //默认定时30分钟
            if (playData) {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    directives: this.getDirecter(offsetInMilliSeconds, playData),
                    shouldEndSession: false
                }
            } else {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    outputSpeech: '当前没有可以播放的内容，你可以对我说下雨的声音',
                    shouldEndSession: false
                }
            }
        });
        //   音频暂停
        this.addEventListener('AudioPlayer.PlaybackStopped', event => {
            logger.info(`Bot:::PlaybackStopped:::设备ID:${this.deviceId}:::start`);
            this.setSessionAttr(event);
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                shouldEndSession: false
            }
        });
        //播放结束
        this.addEventListener('AudioPlayer.PlaybackFinished', event => {
            let playData = this.getSessionAttribute('playData') || {};
            let outTime = this.getSessionAttribute('outTime') || 0;
            outTime = parseInt(outTime);
            let nowtime = new Date().getTime();
            logger.info(`Bot:::播放结束:::设备ID:${this.deviceId}:::playData.name:${playData.name}:::outTime:${outTime}`);
            if (outTime != 0 && nowtime >= outTime) { //当前时间大于设置定时的时间;无屏的定时
                logger.info(`Bot:::播放结束:::单曲循环:::设备ID:${this.deviceId}:::playData.name:${playData.name}:::outTime:${outTime}`);
                this.updateHistory();
                this.setSessionAttribute('outTime', 0 + '');
                this.waitAnswer();
                this.setExpectSpeech(false);
                let directive = new AudioStop();
                return {
                    directives: [directive],
                    shouldEndSession: false
                }
            } else if (playData.type == 'nature') { //轻音乐单曲循环
                logger.info(`Bot:::播放结束:::单曲循环:::设备ID:${this.deviceId}:::playData.name:${playData.name}:::outTime:${outTime}`);
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    directives: this.getDirecter(0, playData),
                    shouldEndSession: false
                };
            } else {
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.getNextAudio().then(res => {
                        logger.info(`Bot:::播放结束:::设备ID:${this.deviceId}:::res.name:${res.name}`);
                        resolve({
                            directives: this.getDirecter(0, res),
                            shouldEndSession: false
                        });
                    }).catch(err => {
                        logger.error(`Bot:::播放结束:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            shouldEndSession: false
                        })
                    });
                })
            }
        });
        // 播放快结束
        this.addEventListener('AudioPlayer.PlaybackNearlyFinished', (event) => {
            return this.isTimeOut();
        });
        this.addEventListener('Display.ElementSelected', (event) => { //列表选择
            logger.info(`Bot:::列表选择:::设备ID:${this.deviceId}:::token:${event.token}`);
            this.waitAnswer();
            this.setExpectSpeech(false);
            return new Promise((resolve, reject) => {
                Action.queryAlbumAudio({
                    unique: event.token
                }, res => {
                    logger.info(`Bot:::列表选择:::设备ID:${this.deviceId}:::album:${event.token}:::${JSON.stringify(res)}`);
                    let history = this.getSessionAttribute('history') || '';
                    history = history == '' ? res.unique : history + '#' + res.unique;
                    this.setSessionAttribute('history', history);
                    this.setSessionAttribute('playData', res);
                    this.setSessionAttribute('search', res.label);
                    this.setSessionAttribute('playStart', new Date().getTime());
                    if (res.unique) {
                        // Action.addHistory({
                        //     userId: this.user,
                        //     deviceId: this.deviceId,
                        //     audio: res.unique,
                        //     album: res.album,
                        //     search: res.label,
                        //     name: res.name,
                        //     playTime: 0
                        // }); //播放记录写入数据库
                        resolve({
                            directives: this.getDirecter(0, res),
                            shouldEndSession: false
                        });
                    } else {
                        resolve({
                            shouldEndSession: false
                        })
                    }
                });
            });
        });
        this.addEventListener('Form.ButtonClicked', event => { //表单控件
            logger.info(`Bot:::ButtonClicked:::设备ID:${this.deviceId}:::event.name:${event.name}`);
            let playData = this.getSessionAttribute('playData');
            let history = this.getSessionAttribute('history') || '';
            history = history == '' ? [] : history.toString().split('#');
            if (event.name == 'PREVIOUS') {
                logger.info(`Bot:::ButtonClicked:::PREVIOUS:::设备ID:${this.deviceId}:::search:${this.search}:::history:${JSON.stringify(history)}`)
                if (history.length > 1 && playData) {
                    this.waitAnswer();
                    this.setExpectSpeech(false);
                    return new Promise((resolve, reject) => {
                        this.getPrevAudio().then(res => {
                            logger.info(`Bot:::ButtonClicked:::PREVIOUS:::设备ID:${this.deviceId}:::res.name:${res.name}`);
                            resolve({
                                directives: this.getDirecter(0, res),
                                outputSpeech: `即将播放上一首${res.name}`,
                                shouldEndSession: false
                            })
                        }).catch(err => {
                            logger.error(`Bot:::ButtonClicked:::PREVIOUS:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                            resolve({
                                shouldEndSession: false
                            })
                        });
                    })
                } else if (playData) {
                    this.waitAnswer();
                    this.setExpectSpeech(false);
                    return {
                        outputSpeech: '这是第一首了哦',
                        shouldEndSession: false
                    };
                } else {
                    playData = this.getPlayData(this.search);
                    history = history.push(playData.unique);
                    this.setSessionAttribute('history', history.join('#'));
                    this.waitAnswer();
                    this.setExpectSpeech(false);
                    return {
                        directives: this.getDirecter(0, playData),
                        shouldEndSession: false
                    };
                }
            } else if (event.name == 'NEXT') {
                logger.info(`Bot:::ButtonClicked:::NEXT:::设备ID:${this.deviceId}:::search:${this.search}:::history:${JSON.stringify(history)}`)
                this.waitAnswer();
                this.setExpectSpeech(false);
                return new Promise((resolve, reject) => {
                    this.getNextAudio().then(res => {
                        logger.info(`Bot:::ButtonClicked:::NEXT:::设备ID:${this.deviceId}:::search:${this.search}:::history:${JSON.stringify(history)}:::res.name:${res.name}`)
                        resolve({
                            directives: this.getDirecter(0, res),
                            outputSpeech: `下一首${res.name}`,
                            shouldEndSession: false
                        });
                    }).catch(err => {
                        logger.error(`Bot:::ButtonClicked:::NEXT:::设备ID:${this.deviceId}:::err:${JSON.stringify(err)}`);
                        resolve({
                            shouldEndSession: false
                        })
                    });
                })
            } else {
                logger.info(`Bot:::ButtonClicked:::其他:::设备ID:${this.deviceId}:::search:${this.search}:::history:${JSON.stringify(history)}`)
                this.waitAnswer();
                this.setExpectSpeech(false);
                return {
                    shouldEndSession: false
                }
            }
        });
        this.addDefaultEventListener(() => {
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                shouldEndSession: false
            }
        });
    }

    getDirecter(offset, playData, type = 0) { //创建音频
        let playerInfo = new PlayerInfo();
        let playpause = new PlayPauseButton();
        let previous = new PreviousButton();
        let next = new NextButoon();
        let controls = [
            playpause,
            previous,
            next
        ];
        playerInfo.setControls(controls);
        playerInfo.setTitle(playData.name);
        playerInfo.setTitleSubtext1('作者：' + playData.singer);
        playerInfo.setTitleSubtext2('专辑：' + playData.albumName);
        playerInfo.setArt(playData.cover);
        let directives = [];
        let directive
        if (type != 0) {
            directive = new AudioPlay(playData.url, 'ENQUEUE');
        } else {
            directive = new AudioPlay(playData.url, 'REPLACE_ALL');
        }
        directive.setOffsetInMilliSeconds(offset); //设置进度
        directive.setPlayerInfo(playerInfo);
        directives.push(directive)
        return directives;
    }
    async getNextAudio() {
        let history = this.getSessionAttribute('history') || '';
        history = history == '' ? [] : history.toString().split('#');
        let playData = this.getSessionAttribute('playData');
        logger.info(`Bot:::getNextAudio:::deviceID:${this.deviceId}:::search:${this.search}:::playData.name:${playData.name}:::history:${history.join('#')}`)

        if (history.length > 0) {
            this.updateHistory();
        }
        playData = await new Promise((resolve, reject) => {
            Action.queryMusicLike({
                search: this.search,
                now: playData ? playData.unique : ''
            }, (res) => {
                resolve(res);
            });
        });
        history.push(playData.unique);
        // Action.addHistory({
        //     userId: this.user,
        //     deviceId: this.deviceId,
        //     audio: playData.unique,
        //     album: playData.album,
        //     search: this.search,
        //     name: playData.name,
        //     playTime: 0
        // }); //播放记录写入数据库
        this.setSessionAttribute('playStart', new Date().getTime());
        this.setSessionAttribute('history', history.join('#'));
        this.setSessionAttribute('playData', playData);
        return playData;
    }
    async getPrevAudio() {
        let deviceId = this.request.getData().context.System.device.deviceId || '';
        let history = this.getSessionAttribute('history') || '';
        history = history == '' ? [] : history.toString().split('#');
        let unique = history[history.length - 2];
        logger.info(`Bot:::getPrevAudio:::deviceID:${this.deviceId}:::history:${history.join('#')}`)
            //删除最后一条记录
        Action.delHistory({ audio: history[history.length - 1], deviceId: deviceId });
        //更新倒数第二条记录
        this.updateHistory();
        let playData = await new Promise((resolve, reject) => {
            Action.queryMusicAudio({
                unique: unique
            }, res => {
                logger.info(`Bot:::getPrevAudio:::设备ID:${this.deviceId}:::res.name:${res.name}`)
                resolve(res);
            })
        });
        if (history.length > 0) {
            history.pop();
        }
        this.setSessionAttribute('playStart', new Date().getTime());
        this.setSessionAttribute('playData', playData);
        this.setSessionAttribute('history', history.join('#'));
        return playData;
    }
    async getPlayData(search, type) {
        let playData;
        let history = this.getSessionAttribute('history') || '';
        history = history == '' ? [] : history.toString().split('#');
        logger.info(`Bot:::getPlayData:::deviceID:${this.deviceId}:::history:${history.join('#')}`)
        if (history.length > 0) {
            this.updateHistory();
        }
        if (type) { //历史记录查询
            playData = await new Promise((resolve, reject) => {
                Action.queryHistoryLike({
                    search: search,
                    deviceId: this.deviceId
                }, function(res) {
                    resolve(res);
                })
            });
        } else { //系统随机查询
            playData = await new Promise((resolve, reject) => {
                Action.queryMusicLike({
                    search: search,
                    now: ''
                }, function(res) {
                    resolve(res)
                })
            });
        }
        history.push(playData.unique);
        // Action.addHistory({
        //     userId: this.user,
        //     deviceId: this.deviceId,
        //     audio: playData.unique,
        //     album: playData.album,
        //     search: search,
        //     name: playData.name,
        //     playTime: 0
        // }); //播放记录写入数据库
        this.setSessionAttribute('history', history.join('#'));
        this.setSessionAttribute('playData', playData);
        this.setSessionAttribute('search', search);
        this.setSessionAttribute('playStart', new Date().getTime());
        return playData
    }
    async renderList() {
        var albumList = await new Promise((resolve, reject) => {
            Action.queryAlbumList(res => {
                logger.info(`Bot:::renderList:::设备ID:${this.deviceId}:::res:${JSON.stringify(res)}`)
                resolve(res);
            })
        });
        logger.info(`Bot:::renderList:::设备ID:${this.deviceId}:::albumList.length:${albumList.length}`)
        let ListTemplate = Bot.Directive.Display.Template.ListTemplate1;
        let RenderTemplate = Bot.Directive.Display.RenderTemplate;
        let ListTemplateItem = Bot.Directive.Display.Template.ListTemplateItem;
        let listTemplate = new ListTemplate();
        listTemplate.setBackGroundImage('http://www.eduche.com/myimg/article/954/1_ewiyjb1457440029660451.jpg');
        for (let i = 0; i < albumList.length; i++) {
            let listTemplateItem = new ListTemplateItem();
            listTemplateItem.setToken(albumList[i].unique + '');
            listTemplateItem.setImage(albumList[i].cover, 200, 150);
            listTemplateItem.setPlainPrimaryText(albumList[i].name);
            listTemplateItem.setPlainSecondaryText(`共${albumList[i].number}首`);
            listTemplate.addItem(listTemplateItem);
        }
        return new RenderTemplate(listTemplate);
    }
    isTimeOut() {
        let outTime = this.getSessionAttribute('outTime') || 0;
        outTime = parseInt(outTime);
        let nowtime = new Date().getTime();
        // logger.info(`Bot:::isTimeOut:::outTime:${outTime}`);
        if (outTime != 0 && nowtime >= outTime) { //当前时间大于设置定时的时间;无屏的定时
            this.updateHistory();
            this.setSessionAttribute('outTime', 0 + '');
            this.waitAnswer();
            this.setExpectSpeech(false);
            let directive = new AudioStop();
            return {
                directives: [directive],
                shouldEndSession: false
            }
        } else {
            this.waitAnswer();
            this.setExpectSpeech(false);
            return {
                shouldEndSession: false
            };
        }
    }
    updateHistory() {
        let history = this.getSessionAttribute('history') || '';
        let playData = this.getSessionAttribute('playData');
        history = history == '' ? [] : history.toString().split('#');
        let playStart = this.getSessionAttribute('playStart');
        logger.info(`Bot:::updateHistory:::deviceId:${this.deviceId}:::history.length:${history.join('#')}`);
        if (history.length > 1) {
            let playTime = playStart ? new Date().getTime() - playStart : 0;
            Action.addHistory({
                userId: this.user,
                deviceId: this.deviceId,
                audio: playData.unique,
                album: playData.album,
                search: this.search,
                name: playData.name,
                playTime: playTime
            }); //播放记录写入数据库
        }
    }
    setSessionAttr(event) {
        this.setSessionAttribute('token', event.token);
        this.setSessionAttribute('offsetInMilliSeconds', event.offsetInMilliSeconds);
    }
}
module.exports = DuerOSBot;