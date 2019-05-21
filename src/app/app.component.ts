import { Component, NgZone, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.refreshEventListener(true);
  }
  constructor(private zone: NgZone, private http: HttpClient) {

  }
  text:string;
  async textChanging(){
    
    await this.http.post('/api/test',{text:this.text}).toPromise();
  }
  otherText:string;

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
              this.otherText = e.data.toString();
              console.log(this.otherText);
            });
          };
          let x = this;
          source.addEventListener("authenticate", async function (e) {
            x.http.post('/api/authenticate', { key: ((<any>e).data.toString()) }).toPromise().then(()=>{});

          });
        });
      }
    }
  }
}
