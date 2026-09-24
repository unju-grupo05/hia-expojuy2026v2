import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from './components/canvas/canvas.component';
import { ControlsComponent } from './components/controls/controls.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { Masterplan3dService } from '../../../services/masterplan-3d.service';

@Component({
  selector: 'app-ubicacion-predio-hub',
  standalone: true,
  imports: [
    CommonModule,
    CanvasComponent,
    ControlsComponent,
    SidebarComponent
  ],
  providers: [Masterplan3dService],
  templateUrl: './ubicacion-predio-hub.html',
  styleUrl: './ubicacion-predio-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UbicacionPredioHubComponent {
  public activeTab = signal<'3d' | 'location'>('3d');
  public googleMapsUrl = 'https://maps.app.goo.gl/zpgpn3nXCJY1BFAU9';

  private threeService = inject(Masterplan3dService);

  public setTab(tab: '3d' | 'location'): void {
    this.activeTab.set(tab);
    if (tab === 'location') {
      // Detener bucle 3D para liberar 0% CPU/GPU
      this.threeService.pauseLoop?.();
    } else {
      // Reanudar loop
      this.threeService.resumeLoop?.();
      setTimeout(() => this.threeService.handleResize(), 50);
    }
  }

  public switchTab(tab: 'predio' | 'ubicacion' | '3d' | 'location'): void {
    this.setTab(tab === 'ubicacion' || tab === 'location' ? 'location' : '3d');
  }
}