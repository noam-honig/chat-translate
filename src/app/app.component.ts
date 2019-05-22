import { Component, NgZone, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from './model/message';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.refreshEventListener(true);
    this.messageHistory.push({ text: "test", translatedText: "translated", id: 1, userName: "noam", isEnglish: false });
    this.messageHistory.push({ text: "test", translatedText: "translated", id: 1, userName: "noam", isEnglish: false });
    this.messageHistory.push({ text: "test", translatedText: "translated", id: 1, userName: "noam", isEnglish: false });
  }
  constructor(private zone: NgZone, private http: HttpClient) {

  }
  messageAlign(m: Message) {
    if (m.userName == this.userName)
      return 'end';
    return '';
  }
  userName: string;
  text: string;
  currentId: number = undefined;
  throttle = new myThrottle(500);
  async textChanging() {
    if (this.text) {
      this.throttle.do(async () => {
        if (!this.currentId) {
          let x: any = await this.http.get('/api/newId').toPromise();
          if (!this.currentId)
            this.currentId = x.id;
        }
        let isEnglish = document.location.href.toLowerCase().endsWith('en=y');
        await this.http.post('/api/test', { text: this.text, id: this.currentId, userName: this.userName, isEnglish: isEnglish }).toPromise();
      });
    }
  }
  send() {
    this.text = '';
    this.currentId = undefined;
  }

  messageHistory: Message[] = [];

  title = 'chat-translate';
  eventSource: any;/*EventSource*/
  refreshEventListener(enable: boolean) {

    if (typeof (window) !== 'undefined') {
      let EventSource: any = window['EventSource'];
      if (enable && typeof (EventSource) !== "undefined") {
        this.zone.run(() => {
          console.log('registering to stream');
          var source = new EventSource('/api/stream', { withCredentials: true });
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = undefined;
          }
          this.eventSource = source;
          source.onmessage = e => {

            this.zone.run(() => {
              let message: Message = JSON.parse(e.data)
              let m = this.messageHistory.find(x => x.id == message.id);
              if (m) {
                m.text = message.text;
                m.translatedText = message.translatedText;
              }
              else
                this.messageHistory.push(message);


            });
          };
          let x = this;
          source.addEventListener("authenticate", async function (e) {
            x.http.post('/api/authenticate', { key: ((<any>e).data.toString()) }).toPromise().then(() => { });

          });
        });
      }
    }
  }

}

export class myThrottle {
  constructor(private ms: number) {

  }
  lastRun: number = 0;

  runNext: () => void;

  do(what: () => void) {
    let current = new Date().valueOf();
    if (this.lastRun + this.ms < current) {
      this.lastRun = current;
      what();
    } else {
      if (!this.runNext) {
        this.runNext = what;
        setTimeout(() => {
          let x = this.runNext;
          this.runNext = undefined;
          this.lastRun = new Date().valueOf();
          x();
        }, this.lastRun + this.ms - current);
      }
      else this.runNext = what;
    }
  }
}
