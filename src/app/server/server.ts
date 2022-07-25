import * as express from 'express';
import { Express, Response } from 'express';
import * as compression from 'compression';
import * as fs from 'fs';
import * as secure from 'express-force-https';
import { config } from 'dotenv';
import '../../stam';
import * as bodyParser from 'body-parser';
import { Message, ConversationInfo } from '../model/message';
import * as https from 'https';

import * as request from 'request';

config();
let app = express();
let port = process.env.PORT || 3000;

if (!process.env.DISABLE_HTTPS)
    app.use(secure);


app.use(express.static('dist/chat-translate'));
app.use(bodyParser.json())



let tempConnections: any = {};
app.get('/api/stream', (req, res) => {

    res.writeHead(200, {

        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    let key = new Date().toISOString();

    tempConnections[key] = (conversation) => {
        let c = activeConversations.get(conversation);
        if (!c) {
            activeConversations.set(conversation, c = new ActiveConversation({
                id: conversation, guestLanguage: undefined, hostLanguage: undefined, username: undefined
            }));

        }
        c.addConnection(res);

        tempConnections[key] = undefined;

    };
    console.log('registered to stream ' + key);
    res.write("event:authenticate\ndata:" + key + "\n\n");

    req.on("close", () => {
        tempConnections[key] = undefined;
        activeConversations.forEach(x => { x.removeConnection(res) });

    });
});
app.use(compression());
app.post('/api/authenticate', (req, res) => {
    let x = tempConnections[req.body.key];
    if (x) {
        x(req.body.conversation);
        res.json({ ok: true });
    }
});
let translationLanguage = 'es';
let id = 1;
app.get('/api/newId', (req, res) => {
    res.json({ id: id++ });
});
app.get('/api/lang', (req, res) => {
    if (req.query.set) {
        translationLanguage = req.query.set as string;
    }
    res.json({ lang: translationLanguage });
});
function makeid() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

let activeConversations = new Map<string, ActiveConversation>();

class ActiveConversation {
    send(message: Message) {
        this.connection.forEach(y => y.write("data:" + JSON.stringify(message) + "\n\n"))
    }
    removeConnection(res: Response) {
        let i = this.connection.indexOf(res);
        if (i >= 0)
            this.connection.splice(i, 1);
    }
    connection: Response[] = [];
    addConnection(res: Response) {
        this.connection.push(res);
    }
    constructor(public info: ConversationInfo) {

    }
}
app.get('/api/info', (req, res) => {
    let id = req.query.id as string;
    res.json(activeConversations.get(id).info);
});
app.post('/api/start', (req, res) => {
    let info: ConversationInfo = req.body.info;
    info.id = makeid();

    activeConversations.set(info.id, new ActiveConversation(info));
    res.json(info);
});
app.post('/api/test', async (req, result) => {
    let message: Message = req.body.message;




    try {
        request("https://www.googleapis.com/language/translate/v2?key=" + process.env.google_key + "&source=" + message.fromLanguage + "&target=" + message.toLanguage + "&format=text", {
            method: 'post',
            body: JSON.stringify({ q: message.text })
        }, (err, res, body) => {
            try {
                let theBody = JSON.parse(undefined);
                let x = theBody.data;
                if (x)
                    message.translatedText = x.translations[0].translatedText;
                else {
                    console.error(theBody, err);

                    message.translatedText = message.text;
                };

                let c = activeConversations.get(message.conversation);
                if (!c) {
                    activeConversations.set(message.conversation, c = new ActiveConversation({
                        id: message.conversation, guestLanguage: undefined, hostLanguage: undefined, username: undefined
                    }));

                }
                if (message.presenter && !c.info.username) {
                    c.info.username = message.userName;
                    c.info.guestLanguage = message.toLanguage;
                    c.info.hostLanguage = message.fromLanguage;
                }
                c.send(message);
            } catch (err) {
                console.error(err);
            }

            result.json({ item: '123' });
        });
    }
    catch (err) {
        result.sendStatus(500);
        result.json(err);
    }



});
app.all('/*', function (req, res, next) {
    // Just send the index.html for other files to support HTML5Mode
    res.sendFile('index.html', { root: "dist/chat-translate" });
});
app.listen(port);
console.log("Listening on port: " + port);