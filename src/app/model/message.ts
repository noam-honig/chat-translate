export interface Message{
    userName:string;
    text:string;
    translatedText:string;
    id:number;
    presenter:boolean;
    fromLanguage:string;
    toLanguage:string;
}