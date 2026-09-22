import { Routes } from '@angular/router';
import { InicioComponent } from './components/pages/inicio/inicio.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: InicioComponent },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: '**', redirectTo: '' }
];