import { Component, NgZone, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from './model/message';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  storageKey = new Date().toDateString();
  ngOnInit(): void {
    this.refreshEventListener(true);
    this.currentMessage.isEnglish = document.location.href.toLowerCase().endsWith('en=y')
    this.currentMessage.userName = this.currentMessage.isEnglish ? "Noam" : "Guest";
    let o = new MutationObserver(m => {
      let d = document.getElementById("chat-history");
      d.scrollTop = d.scrollHeight;
    });
    o.observe(document.getElementById("chat-history"), { childList: true });
    let x = localStorage.getItem(this.storageKey);
    if (x)
      this.messageHistory = JSON.parse(x);
  }
  constructor(private zone: NgZone, private http: HttpClient) {

  }
  messageAlign(m: Message) {
    if (!m.isEnglish)
      return 'end';
    return '';
  }



  currentMessage: Message = { text: '', translatedText: '', id: undefined, userName: undefined, isEnglish: undefined };
  throttle = new myThrottle(500);
  async textChanging(e) {

    let textArea = e.target;
    textArea.style.overflow = 'hidden';
    textArea.style.height = '0px';
    textArea.style.height = textArea.scrollHeight + 'px';

    let m = this.currentMessage;

    if (m.text) {
      this.throttle.do(async () => {
        if (!m.id) {
          let x: any = await this.http.get('/api/newId').toPromise();
          if (!m.id)
            m.id = x.id;
        }

        await this.http.post('/api/test', { message: m }).toPromise();
      });
    }
  }

  async keyPress(event) {
    if (event.ctrlKey && event.code == "Enter")
      this.send();
  }


  async send() {
    this.throttle.DoIt();

    this.currentMessage = {
      text: '',
      translatedText: '',
      userName: this.currentMessage.userName,
      isEnglish: this.currentMessage.isEnglish,
      id: undefined
    };
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
              let message: Message = JSON.parse(e.data);
              if (message.id == this.currentMessage.id) {
                this.currentMessage.translatedText = message.translatedText;
              } else {
                let i = this.messageHistory.findIndex(x => x.id == message.id);
                if (i >= 0) {
                  this.messageHistory.splice(i, 1);
                }

                this.messageHistory.push(message);
              }
              localStorage.setItem(this.storageKey, JSON.stringify(this.messageHistory));

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
  getInviteUrl() {
    return document.location.hostname;
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
          this.DoIt();
        }, this.lastRun + this.ms - current);
      }
      else this.runNext = what;
    }
  }

  public DoIt() {
    if (this.runNext) {
      let x = this.runNext;
      this.runNext = undefined;
      this.lastRun = new Date().valueOf();
      x();
    }
  }
}
