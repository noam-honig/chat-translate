import { Component, OnInit, ViewChild } from '@angular/core';
import { ConverseComponent } from '../converse/converse.component';
import { ConversationInfoService } from '../conversation-info.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-host',
  templateUrl: './host.component.html',
  styleUrls: ['./host.component.scss']
})
export class HostComponent implements OnInit {

  @ViewChild("converse") converse: ConverseComponent;
  constructor(private currentConversation: ConversationInfoService,private router:Router) { }

  ngOnInit() {
    if (!this.currentConversation.info) {
      var x = localStorage.getItem('current');
      if (x)
        this.currentConversation.info = JSON.parse(x);
    }
    if (this.currentConversation.info) {
      localStorage.setItem('current', JSON.stringify(this.currentConversation.info));
      this.converse.init(this.currentConversation.info, true);
    }
    else
      this.router.navigate(["/"]);
  }

}
