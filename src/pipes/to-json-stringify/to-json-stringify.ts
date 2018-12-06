import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toJsonStringify',
})
export class ToJsonStringifyPipe implements PipeTransform {
  transform(json: any) {
    return JSON.stringify(json);
  }
}
