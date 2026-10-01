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
  public stand = computed(() => {
    this.dataService.dataVersion();
    return this.dataService.selectedStand();
  });
  public isDismissed = signal<boolean>(false);

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
    if (st === 'cedido') return { text: 'CEDIDO', color: '#8b5cf6' };
    return { text: 'DISPONIBLE', color: '#22c55e' };
  });

  /** Categorías de la BD que se priorizan para cada sector del predio. */
  private static readonly CATEGORIAS_POR_SECTOR: Record<string, string[]> = {
    corporativo: ['mineria', 'energia'],
    descubierto: ['logistica', 'tecnologia'],
    artesano: ['agro'],
    cubierto: ['tecnologia', 'agro']
  };

  public featuredCompanies = computed(() => {
    const s = this.stand();
    const lista: string[] = [];
    if (s?.company) lista.push(s.company);

    const categorias = s ? (SidebarComponent.CATEGORIAS_POR_SECTOR[s.sectorKey] ?? []) : [];
    const todos = this.dataService.expositores();

    const candidatos = todos.filter((e) => !lista.includes(e.name));
    const priorizados = categorias.length > 0
      ? candidatos.filter((e) => categorias.includes((e.category || '').toLowerCase()))
      : [];

    [...priorizados, ...candidatos].forEach((e) => {
      if (lista.length < 3) lista.push(e.name);
    });

    return lista;
  });

  public isLoadingExpositores = computed(() => this.dataService.isLoadingExpositores());

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
