export interface Message {
    userName: string;
    text: string;
    translatedText: string;
    id: number;
    presenter: boolean;
    fromLanguage: string;
    toLanguage: string;
    conversation:string;
}
export interface ConversationInfo {
    id: string;
    hostLanguage: string;
    guestLanguage: string;
    username:string;
}
