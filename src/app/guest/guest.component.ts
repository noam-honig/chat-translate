import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ConverseComponent } from '../converse/converse.component';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent implements OnInit {

  constructor(private http: HttpClient, private currentRoute: ActivatedRoute) { }

  ngOnInit() {
  }
  hide = true;
  username = 'Guest';
  disableConversation() {
    return this.username == '';
  }
  @ViewChild("converse") converse: ConverseComponent;
  async joinConversation() {

    let info = <any>(await this.http.get('api/info?id=' + this.currentRoute.snapshot.paramMap.get('id')).toPromise());
    if (info) {
      console.log(info);
      this.converse.init(info,false);
      this.hide = !this.hide;
    }
  }
}
