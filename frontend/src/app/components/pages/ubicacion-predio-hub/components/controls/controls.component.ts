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
  public statusFilters: { key: CommercialStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'disponible', label: 'Disponibles' },
    { key: 'reservado', label: 'Reservados' },
    { key: 'cedido', label: 'Cedidos' }
  ];

  public categoryFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'agroindustria', label: 'Agroindustria & Tabaco' },
    { key: 'automotor', label: 'Automotor & Maquinaria Pesada' },
    { key: 'construccion', label: 'Construcción e Inmobiliaria' },
    { key: 'mineria', label: 'Minería & Litio' },
    { key: 'alimentos_bebidas', label: 'Alimentos, Bebidas & Regionales' },
    { key: 'medios_comunicacion', label: 'Medios de Comunicación' },
    { key: 'educacion', label: 'Educación & Académico' },
    { key: 'institucional', label: 'Institucional & Gobierno' },
    { key: 'comercio_servicios', label: 'Comercio, Banca & Servicios' },
    { key: 'bazar_regaleria', label: 'Bazar, Regalería & Moda' },
    { key: 'tecnologia_3d', label: 'Tecnología, 3D & Electrónica' }
    
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
