const mysql = require('mysql');
const dbconfig = require('./config');
var connection = mysql.createConnection(dbconfig.connection);
connection.query('SELECT `unique`,labels from music', (err, res) => {
    if (err) {}
    console.log(JSON.stringify(res))
    connection.end();
});