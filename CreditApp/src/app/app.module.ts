import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { M3OdinModule } from '@infor-up/m3-odin-angular';
import { SohoComponentsModule } from 'ids-enterprise-ng'; // TODO Consider only importing individual SoHo modules in production
import { AppComponent } from './app.component';

import { ARService } from './services/ar.service';
import { AppRoutingModule } from './app-routing/app-routing.module';
import { ArdashboardComponent } from './components/ardashboard/ardashboard.component';
import { HttpClientModule } from '@angular/common/http';
import { GridModule, PDFModule } from '@progress/kendo-angular-grid';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { DatePipe } from '@angular/common'
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
@NgModule({
   declarations: [
      AppComponent,
      ArdashboardComponent,

   ],
   imports: [
      BrowserModule,
      FormsModule,
      SohoComponentsModule,
      M3OdinModule,
      AppRoutingModule,
      HttpClientModule,
      GridModule,
      BrowserAnimationsModule,
      LayoutModule,
      PDFModule,
      DateInputsModule
   ],
   providers: [ARService, PDFModule, DatePipe],
   bootstrap: [AppComponent]
})
export class AppModule { }
