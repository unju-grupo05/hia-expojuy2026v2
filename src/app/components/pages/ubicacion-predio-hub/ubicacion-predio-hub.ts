import { Component, ElementRef, signal, inject, ChangeDetectionStrategy } from '@angular/core';
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

  /** Host del componente: lo consume `InicioComponent` para hacer scroll sin `getElementById`. */
  public readonly host = inject(ElementRef<HTMLElement>);

  private threeService = inject(Masterplan3dService);

  public setTab(tab: '3d' | 'location'): void {
    this.activeTab.set(tab);
    if (tab === 'location') {
      this.threeService.pauseLoop();
    } else {
      this.threeService.resumeLoop();
      // Forzar ajuste de dimensiones tras volver a estar visible
      requestAnimationFrame(() => this.threeService.handleResize());
    }
  }

  public switchTab(tab: 'predio' | 'ubicacion' | '3d' | 'location'): void {
    this.setTab(tab === 'ubicacion' || tab === 'location' ? 'location' : '3d');
  }
}