import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface AgendaEvent {
  id: string;
  title: string;
  speaker: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  stage: string;
  isVisible: boolean;
  description?: string;
  badge?: string;
}

export type AgendaEventFormData = Omit<AgendaEvent, 'id'> & { id?: string };

@Component({
  selector: 'app-agenda-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agenda-form-modal.component.html'
})
export class AgendaFormModalComponent {
  private fb = inject(FormBuilder);

  public isOpen = input<boolean>(false);
  public eventToEdit = input<AgendaEvent | null>(null);

  public save = output<AgendaEventFormData>();
  public close = output<void>();

  public isPreviewOpen = signal<boolean>(false);

  public agendaForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    speaker: ['', [Validators.required]],
    date: ['09 Octubre 2026', [Validators.required]],
    timeStart: ['10:00', [Validators.required]],
    timeEnd: ['11:30', [Validators.required]],
    stage: ['Auditorio Plenario A', [Validators.required]],
    badge: ['Confirmado', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    isVisible: [true]
  });

  constructor() {
    effect(() => {
      const ev = this.eventToEdit();
      if (ev) {
        this.agendaForm.patchValue({
          title: ev.title,
          speaker: ev.speaker,
          date: ev.date,
          timeStart: ev.timeStart,
          timeEnd: ev.timeEnd,
          stage: ev.stage,
          badge: ev.badge || 'Confirmado',
          description: ev.description || '',
          isVisible: ev.isVisible
        });
      } else {
        this.agendaForm.reset({
          title: '',
          speaker: '',
          date: '09 Octubre 2026',
          timeStart: '10:00',
          timeEnd: '11:30',
          stage: 'Auditorio Plenario A',
          badge: 'Confirmado',
          description: '',
          isVisible: true
        });
      }
      this.isPreviewOpen.set(false);
    });
  }

  public onSubmit(): void {
    if (this.agendaForm.invalid) {
      this.agendaForm.markAllAsTouched();
      return;
    }

    const val = this.agendaForm.value;
    const data: AgendaEventFormData = {
      id: this.eventToEdit()?.id,
      title: val.title || '',
      speaker: val.speaker || '',
      date: val.date || '09 Octubre 2026',
      timeStart: val.timeStart || '10:00',
      timeEnd: val.timeEnd || '11:00',
      stage: val.stage || 'Auditorio',
      badge: val.badge || 'Confirmado',
      description: val.description || '',
      isVisible: val.isVisible !== false
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }
}
