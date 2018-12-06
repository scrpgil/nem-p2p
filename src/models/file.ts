export class MetaData {
  v: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  encrypt: boolean;
  length: number;

  constructor(fields: any) {
    for (const f of Object.keys(fields)) {
      this[f] = fields[f];
    }
  }
  valid() {
    if (
      this.v !== '' &&
      this.name !== '' &&
      this.type !== '' &&
      this.size > 0 &&
      this.lastModified > 0 &&
      this.length > 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  isImage() {
    if (this.type.indexOf('image/') === 0) {
      return true;
    } else {
      return false;
    }
  }

  isAudio() {
    if (this.type.indexOf('audio/') === 0) {
      console.log('audio');
      return true;
    } else {
      console.log('not audio');
      return false;
    }
  }
}
export class Binary {
  id: number;
  b: string;
  constructor(fields: any) {
    for (const f of Object.keys(fields)) {
      this[f] = fields[f];
    }
  }
  valid() {
    if (this.id >= 0 && this.b !== '') {
      return true;
    } else {
      return false;
    }
  }
}
