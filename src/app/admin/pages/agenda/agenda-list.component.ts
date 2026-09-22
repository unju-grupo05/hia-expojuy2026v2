import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaEvent, AgendaEventFormData, AgendaFormModalComponent } from './agenda-form-modal.component';

@Component({
  selector: 'app-agenda-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendaFormModalComponent],
  templateUrl: './agenda-list.component.html'
})
export class AgendaListComponent {
  public events = signal<AgendaEvent[]>([
    {
      id: 'event-1',
      title: 'Acto de Inauguración Oficial ExpoJuy 2026',
      speaker: 'Autoridades Provinciales y Delegaciones Internacionales',
      date: '09 Octubre 2026',
      timeStart: '10:00',
      timeEnd: '12:00',
      stage: 'Auditorio Plenario A',
      badge: 'Apertura Oficial',
      description: 'Corte de cinta tradicional, recorrida por los 4 pabellones principales y discursos de apertura de la muestra.',
      isVisible: true
    },
    {
      id: 'event-2',
      title: 'Cumbre del Triángulo del Litio: Tecnología & ESG',
      speaker: 'Mesa redonda de CEOs mineros y panelistas de Alemania, Corea del Sur y EE.UU.',
      date: '09 Octubre 2026',
      timeStart: '14:00',
      timeEnd: '16:30',
      stage: 'Sala de Conferencias B',
      badge: 'Cupos Limitados',
      description: 'Análisis de nuevas técnicas de extracción directa (DLE), huella hídrica y valor agregado en baterías.',
      isVisible: true
    },
    {
      id: 'event-3',
      title: 'Cóctel de Bienvenida & Matchmaking B2B',
      speaker: 'Intercambio para expositores registrados y delegaciones del Corredor Bioceánico',
      date: '09 Octubre 2026',
      timeStart: '17:00',
      timeEnd: '19:30',
      stage: 'Espacio Networking Central',
      badge: 'Pase VIP',
      description: 'Sesión exclusiva de networking empresarial y vinculación público-privada.',
      isVisible: true
    },
    {
      id: 'event-4',
      title: 'Foro Logístico del Corredor Bioceánico de Capricornio',
      speaker: 'Ministros de Transporte y representantes de puertos de Antofagasta, Iquique y Brasil',
      date: '10 Octubre 2026',
      timeStart: '10:00',
      timeEnd: '12:30',
      stage: 'Auditorio Plenario A',
      badge: 'Confirmado',
      description: 'Infraestructura vial, ferrocarril Belgrano Cargas y pasos fronterizos de Jama e Hito 45.',
      isVisible: true
    },
    {
      id: 'event-5',
      title: 'Innovación en Agrotecnología y Producción Sostenible',
      speaker: 'Especialistas de INTA y empresas de biotecnología del NOA',
      date: '11 Octubre 2026',
      timeStart: '11:00',
      timeEnd: '13:00',
      stage: 'Pabellón de Energías',
      badge: 'Confirmado',
      description: 'Riego por goteo solar, semillas biofortificadas y biofertilizantes de origen local.',
      isVisible: false
    }
  ]);

  public searchTerm = signal<string>('');
  public selectedDateFilter = signal<string>('all');
  public isModalOpen = signal<boolean>(false);
  public editingEvent = signal<AgendaEvent | null>(null);
  public previewingEvent = signal<AgendaEvent | null>(null);
  public toastMessage = signal<string | null>(null);

  public filteredEvents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const date = this.selectedDateFilter();

    return this.events().filter(ev => {
      const matchesTerm = !term ||
        ev.title.toLowerCase().includes(term) ||
        ev.speaker.toLowerCase().includes(term) ||
        ev.stage.toLowerCase().includes(term);

      const matchesDate = date === 'all' || ev.date === date;

      return matchesTerm && matchesDate;
    });
  });

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

  // Toggle reactivo en línea para visibilidad instantánea
  public toggleVisibility(event: AgendaEvent): void {
    this.events.update(list => list.map(e => {
      if (e.id === event.id) {
        const nextState = !e.isVisible;
        return { ...e, isVisible: nextState };
      }
      return e;
    }));

    const nextState = !event.isVisible;
    this.showToast(`Actividad "${event.title}" ahora está ${nextState ? 'visible' : 'oculta'} en el cronograma.`);
  }

  public saveEvent(formData: AgendaEventFormData): void {
    if (formData.id) {
      this.events.update(list => list.map(e => {
        if (e.id === formData.id) {
          return {
            ...e,
            ...formData,
            id: e.id
          };
        }
        return e;
      }));
      this.showToast('Actividad del cronograma actualizada correctamente.');
    } else {
      const newEvent: AgendaEvent = {
        id: 'event-' + Date.now(),
        title: formData.title,
        speaker: formData.speaker,
        date: formData.date,
        timeStart: formData.timeStart,
        timeEnd: formData.timeEnd,
        stage: formData.stage,
        badge: formData.badge,
        description: formData.description,
        isVisible: formData.isVisible
      };
      this.events.update(list => [newEvent, ...list]);
      this.showToast('Nueva actividad programada con éxito.');
    }

    this.closeModal();
  }

  public deleteEvent(id: string): void {
    const eventToDelete = this.events().find(e => e.id === id);
    if (!eventToDelete) return;

    if (confirm(`¿Eliminar la actividad "${eventToDelete.title}"?`)) {
      this.events.update(list => list.filter(e => e.id !== id));
      this.showToast('Actividad eliminada de la agenda.');
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
