import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Stand {
  id: string;
  name: string;
  stand: string;
  category: string;
  subtitle: string;
  description: string;
  origin: string;
}

export type StandFormData = Omit<Stand, 'id'> & { id?: string };

export const CATEGORY_LABELS: Record<string, string> = {
  mineria: 'Minería & Litio',
  energia: 'Energías Renovables',
  agro: 'Agroindustria',
  tecnologia: 'Tecnología & IA',
  logistica: 'Logística & Puertos'
};

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'mineria', label: 'Minería & Litio' },
  { value: 'energia', label: 'Energías Renovables' },
  { value: 'agro', label: 'Agroindustria' },
  { value: 'tecnologia', label: 'Tecnología & IA' },
  { value: 'logistica', label: 'Logística & Puertos' }
];

@Component({
  selector: 'app-stand-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stand-form-modal.component.html'
})
export class StandFormModalComponent {
  private fb = inject(FormBuilder);

  public isOpen = input<boolean>(false);
  public standToEdit = input<Stand | null>(null);

  public save = output<StandFormData>();
  public close = output<void>();

  public isPreviewOpen = signal<boolean>(false);

  public categories = CATEGORY_OPTIONS;

  public standForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    stand: ['', [Validators.required]],
    category: ['mineria', [Validators.required]],
    subtitle: [''],
    origin: ['Jujuy, Argentina', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  constructor() {
    effect(() => {
      const stand = this.standToEdit();
      if (stand) {
        this.standForm.patchValue({
          name: stand.name,
          stand: stand.stand,
          category: stand.category,
          subtitle: stand.subtitle || '',
          origin: stand.origin || 'Argentina',
          description: stand.description
        });
      } else {
        this.standForm.reset({
          name: '',
          stand: '',
          category: 'mineria',
          subtitle: '',
          origin: 'Jujuy, Argentina',
          description: ''
        });
      }
      this.isPreviewOpen.set(false);
    });
  }

  public onSubmit(): void {
    if (this.standForm.invalid) {
      this.standForm.markAllAsTouched();
      return;
    }

    const val = this.standForm.value;
    const data: StandFormData = {
      id: this.standToEdit()?.id,
      name: val.name || '',
      stand: val.stand || 'Stand S/N',
      category: val.category || 'mineria',
      subtitle: val.subtitle || '',
      origin: val.origin || 'Argentina',
      description: val.description || ''
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }

  public formatCategory(category: string): string {
    return CATEGORY_LABELS[category] || category;
  }
}