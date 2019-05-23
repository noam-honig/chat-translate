import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from './model/message';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  storageKey = new Date().toDateString();
  microphoneLang: string;
  async ngOnInit() {


    let lang: any = await this.http.get('/api/lang').toPromise();
    this.microphoneLang = lang.lang;


    this.refreshEventListener(true);
    this.currentMessage.isEnglish = document.location.href.toLowerCase().endsWith('en=y')
    if (this.currentMessage.isEnglish) {
      this.microphoneLang = 'en-us';
    }
    this.currentMessage.userName = this.currentMessage.isEnglish ? "Noam" : "Guest";
    let o = new MutationObserver(m => {
      let d = document.getElementById("chat-history");
      d.scrollTop = d.scrollHeight;
    });
    o.observe(document.getElementById("chat-history"), { childList: true });
    let x = localStorage.getItem(this.storageKey);
    if (x)
      this.messageHistory = JSON.parse(x);
    if (!('webkitSpeechRecognition' in window)) {

    } else {
      const webkitSpeechRecognition: any = window['webkitSpeechRecognition'];
      var recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        this.microphoneText = '';
        this.lastFinalMicrophoneResult = -1;
      }
      recognition.onresult = (event) => {
        let i = 0;
        let old = '';
        let newFinalText = '';
        let interm = '';
        for (const res of event.results) {
          let j = 0;

          for (const alt of res) {
            if (res.isFinal) {
              if (i > this.lastFinalMicrophoneResult) {
                newFinalText += alt.transcript;
                this.lastFinalMicrophoneResult = i;
              } else {
                old += alt.transcript;
              }
            }
            else
              interm += alt.transcript;//, res.isFinal, i, j++);

          }
          i++;
        }
        console.log({ old, current: newFinalText, interm });
        this.zone.run(() => {
          if (newFinalText) {
            if (this.currentMessage.text)
              this.currentMessage.text += '\n';
            this.currentMessage.text += newFinalText.trim();


          }
          this.microphoneText = interm
          setTimeout(() => {
            this.textChanging();
          }, 100);

        });


      }
      recognition.onerror = (event) => {
        console.log("on error", event);
      }
      recognition.onend = () => { this.recording = false };
      this.doStart = () => {
        if (!this.recording) {
          recognition.lang = this.microphoneLang;
          recognition.start();
          this.recording = true;
        }
        else {
            recognition.stop();
            this.recording = false;
        }
      };
    }
  }
  microphoneText: string = '';
  lastFinalMicrophoneResult = -1;
  recording = false;
  doStart: () => void = () => { };
  startRecording() {
    this.doStart();
  }
  constructor(private zone: NgZone, private http: HttpClient) {

  }
  messageAlign(m: Message) {
    if (!m.isEnglish)
      return 'end';
    return '';
  }


  @ViewChild('theArea') theArea;
  currentMessage: Message = { text: '', translatedText: '', id: undefined, userName: undefined, isEnglish: undefined };
  throttle = new myThrottle(500);
  async textChanging() {

    this.resizeTextArea();

    let m = this.currentMessage;

    if (m.text || this.microphoneText) {
      this.throttle.do(async () => {
        if (!m.id) {
          let x: any = await this.http.get('/api/newId').toPromise();
          if (!m.id)
            m.id = x.id;
        }
        m = Object.assign({}, m);
        if (this.microphoneText) {
          if (m.text)
            m.text += '\n';
          m.text += this.microphoneText;
        }
        await this.http.post('/api/test', { message: m }).toPromise();
      });
    }
  }

  private resizeTextArea() {
    let textArea = this.theArea.nativeElement;
    textArea.style.overflow = 'hidden';
    textArea.style.height = '0px';
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  async keyPress(event) {
    if (event.ctrlKey && event.code == "Enter")
      this.send();
  }


  async send() {
    this.messageHistory.push(this.currentMessage);
    this.throttle.DoIt();
    localStorage.setItem(this.storageKey, JSON.stringify(this.messageHistory));
    this.currentMessage = {
      text: '',
      translatedText: '',
      userName: this.currentMessage.userName,
      isEnglish: this.currentMessage.isEnglish,
      id: undefined
    };
    this.resizeTextArea();
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
