export class VoiceRecognition {
    canRecord = false;
    webkitSpeechRecognitionTypeForNew: any;
    constructor(private onStart: () => void, private finalResult: (text: string) => void, private intermResult: (text: string) => void) {
        if (!('webkitSpeechRecognition' in window)) {

        } else {
            this.webkitSpeechRecognitionTypeForNew = window['webkitSpeechRecognition'];
            this.canRecord = true;

        }
    }
    stopRecording = () => { };
    recording = false;
    toggleRecording(lang:string) {
        if (!this.webkitSpeechRecognitionTypeForNew)
            return;
        if (this.recording) {
            this.stopRecording();
            return;
        }

        var recognition = new this.webkitSpeechRecognitionTypeForNew();
        recognition.continuous = true;
        recognition.interimResults = true;
        let lastFinalMicrophoneResult = -1;
        recognition.onstart = () => {
            this.onStart();
            lastFinalMicrophoneResult = -1;
        }
        let first = true;
        let supportsNonFinal = false;
        let intermText: string;
        recognition.onresult = (event) => {
            let i = 0;
            let old = '';
            let newFinalText = '';
            let interm = '';
            if (first) {
                if (!event.results[event.resultIndex].isFinal) {
                    supportsNonFinal = true;
                }
            }
            let x = event.results[event.resultIndex];
            if (supportsNonFinal) {



                for (const res of event.results) {
                    let j = 0;

                    for (const alt of res) {
                        if (res.isFinal) {
                            if (i > lastFinalMicrophoneResult) {
                                newFinalText += alt.transcript;
                                lastFinalMicrophoneResult = i;
                            } else {
                                old += alt.transcript;
                            }
                        }
                        else
                            interm += alt.transcript;

                    }
                    i++;
                }
            }
            else {
                interm = x[0].transcript;
            }
            //console.log({ old, current: newFinalText, interm, id: m.id }, event.results, event);
            if (newFinalText)
                this.finalResult(newFinalText);
            this.intermResult(interm);
            intermText = interm;

        }

        recognition.onerror = (event) => {
            console.log("on error", event);
            if (event.error) {
                // alert("Error activating microphone: "+event.error);
            }
            this.recording = false;
        }
        let stopped = false;
        recognition.onend = () => {
            if (!stopped) {
                this.recording = false;
                if (!supportsNonFinal && intermText) {
                    this.finalResult(intermText);
                }
                this.intermResult("");
                intermText="";
            }
        };
        recognition.lang = lang;
        //console.log(recognition);
        recognition.start();
        this.recording = true;
        //console.log("start recording");
        this.stopRecording = () => {
            recognition.stop();
            this.recording = false;
            stopped = true;
            //console.log("stop recording");

        }



    }
}
