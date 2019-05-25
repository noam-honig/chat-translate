export class LocalStorageHelper<T> {
  constructor(private key: string) {

  }
  get(): T {
    let val = localStorage.getItem(this.key);
    if (!val)
      return undefined;
    return JSON.parse(val) as T;
  }
  set(val: T) {
    localStorage.setItem(this.key, JSON.stringify(val));
  }
  hasVal() {
    return localStorage.getItem(this.key);
  }

}