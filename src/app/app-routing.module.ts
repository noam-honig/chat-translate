import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StartCoversationComponent } from './start-coversation/start-coversation.component';
import { HostComponent } from './host/host.component';
import { GuestComponent } from './guest/guest.component';

const routes: Routes = [
  { path: 'host', component: HostComponent },
  { path: ':id', component: GuestComponent },
  { path: '', component: StartCoversationComponent }

]
  ;

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
