import { Component } from '@angular/core';
import { IonApp } from '@ionic/angular/standalone';
import { HomePage } from '../pages/home/home';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, HomePage],
  template: '<ion-app><app-home></app-home></ion-app>',
})
export class AppComponent {}
