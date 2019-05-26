import { Component, OnInit, NgZone, ViewChild } from '@angular/core';

import { Message, ConversationInfo } from '../model/message';
import { HttpClient } from '@angular/common/http';
import { ConversationInfoService } from '../conversation-info.service';
import { Router } from '@angular/router';
import * as copy from 'copy-to-clipboard';
import { Language } from '../model/Languages';
import { analytics } from '../utils/analytics';


@Component({
  selector: 'app-converse',
  templateUrl: './converse.component.html',
  styleUrls: ['./converse.component.scss']
})
export class ConverseComponent {
  storageKey = new Date().toDateString();
  copyJoinLink() {
    copy(this.getShortInviteUrl());
    this.linkCopies = true;
    setTimeout(() => {
      this.linkCopies = false;
    }, 5000);
  }
  linkCopies = false;
  getTextPlaceHolder() {
    return "Type a message in " + Language.getName(this.currentMessage.fromLanguage);
  }
  langHelper = Language;


  newConversation() {
    this.router.navigate(["/"]);
  }

  webkitSpeechRecognitionTypeForNew: any;
  async init(info: ConversationInfo, host?: boolean) {

    this.currentMessage.fromLanguage = info.guestLanguage;
    this.currentMessage.toLanguage = info.hostLanguage;
    this.currentMessage.conversation = info.id;
    this.currentMessage.presenter = !!host;
    if (this.currentMessage.presenter) {
      this.switchLanguage();
    }
    this.currentMessage.userName = info.username;


    this.refreshEventListener(true);

    let o = new MutationObserver(m => {
      let d = document.getElementById("chat-history");
      d.scrollTop = d.scrollHeight;
    });
    o.observe(document.getElementById("chat-history"), { childList: true });


    let x = localStorage.getItem(this.currentMessage.conversation);
    if (x && this.currentMessage.presenter)
      this.messageHistory = JSON.parse(x);


    if (!('webkitSpeechRecognition' in window)) {

    } else {
      this.webkitSpeechRecognitionTypeForNew = window['webkitSpeechRecognition'];
      this.canRecord = true;

    }
    setTimeout(() => {
      this.theArea.nativeElement.focus();

    }, 100);

  }
  canRecord = false;

  microphoneText: string = '';

