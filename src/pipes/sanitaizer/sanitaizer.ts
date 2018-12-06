import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'sanitaizer',
})
export class SanitaizerPipe implements PipeTransform {
  constructor(private _sanitizer: DomSanitizer) {}
  transform(url: string) {
    return this._sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
