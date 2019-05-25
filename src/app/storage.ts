import {LocalStorageHelper} from './utils/LocalStorageHelper';
import { ConversationInfo } from './model/message';
export const storage= {
    userDefaults :new LocalStorageHelper<ConversationInfo>("user-defaults")
  };