  recording = false;
  stopRecording = () => { };
  clickToggleRecording() {

    this.toggleRecording();
    analytics("speech-to-text",this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage+" "+(this.recording?"on":"off"));
  }
  toggleRecording() {
    if (!this.webkitSpeechRecognitionTypeForNew)
      return;
    if (this.recording) {
      this.stopRecording();
      return;
    }
    let m = this.currentMessage;
    var recognition = new this.webkitSpeechRecognitionTypeForNew();
    recognition.continuous = true;
    recognition.interimResults = true;
    let lastFinalMicrophoneResult = -1;
    recognition.onstart = () => {
      this.microphoneText = '';
      lastFinalMicrophoneResult = -1;
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
            if (i > lastFinalMicrophoneResult) {
              newFinalText += alt.transcript;
              lastFinalMicrophoneResult = i;
            } else {
              old += alt.transcript;
            }
          }
          else
            interm += alt.transcript;

        }
        i++;
      }
      console.log({ old, current: newFinalText, interm, id: m.id },event.results,event);
      this.zone.run(() => {
        if (newFinalText) {
          if (m.text)
            m.text += '\n';
          m.text += newFinalText.trim();


        }
        if (this.currentMessage == m)
          this.microphoneText = interm
        setTimeout(() => {
          this.translateMessage(m, interm);
          this.resizeTextArea();
        }, 100);

      });
    }
    recognition.onerror = (event) => {
      console.log("on error", event);
    }
    let stopped = false;
    recognition.onend = () => {
      if (!stopped)
        this.recording = false;
    };
    recognition.lang = m.fromLanguage;
    console.log(recognition);
    recognition.start();
    this.recording = true;
    console.log("start recording");
    this.stopRecording = () => {
      recognition.stop();
      this.recording = false;
      stopped = true;
      console.log("stop recording");

    }



  }
  constructor(private zone: NgZone, private http: HttpClient, private router: Router) {

  }
  messageAlign(m: Message) {
    if (!m.presenter)
      return 'end';
    return '';
  }


  @ViewChild('theArea') theArea;
  currentMessage: Message = { text: '', translatedText: '', id: undefined, userName: undefined, presenter: undefined, fromLanguage: undefined, toLanguage: undefined, conversation: undefined, isFinal: false };
  throttle = new myThrottle(500);
  async textChanging() {

    this.resizeTextArea();
    this.translateMessage(this.currentMessage);



  }
  translateMessage(m: Message, additionalText?: string) {
    if (m.text || additionalText) {
      this.throttle.do(async () => {
        if (!m.id) {
          let x: any = await this.http.get('/api/newId').toPromise();
          if (!m.id)
            m.id = x.id;
        }
        m = Object.assign({}, m);
        if (additionalText) {
          if (m.text)
            m.text += '\n';
          m.text += additionalText;
        }
        analytics("message","translate-" + m.fromLanguage + "-" + m.toLanguage);
        await this.http.post('/api/test', { message: m }).toPromise();
      });
    }
  }

  private resizeTextArea() {
    let textArea = this.theArea.nativeElement;
    textArea.style.overflow = 'hidden';
    textArea.style.height = '0px';
    textArea.style.height = textArea.scrollHeight + 'px';
    if (textArea.style.height < textArea.style.lineHeight)
      textArea.style.height = textArea.style.lineHeight;
  }

  async keyPress(event) {
    if (event.ctrlKey && event.code == "Enter")
      this.send();
  }

  switchLanguage() {

    this.send();
    var temp = this.currentMessage.fromLanguage;
    this.currentMessage.fromLanguage = this.currentMessage.toLanguage;
    this.currentMessage.toLanguage = temp;
    if (this.recording) {
      this.toggleRecording();
      this.toggleRecording();
    }
  }

  async send() {
    if (!this.microphoneText && !this.currentMessage.text)
      return;
    analytics("message","send-" + this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage);
    this.currentMessage.isFinal = true;
    this.translateMessage(this.currentMessage);
    this.throttle = new myThrottle(500);
    this.messageHistory.push(this.currentMessage);

    this.currentMessage = Object.assign({}, this.currentMessage);
    this.currentMessage.text = '';
    this.currentMessage.translatedText = '';
    this.currentMessage.id = undefined;
    this.currentMessage.isFinal = false;
    if (this.recording) {
      this.toggleRecording();
      this.toggleRecording();
    }

    this.resizeTextArea();
  }

  messageHistory: Message[] = [];
  lastPlayedId = -1;
  title = 'chat-translate';
  eventSource: any;/*EventSource*/
  refreshEventListener(enable: boolean) {

    if (typeof (window) !== 'undefined') {
      let EventSource: any = window['EventSource'];
      if (enable && typeof (EventSource) !== "undefined") {
        this.zone.run(() => {

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
                //console.log(message);
                let i = this.messageHistory.findIndex(x => x.id == message.id);
                if (i < 0 || !this.messageHistory[i].isFinal || message.isFinal) {
                  if (i >= 0) {
                    this.messageHistory.splice(i, 1);
                  }

                  this.messageHistory.push(message);

                }
                if (message.isFinal && this.lastPlayedId != message.id && this.playTranslation) {
                  this.lastPlayedId = message.id;
                  this.doSpeak(message);
                }
              }
              localStorage.setItem(this.currentMessage.conversation, JSON.stringify(this.messageHistory));

            });
          };
          let x = this;
          source.addEventListener("authenticate", async function (e) {
            console.log('registering to stream', x.currentMessage.conversation, e.data);
            x.http.post('/api/authenticate', { key: ((<any>e).data.toString()), conversation: x.currentMessage.conversation }).toPromise().then(() => { });

          });
        });
      }
    }
  }

  doSpeak(message: Message) {
    try {
      analytics("text-to-speach","play-" + message.fromLanguage + "-" + message.toLanguage);
      let s = new SpeechSynthesisUtterance();
      s.lang = message.toLanguage;
      s.text = message.translatedText;
      let recording = this.recording;
      if (recording) {
        s.onstart = () => {
          this.toggleRecording();
        };
        s.onend = () => {
          this.toggleRecording();
        };

      }
      window.speechSynthesis.speak(s);

    }
    catch (err) {
      console.error(err);
    }
  }
  showMessageName(m: Message, i: number) {
    if (i == 0)
      return true;
    return m.userName != this.messageHistory[i - 1].userName;
  }
  getInviteUrl() {
    return document.location.origin + '/' + this.currentMessage.conversation;
  }
  getShortInviteUrl() {
    return document.location.host + '/' + this.currentMessage.conversation;
  }
  playTranslation: boolean = false;
  toggleAutoSpeak() {

    this.playTranslation = !this.playTranslation;
    analytics("text-to-speach","auto-play"+ this.playTranslation?"on":"off" + "-" + this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage);
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

  ngOnInit() {
  }

}
