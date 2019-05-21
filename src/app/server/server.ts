import * as express from 'express';
import * as compression from 'compression';
import * as fs from 'fs';
import * as secure from 'express-force-https';
import { config } from 'dotenv';
import '../../stam';

config();
let app = express();
let port = process.env.PORT || 3000;
app.use(compression());
if (!process.env.DISABLE_HTTPS)
    app.use(secure);


app.use(express.static('dist'));
app.get('/test',(req,res)=>{
    res.json({item:'123'});
});
app.listen(port);
console.log("Listening on port: "+port);