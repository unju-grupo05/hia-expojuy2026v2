import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterplanDataService } from '../../../../../services/masterplan-data.service';
import { SectorActivity } from '../../../../models/sector-info.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  public stand = computed(() => this.dataService.selectedStand());
  public isDismissed = signal<boolean>(false);

  // Determina si la tarjeta debe mostrarse en mobile
  public isSheetVisible = computed(() => {
    return !!this.stand() && !this.isDismissed();
  });

  public statusDisplay = computed(() => {
    const s = this.stand();
    if (!s) return { text: 'DISPONIBLE', color: '#22c55e' };
    if (s.isPOI) return { text: 'ACCESO PÚBLICO', color: '#00f0ff' };

    const st = s.status || 'disponible';
    if (st === 'disponible') return { text: 'DISPONIBLE', color: '#22c55e' };
    if (st === 'reservado') return { text: 'RESERVADO', color: '#facc15' };
    return { text: 'OCUPADO', color: '#ef4444' };
  });

  public featuredCompanies = computed(() => {
    const s = this.stand();
    if (!s) return [];

    const list: string[] = [s.company || 'Expositor Oficial'];
    let poolKey = 'tech';
    if (s.sectorKey === 'artesano') poolKey = 'artesanias';
    else if (s.sectorKey === 'descubierto') poolKey = 'maquinaria';
    else if (s.sectorKey === 'corporativo') poolKey = 'mineria';

    const pool = this.dataService.STATED_COMPANIES[poolKey as keyof typeof this.dataService.STATED_COMPANIES] || this.dataService.STATED_COMPANIES.tech;
    pool.slice(0, 3).forEach(c => {
      if (!list.includes(c)) list.push(c);
    });

    return list;
  });

  public activities = computed<SectorActivity[]>(() => {
    const s = this.stand();
    if (!s) return this.dataService.SECTOR_ACTIVITIES['cubierto'];
    return this.dataService.SECTOR_ACTIVITIES[s.sectorKey] || this.dataService.SECTOR_ACTIVITIES['cubierto'];
  });

  constructor(private dataService: MasterplanDataService) { }

  public closeSheet(): void {
    this.isDismissed.set(true);
  }
}
