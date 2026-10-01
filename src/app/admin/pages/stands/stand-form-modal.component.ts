import { Component, effect, inject, input, output, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StandsService } from '../../../services/stands.service';
import { StandBackendDto } from '../../../components/models/stand.model';

export interface Stand {
  id: string;
  name: string;
  stand: string;
  category: string;
  subtitle: string;
  description: string;
  origin: string;
  standIds?: string[];
}

export type StandFormData = Omit<Stand, 'id'> & { id?: string; standIds: string[] };

export const CATEGORY_LABELS: Record<string, string> = {
  mineria: 'Minería & Litio',
  energia: 'Energías Renovables',
  agro: 'Agroindustria',
  tecnologia: 'Tecnología & IA',
  logistica: 'Logística & Puertos',
  general: 'Industria & Comercio General'
};

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'mineria', label: 'Minería & Litio' },
  { value: 'energia', label: 'Energías Renovables' },
  { value: 'agro', label: 'Agroindustria' },
  { value: 'tecnologia', label: 'Tecnología & IA' },
  { value: 'logistica', label: 'Logística & Puertos' },
  { value: 'general', label: 'Industria & Comercio General' }
];

@Component({
  selector: 'app-stand-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stand-form-modal.component.html'
})
export class StandFormModalComponent {
  private fb = inject(FormBuilder);
  private standsService = inject(StandsService);

  public isOpen = input<boolean>(false);
  public standToEdit = input<Stand | null>(null);

  public save = output<StandFormData>();
  public close = output<void>();

  public isPreviewOpen = signal<boolean>(false);
  public standsDisponibles = signal<StandBackendDto[]>([]);
  public standsLoading = signal<boolean>(false);
  public selectedStandIds = signal<string[]>([]);
  public standsSearch = signal<string>('');
  public isStandSelectorOpen = signal<boolean>(false);

  public categories = CATEGORY_OPTIONS;

  public standForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    stand: ['', [Validators.required]],
    category: ['mineria', [Validators.required]],
    subtitle: [''],
    origin: ['Jujuy, Argentina', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  public filteredStandsDisponibles = computed(() => {
    const term = this.standsSearch().trim().toLowerCase();
    const all = this.standsDisponibles();
    if (!term) return all;

    return all.filter(s =>
      s.id.toLowerCase().includes(term) ||
      (s.sector && s.sector.toLowerCase().includes(term)) ||
      (s.superficie && s.superficie.toLowerCase().includes(term))
    );
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const stand = this.standToEdit();

      if (open) {
        if (stand) {
          // Extraer IDs existentes desde standIds o desde la cadena concatenada "A1, A2"
          const parsedIds = stand.standIds && stand.standIds.length > 0
            ? [...stand.standIds]
            : (stand.stand ? stand.stand.split(',').map(s => s.trim()).filter(Boolean) : []);

          this.selectedStandIds.set(parsedIds);

          this.standForm.patchValue({
            name: stand.name,
            stand: parsedIds.join(', '),
            category: stand.category || 'mineria',
            subtitle: stand.subtitle || '',
            origin: stand.origin || 'Jujuy, Argentina',
            description: stand.description || ''
          });

          this.cargarStandsDisponibles(stand.id);
        } else {
          this.selectedStandIds.set([]);
          this.standForm.reset({
            name: '',
            stand: '',
            category: 'mineria',
            subtitle: '',
            origin: 'Jujuy, Argentina',
            description: ''
          });
          this.cargarStandsDisponibles();
        }

        this.isPreviewOpen.set(false);
        this.isStandSelectorOpen.set(false);
        this.standsSearch.set('');
      }
    });
  }

  public cargarStandsDisponibles(expositorId?: string): void {
    this.standsLoading.set(true);
    this.standsService.getStandsDisponibles(expositorId).subscribe({
      next: (res) => {
        this.standsDisponibles.set(res.data || []);
        this.standsLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar parcelas disponibles:', err);
        this.standsLoading.set(false);
      }
    });
  }

  public toggleStandSelection(standId: string): void {
    const current = this.selectedStandIds();
    let updated: string[];

    if (current.includes(standId)) {
      updated = current.filter(id => id !== standId);
    } else {
      updated = [...current, standId].sort();
    }

    this.selectedStandIds.set(updated);
    this.standForm.patchValue({ stand: updated.join(', ') });
    this.standForm.get('stand')?.markAsDirty();
  }

  public removeStand(standId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const updated = this.selectedStandIds().filter(id => id !== standId);
    this.selectedStandIds.set(updated);
    this.standForm.patchValue({ stand: updated.join(', ') });
    this.standForm.get('stand')?.markAsDirty();
  }

  public isStandSelected(standId: string): boolean {
    return this.selectedStandIds().includes(standId);
  }

  public onSubmit(): void {
    if (this.selectedStandIds().length === 0) {
      this.standForm.get('stand')?.setErrors({ required: true });
      this.standForm.markAllAsTouched();
      return;
    }

    if (this.standForm.invalid) {
      this.standForm.markAllAsTouched();
      return;
    }

    const val = this.standForm.value;
    const standIds = this.selectedStandIds();
    const data: StandFormData = {
      id: this.standToEdit()?.id,
      name: val.name || '',
      stand: standIds.join(', '),
      standIds: standIds,
      category: val.category || 'mineria',
      subtitle: val.subtitle || '',
      origin: val.origin || 'Jujuy, Argentina',
      description: val.description || ''
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }

  public toggleSelector(): void {
    this.isStandSelectorOpen.update(v => !v);
  }

  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.standsSearch.set(target.value || '');
  }

  public formatCategory(category: string): string {
    return CATEGORY_LABELS[category] || category;
  }
}