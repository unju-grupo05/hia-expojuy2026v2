import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface AgendaEvent {
  id: number;
  dia: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion?: string;
  lugar: string;
  disertante?: string;
  etiqueta?: string;
  orden: number;
}

export type AgendaEventFormData = Omit<AgendaEvent, 'id'> & { id?: number };

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

  public DIAS = [
    { numero: 1, fecha: '09 Oct 2026', label: 'Día 1 · 09 Oct 2026' },
    { numero: 2, fecha: '10 Oct 2026', label: 'Día 2 · 10 Oct 2026' },
    { numero: 3, fecha: '11 Oct 2026', label: 'Día 3 · 11 Oct 2026' },
    { numero: 4, fecha: '12 Oct 2026', label: 'Día 4 · 12 Oct 2026' }
  ];

  public LUGARES = [
    'Auditorio Plenario A',
    'Sala de Conferencias B',
    'Espacio Networking Central',
    'Pabellón de Energías',
    'Escenario Abierto Cultural'
  ];

  public ETIQUETAS = [
    'Confirmado',
    'Cupos Limitados',
    'Pase VIP',
    'Apertura Oficial',
    'Transmisión en Vivo',
    'Inscripción Previa'
  ];

  public agendaForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(5)]],
    disertante: [''],
    dia: [1, [Validators.required]],
    horaInicio: ['10:00', [Validators.required]],
    horaFin: ['11:30', [Validators.required]],
    lugar: ['Auditorio Plenario A', [Validators.required]],
    etiqueta: ['Confirmado'],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    orden: [1, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    effect(() => {
      const ev = this.eventToEdit();
      if (ev) {
        this.agendaForm.patchValue({
          titulo: ev.titulo,
          disertante: ev.disertante || '',
          dia: ev.dia,
          horaInicio: ev.horaInicio,
          horaFin: ev.horaFin,
          lugar: ev.lugar,
          etiqueta: ev.etiqueta || 'Confirmado',
          descripcion: ev.descripcion || '',
          orden: ev.orden
        });
      } else {
        this.agendaForm.reset({
          titulo: '',
          disertante: '',
          dia: 1,
          horaInicio: '10:00',
          horaFin: '11:30',
          lugar: 'Auditorio Plenario A',
          etiqueta: 'Confirmado',
          descripcion: '',
          orden: 1
        });
      }
      this.isPreviewOpen.set(false);
    });
  }

  private obtenerFechaDia(dia: number): string {
    const d = this.DIAS.find(diaItem => diaItem.numero === dia);
    return d ? d.fecha : '';
  }

  public onSubmit(): void {
    if (this.agendaForm.invalid) {
      this.agendaForm.markAllAsTouched();
      return;
    }

    const val = this.agendaForm.value;
    const dia = Number(val.dia) || 1;
    const data: AgendaEventFormData = {
      id: this.eventToEdit()?.id,
      dia,
      diaSemana: this.obtenerFechaDia(dia),
      horaInicio: val.horaInicio || '10:00',
      horaFin: val.horaFin || '11:00',
      titulo: val.titulo || '',
      descripcion: val.descripcion || '',
      lugar: val.lugar || 'Auditorio Plenario A',
      disertante: val.disertante || '',
      etiqueta: val.etiqueta || 'Confirmado',
      orden: Number(val.orden) || 1
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }
}