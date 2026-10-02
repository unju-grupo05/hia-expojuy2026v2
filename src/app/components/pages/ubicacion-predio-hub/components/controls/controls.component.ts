import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterplanDataService } from '../../../../../services/masterplan-data.service';
import { Masterplan3dService } from '../../../../../services/masterplan-3d.service';
import { CommercialStatus } from '../../../../models/stand.model';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlsComponent {
  /**
   * Filtros de estado comercial soportados:
   * Todos, Disponibles, Reservados, Cedidos
   */
  public statusFilters: { key: CommercialStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'disponible', label: 'Disponibles' },
    { key: 'reservado', label: 'Reservados' },
    { key: 'cedido', label: 'Cedidos' }
  ];

  /**
   * Filtros de categorías oficiales (idéntico al Directorio de Expositores):
   * Todos, Minería & Litio, Agroindustria, Energías Renovables, Tecnología & IA, Logística & Puertos
   */
  public categoryFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'mineria', label: 'Minería & Litio' },
    { key: 'agro', label: 'Agroindustria' },
    { key: 'energia', label: 'Energías Renovables' },
    { key: 'tecnologia', label: 'Tecnología & IA' },
    { key: 'logistica', label: 'Logística & Puertos' }
  ];

  constructor(
    public dataService: MasterplanDataService,
    private threeService: Masterplan3dService
  ) { }

  public onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.dataService.setSearchQuery(query);
    this.threeService.applySearch(query);
  }

  public setStatusFilter(status: CommercialStatus | 'all'): void {
    this.dataService.setStatusFilter(status);
    this.threeService.applyStatusFilter(status);
  }

  public setCategoryFilter(key: string): void {
    this.dataService.setFilter(key);
    this.threeService.applyFilter(key);
  }
}
