import { Injectable } from '@angular/core';

declare function escape(s: string): string;
declare function unescape(s: string): string;
@Injectable()
export class Util {
  public static splitByLength(str, length) {
    var resultArr = [];
    if (!str || !length || length < 1) {
      return resultArr;
    }
    let index = 0;
    let start = index;
    let end = start + length;
    while (start < str.length) {
      resultArr[index] = str.substring(start, end);
      index++;
      start = end;
      end = start + length;
    }
    return resultArr;
  }
  public static encodeBase64(base64: string) {
    const encodeString = btoa(unescape(encodeURIComponent(base64)));
    return encodeString;
  }
  public static toBlob(base64, mime_ctype) {
    const bin = atob(base64.replace(/^.*,/, ''));
    const buffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      buffer[i] = bin.charCodeAt(i);
    }
    // Blobを作成
    try {
      const blob = new Blob([buffer.buffer], {
        type: 'image/png',
      });
      return blob;
    } catch (e) {
      return false;
    }
  }
  public static execCopy(el) {
    document.getSelection().selectAllChildren(el);
    document.execCommand('copy');
    return;
  }
  public static isJson(arg) {
    arg = typeof arg === 'function' ? arg() : arg;
    if (typeof arg !== 'string') {
      return false;
    }
    try {
      arg = !JSON ? eval('(' + arg + ')') : JSON.parse(arg);
      return true;
    } catch (e) {
      return false;
    }
  }
  public static getQueryVariable(variable: string = '') {
    const query = window.location.search.substring(1);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      if (pair[0] === variable) {
        return pair[1];
      }
    }
  }

  public static sleep(a) {
    var dt1 = new Date().getTime();
    var dt2 = new Date().getTime();
    while (dt2 < dt1 + a) {
      dt2 = new Date().getTime();
    }
    return;
  }
}
