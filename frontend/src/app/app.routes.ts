import { Routes } from '@angular/router';
import { InicioComponent } from './components/pages/inicio/inicio.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: InicioComponent },
  {
    path: 'mapa',
    loadComponent: () =>
      import('./components/pages/ubicacion-predio-hub/ubicacion-predio-hub').then(
        (m) => m.UbicacionPredioHubComponent
      )
  },
  {
    path: 'ubicacion',
    loadComponent: () =>
      import('./components/pages/ubicacion-predio-hub/ubicacion-predio-hub').then(
        (m) => m.UbicacionPredioHubComponent
      )
  },
  {
    path: 'expositores',
    loadComponent: () =>
      import('./components/pages/expositores/expositores.component').then(
        (m) => m.ExpositoresComponent
      )
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: '**', redirectTo: '' }
];