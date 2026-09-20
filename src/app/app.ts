import { Component } from '@angular/core';
import { PortalLayoutComponent } from './components/layout/portal-layout/portal-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PortalLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {}