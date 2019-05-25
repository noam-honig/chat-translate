import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ConverseComponent } from '../converse/converse.component';
import { ConversationInfo } from '../model/message';
import { storage } from '../storage';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent implements OnInit {

  constructor(private http: HttpClient, private currentRoute: ActivatedRoute) { }

  ngOnInit() {
    let x = storage.userDefaults.get();
    if (x) {
      this.username = x.username;
    }
  }
  hide = true;
  username = 'Guest';
  disableConversation() {
    return this.username == '';
  }
  @ViewChild("converse") converse: ConverseComponent;
  async joinConversation() {

    try {
      let info: ConversationInfo = <any>(await this.http.get('api/info?id=' + this.currentRoute.snapshot.paramMap.get('id')).toPromise());
      if (info && info.hostLanguage) {
        let x = storage.userDefaults.get();
        if (!x) {
          x = info;
        }
        else
          x.username = this.username;
        storage.userDefaults.set(x);

        info.username = this.username;
        this.converse.init(info, false);
        this.hide = !this.hide;
      }
      else {

      }
    } catch{
      alert("Something is wrong - please try again in a minute or two");
    }
  }
}
