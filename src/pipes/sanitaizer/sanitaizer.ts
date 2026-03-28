import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'sanitaizer',
  standalone: true,
})
export class SanitaizerPipe implements PipeTransform {
  constructor(private _sanitizer: DomSanitizer) {}
  transform(url: string) {
    return this._sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
