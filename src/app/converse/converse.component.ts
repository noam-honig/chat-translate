import { Component, OnInit, NgZone, ViewChild } from '@angular/core';

import { Message, ConversationInfo } from '../model/message';
import { HttpClient } from '@angular/common/http';
import { ConversationInfoService } from '../conversation-info.service';


import * as copy from 'copy-to-clipboard';
import { Language } from '../model/Languages';
import { analytics } from '../utils/analytics';
import { VoiceRecognition } from './voice-recognition';
import { myThrottle } from './myThrottle';
import { Router } from '@angular/router';


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
  copyTranscriptToWord() {
    let prevTalker = '';
    let r = "";
    for (const i of this.messageHistory) {
      if (prevTalker != i.userName) {
        r += "<tr><td colspan=2><strong>" + encodeHtml(i.userName) + ":</strong></td></tr>";
        prevTalker = i.userName;
      }
      r += '<tr><td>' + encodeHtml(i.text) + '</td><td>' + encodeHtml(i.translatedText) + '</td></tr>';
    }
    copy(`
    <style type="text/css" media="screen">
    body{
        font-family: ""Helvetica Neue"",Helvetica,Arial,sans-serif;
        font-size: 14px;
        line-height: 1.42857143;
        color: #333;
        background-color: #fff;
    }
    table{
        border-spacing: 0;
        border-collapse: collapse;
        
        margin-bottom: 20px;
        border: 1px solid #ddd;
        min-height: .01%;
        overflow-x: auto;
    }
    th {
        text-align: left;
    
    }
    pre{
        color: #393A34;
        font-family: "Consolas", "Bitstream Vera Sans Mono", "Courier New", Courier, monospace;
        direction: ltr;
        text-align: left;
        white-space: pre;
        word-spacing: normal;
        word-break: normal;
        font-size: 0.95em;
        line-height: 1.2em;
        -moz-tab-size: 4;
        -o-tab-size: 4;
        tab-size: 4;
        -webkit-hyphens: none;
        -moz-hyphens: none;
        -ms-hyphens: none;
        hyphens: none;
        padding: 1em;
        margin: .5em 0;
        overflow: auto;
        border: 1px solid #dddddd;
        background-color: white;
        background: #fff;
    }
    td,th{
        padding:5px;
        font-size:14px;
    }
    
    table tr:nth-of-type(odd) {
        background-color: #f9f9f9;
    }
    .h1, h1 {
        font-size: 36px;
    }
    .h1, .h2, .h3, h1, h2, h3 {
        margin-top: 20px;
        margin-bottom: 10px;
    }
    .h1, .h2, .h3, .h4, .h5, .h6, h1, h2, h3, h4, h5, h6 {
        font-family: inherit;
        font-weight: 500;
        line-height: 1.1;
        color: inherit;
    }
    
    
    </style>
    
    <table>` + r + '</table>', {
      format: "text/html",
      message: "copying",
      debug: true
    })
  }

  linkCopies = false;
  getTextPlaceHolder() {
    if (this.microphoneText)
      return this.microphoneText;
    return "Type a message in " + Language.getName(this.currentMessage.fromLanguage);
  }

  langHelper = Language;


  newConversation() {
    this.router.navigate(["/"]);
  }


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



    setTimeout(() => {
      this.theArea.nativeElement.focus();

    }, 100);
    if (!host) {
      this.currentMessage.text = 'Hi';
      this.send();
    }
  }

  voiceToText = new VoiceRecognition(
    () => {
      this.microphoneText = '';
    },
    final => {
      this.zone.run(() => {
        //console.log('final', final);
        if (this.currentMessage.text)
          this.currentMessage.text += "\n";
        this.currentMessage.text += final.trim();
        setTimeout(() => {
          this.textChanging();
          if (this.playTranslation)
            this.doSpeak(this.currentMessage);
          this.lastPlayedId = this.currentMessage.id;
        }, 100);

      });
    },
    interm => {
      this.zone.run(() => {
        //console.log('interm', interm);
        this.microphoneText = interm;
        if (interm && this.currentMessage.text)
          this.send();
        this.translateMessage(this.currentMessage, interm);
        setTimeout(() => {
          this.resizeTextArea();
        }, 100);
      });
    });


  microphoneText: string = '';



  clickToggleRecording() {

    this.toggleRecording();
    analytics("speech-to-text", this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage + " " + (this.voiceToText.recording ? "on" : "off"));
  }
  toggleRecording() {
    this.voiceToText.toggleRecording(this.currentMessage.fromLanguage);


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
        analytics("message", "translate-" + m.fromLanguage + "-" + m.toLanguage);
        await this.http.post('/api/test', { message: m }).toPromise();
      });
    }
    else m.translatedText = '';
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
    if (this.voiceToText.recording) {
      this.toggleRecording();
      this.toggleRecording();
    }
  }

  async send() {
    if (!this.microphoneText && !this.currentMessage.text) {
      this.currentMessage.translatedText = '';
      return;
    }

    analytics("message", "send-" + this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage);
    this.currentMessage.isFinal = true;
    this.translateMessage(this.currentMessage);
    this.throttle = new myThrottle(500);
    this.messageHistory.push(this.currentMessage);

    this.currentMessage = Object.assign({}, this.currentMessage);
    this.currentMessage.text = '';
    this.currentMessage.translatedText = '';
    this.currentMessage.id = undefined;
    this.currentMessage.isFinal = false;

    setTimeout(() => {

      this.resizeTextArea();
    }, 100);
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
            //console.log('registering to stream', x.currentMessage.conversation, e.data);
            x.http.post('/api/authenticate', { key: ((<any>e).data.toString()), conversation: x.currentMessage.conversation }).toPromise().then(() => { });

          });
        });
      }
    }
  }

  doSpeak(message: Message) {
    try {
      analytics("text-to-speach", "play-" + message.fromLanguage + "-" + message.toLanguage);
      let s = new SpeechSynthesisUtterance();
      s.lang = message.toLanguage;
      s.text = message.translatedText;
      let recording = this.voiceToText.recording;
      if (recording) {
        s.onstart = () => {
          this.zone.run(() => {
            this.toggleRecording();
          })
        };
        s.onend = () => {
          this.zone.run(() => {
            this.toggleRecording();
          });
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
    return 'https://' + document.location.host + '/' + this.currentMessage.conversation;
  }
  playTranslation: boolean = false;
  toggleAutoSpeak() {

    this.playTranslation = !this.playTranslation;
    analytics("text-to-speach", "auto-play" + this.playTranslation ? "on" : "off" + "-" + this.currentMessage.fromLanguage + "-" + this.currentMessage.toLanguage);
  }
}


function encodeHtml(s: string) {
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

}