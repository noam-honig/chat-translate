import * as express from 'express';
import { Express, Response } from 'express';
import * as compression from 'compression';
import * as fs from 'fs';
import * as secure from 'express-force-https';
import { config } from 'dotenv';
import '../../stam';
import * as bodyParser from 'body-parser';
import { Message } from '../model/message';
import * as https from 'https';

import * as request from 'request';


let text = 'hello world';
let target = "ru";
let source = "en";






config();
let app = express();
let port = process.env.PORT || 3000;

if (!process.env.DISABLE_HTTPS)
    app.use(secure);


app.use(express.static('dist/chat-translate'));
app.use(bodyParser.json())


let connection: Response[] = [];
let tempConnections: any = {};
app.get('/api/stream', (req, res) => {

    res.writeHead(200, {

        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    let key = new Date().toISOString();

    tempConnections[key] = () => {
        connection.push(res);
        tempConnections[key] = undefined;

    };
    console.log('registered to stream ' + key);
    res.write("event:authenticate\ndata:" + key + "\n\n");

    req.on("close", () => {
        tempConnections[key] = undefined;
        let i = connection.indexOf(res);
        if (i >= 0)
            connection.splice(i, 1);
    });
});
app.use(compression());
app.post('/api/authenticate', (req, res) => {
    let x = tempConnections[req.body.key];
    if (x) {
        x();
        res.json({ ok: true });
    }
});
let translationLanguage = 'es';
let id = 0;
app.get('/api/newId', (req, res) => {
    res.json({ id: id++ });
});
app.get('/api/lang', (req, res) => {
    if (req.query.set) {
        translationLanguage = req.query.set;
    }
    res.json({ lang: translationLanguage });
});
app.post('/api/test', async (req, result) => {
    let message: Message = req.body.message;

    let source = translationLanguage;
    let target = "en";
    if (message.isEnglish) {
        target = source;
        source = 'en';
    }
    try {
        request("https://www.googleapis.com/language/translate/v2?key=" + process.env.google_key + "&source=" + source + "&target=" + target + "&format=text", {
            method: 'post',
            body: JSON.stringify({ q: message.text })
        }, (err, res, body) => {
            message.translatedText = JSON.parse(body).data.translations[0].translatedText;


            connection.forEach(y => y.write("data:" + JSON.stringify(message) + "\n\n"))
            result.json({ item: '123' });
        });
    }
    catch (err) {
        result.sendStatus(500);
        result.json(err);
    }



});

app.listen(port);
console.log("Listening on port: " + port);