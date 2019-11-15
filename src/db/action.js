const mysql = require('mysql');
const dbconfig = require('./config');
const util = require('../util/util');
const $sql = require('./sql');
const logger = require('../logger').logger;
const keywords = [{"unique": 5, "labels": "轻音乐"},{"unique": 6, "labels": "恭喜发财"}]
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    port: '3306',
    database: 'dueros',
    connectionLimit: 100
});
module.exports = {
    addUser: function(data) {
        logger.info(`action:::addUser:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::addUser:::err:${JSON.stringify(err)}`);
            } else {
                connection.query($sql.User.query, [data.userId + ''], function(error, res) {
                    if (error) {
                        logger.error(`action:::addUser:::error:${JSON.stringify(error)}`);
                        connection.release();
                    } else if (res && res.length == 0) {
                        connection.query($sql.User.add, [data.userId + '', data.deviceId, new Date().getTime(), 'dueros', data.location], function(error1, result) {
                            if (error1) {
                                logger.error(`action:::addUser:::error1:${JSON.stringify(error1)}`);
                            } else {
                                logger.info(`action:::addUser:::result:addok`);
                            }
                            connection.release();
                        });
                    } else {
                        logger.info(`action:::addUser:::res:${JSON.stringify(res)}`);
                        connection.release();
                    }
                });
            }
        })
    },
    addHistory: function(data) {
        logger.info(`action:::addHistory:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::addHistory:::err:${JSON.stringify(err)}`);
            } else {
                connection.query($sql.History.add, [data.userId + '', data.deviceId, data.audio, data.album, data.search, data.playTime, new Date().getTime(), data.name], function(error, result) {
                    if (error) {
                        logger.error(`action:::addHistory:::error:${JSON.stringify(error)}`);
                    } else {
                        logger.info(`action:::addHistory:::add:::result:addok`);
                    }
                    connection.release();
                });
            }
        })
    },
    queryHistoryLike: function(data, callback) {
        logger.info(`action:::queryHistoryLike:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::queryHistoryLike:::err:${JSON.stringify(err)}`);
                callback({ status: 500 });
            } else {
                connection.query($sql.History.queryLike, [data.deviceId, data.search], function(erro, res) {
                    if (erro) {
                        logger.error(`action:::queryHistoryLike:::erro:${JSON.stringify(erro)}`);
                        callback({ status: 500 });
                    } else if (res && res.length > 0) {
                        logger.info(`action:::queryHistoryLike:::res.length:${res.length}`);
                        // 释放连接 
                        connection.release();
                        callback(res[0]);
                    } else {
                        let list = [];
                        let len = keywords.length;
                        for (let i = 0; i < len; i++) {
                            if (keywords[i].labels.indexOf(data.search) != '-1') {
                                list.push(keywords[i]);
                            }
                        }
                        if (list.length < 1) {
                            list = keywords;
                        }
                        let index = Math.floor(Math.random() * list.length); // 0 - list.length-1的随机整数
                        logger.info(`action:::queryHistoryLike:::unique:${list[index].unique}`);
                        connection.query($sql.Music.queryAudio, [list[index].unique], function(error, result) {
                            if (error) {
                                logger.error(`action:::queryHistoryLike:::error:${JSON.stringify(error)}`);
                                connection.release();
                                callback({ status: 500 });
                            } else {
                                logger.info(`action:::queryHistoryLike:::result.name:${result[0].name}`);
                                // 释放连接 
                                connection.release();
                                callback(result[0]);
                            }
                        });
                    }
                });
            }
        })
    },
    updateHistory: function(data) {
        logger.info(`action:::updateHistory:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::updateHistory:::err:${JSON.stringify(err)}`);
            } else {
                connection.query($sql.History.update, [new Date().getTime(), data.playTime, data.audio, data.deviceId], function(error, result) {
                    if (error) {
                        logger.error(`action:::updateHistory:::error:${JSON.stringify(error)}`);
                    } else {
                        logger.info(`action:::updateHistory:::result:ok`);
                    }
                    // 释放连接 
                    connection.release();
                });
            }
        })
    },
    delHistory: function(data) {
        logger.info(`action:::delHistory:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::delHistory:::err:${JSON.stringify(err)}`);
            } else {
                connection.query($sql.History.del, [data.unique], function(error, result) {
                    if (error) {
                        logger.error(`action:::delHistory:::error:${JSON.stringify(error)}`);
                        connection.release();
                    } else {
                        logger.info(`action:::delHistory:::result:ok`);
                        // 释放连接 
                        connection.release();
                    }
                });
            }
        })
    },
    queryMusicLike: function(data, callback) {
        logger.info(`action:::queryMusicLike:::参数:${JSON.stringify(data)}`);
        let list = [];
        let len = keywords.length;
        for (let i = 0; i < len; i++) {
            if (keywords[i].labels.indexOf(data.search) != '-1' && keywords[i].unique != data.now) {
                list.push(keywords[i]);
            }
        }
        if (list.length < 1) {
            list = keywords;
        }
        let index = Math.floor(Math.random() * list.length); // 0 - list.length-1的随机整数
        logger.info(`action:::queryMusicLike:::unique:${list[index].unique}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::queryMusicLike:::err:${JSON.stringify(err)}`);
                callback({ status: 500 });
            } else {
                connection.query($sql.Music.queryAudio, [list[index].unique], function(erro, res) {
                    if (erro) {
                        logger.error(`action:::queryMusicLike:::erro:${JSON.stringify(erro)}`);
                        connection.release();
                        callback({ status: 500 });
                    } else {
                        logger.info(`action:::queryMusicLike:::res.name:${res[0].name}`);
                        // 释放连接 
                        connection.release();
                        callback(res[0]);
                    }
                });
            }
        })
    },
    queryMusicAudio: function(data, callback) {
        logger.info(`action:::queryMusicAudio:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::queryMusicAudio:::err:${JSON.stringify(err)}`);
                callback({ status: 500 });
            } else {
                connection.query($sql.Music.queryAudio, [data.unique], function(error, result) {
                    if (error) {
                        logger.error(`action:::queryMusicAudio:::error:${JSON.stringify(error)}`);
                        connection.release();
                        callback({ status: 500 });
                    } else {
                        logger.info(`action:::queryMusicAudio:::result:${JSON.stringify(result)}`);
                        // 释放连接 
                        connection.release();
                        callback(result[0]);
                    }
                });
            }
        })
    },
    queryAlbumAudio: function(data, callback) {
        logger.info(`action:::queryAlbumAudio:::参数:${JSON.stringify(data)}`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::queryAlbumAudio:::err:${JSON.stringify(err)}`);
                callback({ status: 500 });
            } else {
                connection.query($sql.Music.queryAlbum, [data.unique], function(erro, res) {
                    if (erro) {
                        logger.error(`action:::queryAlbumAudio:::erro:${JSON.stringify(erro)}`);
                        connection.release();
                        callback({ status: 500 });
                    } else {
                        logger.info(`action:::queryAlbumAudio:::res:${JSON.stringify(res)}`);
                        connection.query($sql.Music.queryAudio, [res[0].unique], function(error, result) {
                            if (error) {
                                logger.error(`action:::queryAlbumAudio:::error:${JSON.stringify(error)}`);
                                connection.release();
                                callback({ status: 500 });
                            } else {
                                logger.info(`action:::queryAlbumAudio:::result:${JSON.stringify(result)}`);
                                // 释放连接 
                                connection.release();
                                callback(result[0]);
                            }
                        });
                    }
                });
            }
        })
    },
    queryAlbumList: function(callback) {
        logger.info(`action:::queryAlbumList:::参数:无`);
        pool.getConnection(function(err, connection) {
            if (err) {
                logger.error(`action:::queryAlbumList:::err:${JSON.stringify(err)}`);
                callback({ status: 500 });
            } else {
                connection.query($sql.Album.all, function(error, result) {
                    if (error) {
                        logger.error(`action:::queryAlbumList:::error:${JSON.stringify(error)}`);
                        connection.release();
                        callback({ status: 500 });
                    } else {
                        logger.info(`action:::queryAlbumList:::result:${JSON.stringify(result)}`);
                        // 释放连接 
                        connection.release();
                        callback(result);
                    }
                });
            }
        })
    }
}