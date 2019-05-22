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
    this.currentMessage.isEnglish = document.location.href.toLowerCase().endsWith('en=y')
    this.currentMessage.userName = this.currentMessage.isEnglish?"Noam":"Guest";
    let o = new MutationObserver(m =>
      {
        let d = document.getElementById("chat-history");
        d.scrollTop = d.scrollHeight;
          });
      o.observe(document.getElementById("chat-history"), {childList:true});
  }
  constructor(private zone: NgZone, private http: HttpClient) {

  }
  messageAlign(m: Message) {
    if (m.userName == this.currentMessage.userName)
      return 'end';
    return '';
  }



  currentMessage: Message = { text: '', translatedText: '', id: undefined, userName: undefined, isEnglish: undefined };
  throttle = new myThrottle(500);
  async textChanging(e) {

    let  textArea = e.target;
  textArea.style.overflow = 'hidden';
  textArea.style.height = '0px';
  textArea.style.height = textArea.scrollHeight + 'px';

    if (this.currentMessage.text) {
      this.throttle.do(async () => {
        if (!this.currentMessage.id) {
          let x: any = await this.http.get('/api/newId').toPromise();
          if (!this.currentMessage.id)
            this.currentMessage.id = x.id;
        }
        
        await this.http.post('/api/test', { message: this.currentMessage }).toPromise();
      });
    }
  }

  async keyPress(event) {
    if (event.ctrlKey && event.code == "Enter")
      this.send();
  }


  send() {
    this.messageHistory.push(this.currentMessage);
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
