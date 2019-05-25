import { Component, OnInit, Output, EventEmitter } from '@angular/core';

import { ConversationInfo, } from '../model/message';
import { HttpClient } from '@angular/common/http';
import { ConversationInfoService } from '../conversation-info.service';
import { Router } from '@angular/router';
import { storage } from '../storage';
import { Language } from '../model/Languages';
import { analytics } from '../utils/analytics';



@Component({
  selector: 'app-start-coversation',
  templateUrl: './start-coversation.component.html',
  styleUrls: ['./start-coversation.component.scss']
})
export class StartCoversationComponent implements OnInit {
  start: ConversationInfo = {
    username: "Noam Honig",
    hostLanguage: "en",
    guestLanguage: "es",
    id: undefined
  };
  languages = Language.languages;
  constructor(private http: HttpClient, private conversation: ConversationInfoService,
    private router: Router) { }
  
  disableConversation() {
    return this.start.username == '';
    

  }
  async startConversation() {
    this.conversation.info = <any>(await this.http.post('api/start', { info: this.start }).toPromise());
    analytics("conversation","host-"+this.start.hostLanguage+"-"+this.start.guestLanguage);
    storage.userDefaults.set(this.start);
    this.router.navigate(["/host"]);
  }

  ngOnInit() {
    if (storage.userDefaults.hasVal())
      this.start = storage.userDefaults.get();
  }

}
