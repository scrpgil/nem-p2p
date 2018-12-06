import { NgModule } from '@angular/core';
import { ToJsonStringifyPipe } from './to-json-stringify/to-json-stringify';
import { SanitaizerPipe } from './sanitaizer/sanitaizer';
@NgModule({
  declarations: [ToJsonStringifyPipe, SanitaizerPipe],
  imports: [],
  exports: [ToJsonStringifyPipe, SanitaizerPipe],
})
export class PipesModule {}
