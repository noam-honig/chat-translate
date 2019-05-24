import { Injectable } from '@angular/core';
import { ConversationInfo } from './model/message';

@Injectable({
  providedIn: 'root'
})
export class ConversationInfoService {

  constructor() {

  }
  info: ConversationInfo;
  
}
