import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toJsonStringify',
  standalone: true,
})
export class ToJsonStringifyPipe implements PipeTransform {
  transform(json: any): string {
    return JSON.stringify(json);
  }
}
