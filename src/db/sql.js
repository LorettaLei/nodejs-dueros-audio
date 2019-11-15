module.exports = {
    User: {
        query: 'select user_id from `user` where user_id=?',
        add: 'INSERT INTO `user` (`user_id`,`device_id`,`created`,`type`,`location`) value (?,?,?,?,?)',
    },
    History: {
        add: 'INSERT INTO `history_list` (`user_id`,`device_id`,`audio`,`album`,`search`,`play_durr`,`play_time`,`name`) VALUES (?,?,?,?,?,?,?,?)',
        del: 'delete from history_list where `unique`=?',
        update: 'UPDATE `history_list` SET `play_time`=?,`play_durr`=? where `audio`=? AND device_id=?',
        query: 'SELECT * from history_list WHERE device_id=? ORDER BY play_time ASC',
        queryLike: 'SELECT m.unique,h.audio,m.`name`,m.url,m.singer,m.album,m.albumName,m.cover,m.type from music as m,history_list as h WHERE h.device_id=? AND h.search=? AND h.audio=m.`unique` ORDER BY h.play_durr DESC limit 1'
    },
    Music: {
        searchLike: 'SELECT * from music where labels LIKE ? AND `unique` != ? ORDER BY RAND() LIMIT 1',
        queryAudio: 'SELECT * from music where `unique`=?',
        queryAlbum: 'SELECT * from music where album=? ORDER BY RAND() LIMIT 1'
    },
    Album: {
        all: 'SELECT * from album_list ORDER BY rank ASC'
    }
};