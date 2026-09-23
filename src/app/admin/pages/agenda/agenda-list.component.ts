import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaEvent, AgendaEventFormData, AgendaFormModalComponent } from './agenda-form-modal.component';
import { AgendaApi } from '../../../services/apiAgenda.service';

@Component({
  selector: 'app-agenda-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendaFormModalComponent],
  templateUrl: './agenda-list.component.html'
})
export class AgendaListComponent implements OnInit {
  private apiAgenda = inject(AgendaApi);

  public events = signal<AgendaEvent[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public searchTerm = signal<string>('');
  public selectedDateFilter = signal<number | 'all'>('all');
  public isModalOpen = signal<boolean>(false);
  public editingEvent = signal<AgendaEvent | null>(null);
  public previewingEvent = signal<AgendaEvent | null>(null);
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  public filteredEvents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const date = this.selectedDateFilter();

    return this.events()
      .filter(ev => {
        const matchesTerm = !term ||
          ev.titulo.toLowerCase().includes(term) ||
          (ev.disertante || '').toLowerCase().includes(term) ||
          ev.lugar.toLowerCase().includes(term);

        const matchesDate = date === 'all' || ev.dia === date;

        return matchesTerm && matchesDate;
      })
      .sort((a, b) => {
        if (a.dia !== b.dia) return a.dia - b.dia;
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.horaInicio.localeCompare(b.horaInicio);
      });
  });

  public ngOnInit(): void {
    this.cargarAgenda();
  }

  private mapearEventoDesdeApi(api: any): AgendaEvent {
    return {
      id: Number(api.id),
      dia: Number(api.dia) || 1,
      diaSemana: api.diaSemana || '',
      horaInicio: api.horaInicio || '',
      horaFin: api.horaFin || '',
      titulo: api.titulo || '',
      descripcion: api.descripcion || '',
      lugar: api.lugar || '',
      disertante: api.disertante || '',
      etiqueta: api.etiqueta || '',
      orden: Number(api.orden) || 0
    };
  }

  private mapearEventoParaApi(data: AgendaEventFormData): any {
    return {
      dia: Number(data.dia) || 1,
      diaSemana: data.diaSemana || '',
      horaInicio: data.horaInicio,
      horaFin: data.horaFin,
      titulo: data.titulo,
      descripcion: data.descripcion || '',
      lugar: data.lugar,
      disertante: data.disertante || '',
      etiqueta: data.etiqueta || '',
      orden: Number(data.orden) || 0
    };
  }

  private cargarAgenda(): void {
    this.isLoading.set(true);
    this.apiAgenda.getAgenda().subscribe({
      next: (res) => {
        const datos = res?.data || res;
        this.events.set(Array.isArray(datos) ? datos.map(this.mapearEventoDesdeApi) : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.events.set([]);
        this.isLoading.set(false);
        this.showToast(err?.error?.message || 'Error al cargar la agenda del evento.', 'error');
      }
    });
  }

  public openCreateModal(): void {
    this.editingEvent.set(null);
    this.isModalOpen.set(true);
  }

  public openEditModal(event: AgendaEvent): void {
    this.editingEvent.set(event);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    this.editingEvent.set(null);
  }

  public openPreview(event: AgendaEvent): void {
    this.previewingEvent.set(event);
  }

  public closePreview(): void {
    this.previewingEvent.set(null);
  }

  public saveEvent(formData: AgendaEventFormData): void {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    const payload = this.mapearEventoParaApi(formData);

    const request = formData.id
      ? this.apiAgenda.putModificarAgenda(formData.id, payload)
      : this.apiAgenda.postAgenda(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.showToast(
          formData.id
            ? 'Actividad del cronograma actualizada correctamente.'
            : 'Nueva actividad programada con éxito.',
          'success'
        );
        this.cargarAgenda();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showToast(err?.error?.message || 'No se pudo guardar la actividad. Revisa tu sesión.', 'error');
      }
    });
  }

  public deleteEvent(id: number): void {
    const eventToDelete = this.events().find(e => e.id === id);
    if (!eventToDelete) return;

    if (confirm(`¿Eliminar la actividad "${eventToDelete.titulo}"?`)) {
      this.apiAgenda.deleteActividad(id).subscribe({
        next: () => {
          this.events.update(list => list.filter(e => e.id !== id));
          this.showToast('Actividad eliminada de la agenda.', 'success');
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'No se pudo eliminar la actividad. Revisa tu sesión.', 'error');
        }
      });
    }
  }

  private showToast(msg: string, tipo: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastType.set(tipo);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}