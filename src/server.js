const express = require('express');
const logger = require('./logger').logger;
const app = express();
const DuerOSBot = require('./Bot');
app.head('/', (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'HEAD,GET',
        'Access-Control-Max-Age': '3600',
        'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Cookie'
            // 'Access-Control-Allow-Headers': '*'
    });
    res.sendStatus(200);
});
app.get('/', (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'HEAD,GET',
        'Access-Control-Max-Age': '3600',
        'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Cookie'
            // 'Access-Control-Allow-Headers': '*'
    });
    res.sendStatus(204);
});
app.post('/', (req, res) => {
    // logger.info('bot request start');
    req.rawBody = '';

    req.setEncoding('utf8');
    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });

    req.on('end', () => {
        let requestBody;
        try {
            requestBody = JSON.parse(req.rawBody);
        } catch (e) {
            console.error(e);
            logger.error(JSON.stringify(e))
            return res.send(JSON.stringify({ status: 1 }));
        }
        let bot = new DuerOSBot(JSON.parse(req.rawBody));
        // 开启签名认证
        bot.initCertificate(req.headers, req.rawBody).enableVerifyRequestSign();
        bot.setPrivateKey(__dirname + '/rsa_private_key.pem').then(function(key) {
            //  0: debug  1: online
            bot.botMonitor.setEnvironmentInfo(key, 1);

            bot.run().then(function(result) {
                res.send(result);
            });
        }, function(err) {
            console.error(err);
            logger.error(JSON.stringify(err))
        });
    });
}).listen(8015);
console.log('listen 8015');