import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterplanDataService } from '../../../../../services/masterplan-data.service';
import { Masterplan3dService } from '../../../../../services/masterplan-3d.service';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlsComponent {
  public filters = [
    { key: 'all', label: 'Todos' },
    { key: 'mineria', label: 'Minería' },
    { key: 'energia', label: 'Energía' },
    { key: 'tecnologia', label: 'Tecnología' },
    { key: 'agro', label: 'Agroindustria' },
    { key: 'artesano', label: 'Artesanos' },
    { key: 'gastronomico', label: 'Gastronomía' }
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

  public setFilter(key: string): void {
    this.dataService.setFilter(key);
    this.threeService.applyFilter(key);
  }
}
