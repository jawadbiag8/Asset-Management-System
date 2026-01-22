import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { routes } from './app.routes';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    CommonModule,
    RouterModule.forRoot(routes),
    AppComponent
  ],
  providers: [],
  bootstrap: []
})
export class AppModule { }
