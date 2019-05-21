import * as express from 'express';
import { Express, Response } from 'express';
import * as compression from 'compression';
import * as fs from 'fs';
import * as secure from 'express-force-https';
import { config } from 'dotenv';
import '../../stam';
import * as bodyParser from 'body-parser';

config();
let app = express();
let port = process.env.PORT || 3000;

if (!process.env.DISABLE_HTTPS)
    app.use(secure);


app.use(express.static('dist'));
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
    console.log('registered to stream '+key);
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
        res.json({ok:true});
    }
});
app.post('/api/test', (req, res) => {
    let x = req.body.text;
    connection.forEach(y => y.write("data:" + x + "\n\n"))
    res.json({ item: '123' });
});

app.listen(port);
console.log("Listening on port: " + port);