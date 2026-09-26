import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'metrics',
        pathMatch: 'full'
      },
      {
        path: 'metrics',
        loadComponent: () => import('./pages/metrics/metrics.component').then(m => m.MetricsComponent)
      },
      {
        path: 'posts',
        loadComponent: () => import('./pages/posts/posts-list.component').then(m => m.PostsListComponent)
      },
      {
        path: 'stands',
        loadComponent: () => import('./pages/stands/stands-list.component').then(m => m.StandsListComponent)
      },
      {
        path: 'agenda',
        loadComponent: () => import('./pages/agenda/agenda-list.component').then(m => m.AgendaListComponent)
      },
      {
        path: 'pillars',
        loadComponent: () => import('./pages/pillars/pillars.component').then(m => m.PillarsComponent)
      },
      {
        path: 'media',
        loadComponent: () => import('./pages/media/media-gallery.component').then(m => m.MediaGalleryComponent)
      }
    ]
  }
];
