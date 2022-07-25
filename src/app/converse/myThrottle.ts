

export class myThrottle {
  constructor(private ms: number) {
  }
  lastRun: number = 0;

  runNext: () => void;

  do(what: () => void) {
    let current = new Date().valueOf();
    if (this.lastRun + this.ms < current) {
      this.lastRun = current;
      what();
    } else {
      if (!this.runNext) {
        this.runNext = what;
        setTimeout(() => {
          this.DoIt();
        }, this.lastRun + this.ms - current);
      }
      else
        this.runNext = what;
    }
  }

  public DoIt() {
    if (this.runNext) {
      let x = this.runNext;
      this.runNext = undefined;
      this.lastRun = new Date().valueOf();
      x();
    }
  }


}
