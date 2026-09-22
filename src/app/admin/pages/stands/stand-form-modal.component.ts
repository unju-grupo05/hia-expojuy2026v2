import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Stand {
  id: string;
  name: string;
  sector: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  standNumber: string;
  isVisible: boolean;
  origin?: string;
}

export type StandFormData = Omit<Stand, 'id'> & { id?: string };

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

  public standForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    sector: ['Minería & Litio', [Validators.required]],
    standNumber: ['', [Validators.required]],
    origin: ['Jujuy, Argentina', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    logoUrl: ['https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80'],
    bannerUrl: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'],
    isVisible: [true]
  });

  constructor() {
    effect(() => {
      const stand = this.standToEdit();
      if (stand) {
        this.standForm.patchValue({
          name: stand.name,
          sector: stand.sector,
          standNumber: stand.standNumber,
          origin: stand.origin || 'Argentina',
          description: stand.description,
          logoUrl: stand.logoUrl,
          bannerUrl: stand.bannerUrl,
          isVisible: stand.isVisible
        });
      } else {
        this.standForm.reset({
          name: '',
          sector: 'Minería & Litio',
          standNumber: '',
          origin: 'Jujuy, Argentina',
          description: '',
          logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
          isVisible: true
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
      sector: val.sector || 'General',
      standNumber: val.standNumber || 'S/N',
      origin: val.origin || 'Argentina',
      description: val.description || '',
      logoUrl: val.logoUrl || '',
      bannerUrl: val.bannerUrl || '',
      isVisible: val.isVisible !== false
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }
}
