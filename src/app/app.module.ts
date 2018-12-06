import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';

import { PipesModule } from '../pipes/pipes.module';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { NemProvider } from '../providers/nem/nem';
import { Util } from '../providers/util/util';

@NgModule({
  declarations: [MyApp, HomePage],
  imports: [
    BrowserModule,
    PipesModule,
    IonicModule.forRoot(MyApp, {
      preloadModules: true,
      mode: 'ios',
    }),
  ],
  bootstrap: [IonicApp],
  entryComponents: [MyApp, HomePage],
  providers: [{ provide: ErrorHandler, useClass: IonicErrorHandler }, NemProvider, Util],
})
export class AppModule {}
