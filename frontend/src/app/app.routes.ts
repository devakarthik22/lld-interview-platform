import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'interview/:sessionId',
    loadComponent: () => import('./features/interview/interview.component').then(m => m.InterviewComponent)
  },
  {
    path: 'results/:sessionId',
    loadComponent: () => import('./features/results/results.component').then(m => m.ResultsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
