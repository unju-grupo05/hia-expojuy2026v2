import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Pillar {
  id: number;
  title: string;
  description: string;
  iconSvgName: string;
  order: number;
}

export type PillarFormData = Omit<Pillar, 'id'> & { id?: number };

@Component({
  selector: 'app-pillar-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pillar-form-modal.component.html'
})
export class PillarFormModalComponent {
  private fb = inject(FormBuilder);

  public isOpen = input<boolean>(false);
  public pillarToEdit = input<Pillar | null>(null);
  public isSaving = input<boolean>(false);

  public save = output<PillarFormData>();
  public close = output<void>();

  public availableIcons = [
    { name: 'lightbulb', label: 'Innovación' },
    { name: 'solar_power', label: 'Energía Solar' },
    { name: 'rv_hookup', label: 'Corredor & Logística' },
    { name: 'science', label: 'Minería & Litio' },
    { name: 'agriculture', label: 'Agroindustria' },
    { name: 'handshake', label: 'Ronda B2B' },
    { name: 'factory', label: 'Industria' },
    { name: 'hub', label: 'Conectividad' }
  ];

  public pillarForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    iconSvgName: ['lightbulb', [Validators.required]],
    order: [1, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  constructor() {
    effect(() => {
      const p = this.pillarToEdit();
      if (p) {
        this.pillarForm.patchValue({
          title: p.title,
          description: p.description,
          iconSvgName: p.iconSvgName,
          order: p.order
        });
      } else {
        this.pillarForm.reset({
          title: '',
          description: '',
          iconSvgName: 'lightbulb',
          order: 1
        });
      }
    });
  }

  public selectIcon(iconName: string): void {
    this.pillarForm.patchValue({ iconSvgName: iconName });
  }

  public onSubmit(): void {
    if (this.pillarForm.invalid) {
      this.pillarForm.markAllAsTouched();
      return;
    }

    const val = this.pillarForm.value;
    const data: PillarFormData = {
      id: this.pillarToEdit()?.id,
      title: val.title || '',
      description: val.description || '',
      iconSvgName: val.iconSvgName || 'lightbulb',
      order: Number(val.order) || 1
    };

    this.save.emit(data);
  }
}
