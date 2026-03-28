export class Util {
  public static splitByLength(str: string, length: number): string[] {
    const resultArr: string[] = [];
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

  public static toBlob(base64: string, mimeType: string): Blob | null {
    try {
      const bin = atob(base64.replace(/^.*,/, ''));
      const buffer = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        buffer[i] = bin.charCodeAt(i);
      }
      return new Blob([buffer.buffer], { type: mimeType });
    } catch {
      return null;
    }
  }

  public static execCopy(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  public static isJson(arg: any): boolean {
    if (typeof arg !== 'string') return false;
    try {
      JSON.parse(arg);
      return true;
    } catch {
      return false;
    }
  }

  public static getQueryVariable(variable: string = ''): string {
    const query = window.location.search.substring(1);
    const vars = query.split('&');
    for (const v of vars) {
      const pair = v.split('=');
      if (pair[0] === variable) {
        return pair[1] || '';
      }
    }
    return '';
  }

  public static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
