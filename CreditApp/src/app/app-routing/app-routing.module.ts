import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ArdashboardComponent } from '../components/ardashboard/ardashboard.component';

const routes: Routes = [
   {
      path: '',
      component: ArdashboardComponent,
   }
];

@NgModule({
   declarations: [],
   imports: [
      CommonModule,
      RouterModule.forRoot(routes)
   ],
   exports: [RouterModule]
})
export class AppRoutingModule { }
