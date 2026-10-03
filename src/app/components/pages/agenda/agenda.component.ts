import { Component, DestroyRef, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { AgendaService } from '../../../services/agenda.service';
import { scheduleIdle } from '../../../core/idle';
import { AgendaEvento } from '../../../models/agenda.model';

export interface AgendaEventoPublico {
  id: number;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  disertante: string;
  etiqueta: string;
}

export interface AgendaDia {
  numero: number;
  fecha: string;
  resumen: string;
  eventos: AgendaEventoPublico[];
}

const RESUMEN_DIAS: Record<number, string> = {
  1: 'Inauguración & Litio',
  2: 'Corredor Bioceánico',
  3: 'Energías & AgroTech',
  4: 'Rondas B2B & Cierre'
};

type ModalStatus = 'form' | 'enviando' | 'exito' | 'error';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css'
})
export class AgendaComponent implements OnInit, OnDestroy {
  readonly agenda = signal<AgendaEvento[]>([]);
  readonly dias = signal<AgendaDia[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly activeDay = signal<number>(1);

  selectedActivityId: number | null = null;
  selectedActivityTitle: string = '';
  selectedActivityTime: string = '';

  readonly modalOpen = signal<boolean>(false);
  readonly modalStatus = signal<ModalStatus>('form');
  readonly modalErrorMessage = signal<string>('');
  readonly modalSuccessMessage = signal<string>('');
  readonly reminderEmail = signal<string>('');

  @ViewChild('reminderEmailInput') reminderEmailInput?: ElementRef<HTMLInputElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  /** Temporizadores pendientes, cancelados en ngOnDestroy. */
  private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  /** Observadores de reveal pendientes, desconectados en ngOnDestroy. */
  private revealObserver: IntersectionObserver | null = null;
  private observedRevealEls: Element[] = [];

  private cancelIdle: (() => void) | null = null;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private agendaService: AgendaService
  ) {}

  ngOnInit(): void {
    this.obtenerAgenda();
  }

  /** Registra un setTimeout y garantiza su limpieza al destruir. */
  private schedule(fn: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      this.pendingTimers.delete(id);
      fn();
    }, delayMs);
    this.pendingTimers.add(id);
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  selectDay(dayNum: number): void {
    this.activeDay.set(dayNum);
    if (isPlatformBrowser(this.platformId)) {
      this.schedule(() => {
        const activeContainer = this.hostRef.nativeElement.querySelector(`#day-${dayNum}`);
        if (activeContainer) {
          activeContainer.querySelectorAll('.reveal-on-scroll').forEach((el: Element) => {
            el.classList.add('is-visible');
          });
        }
      }, 0);
    }
  }

  openReminderModal(actId: number, title: string, time: string): void {
    this.selectedActivityId = actId;
    this.selectedActivityTitle = title;
    this.selectedActivityTime = time;

    this.reminderEmail.set('');
    this.modalErrorMessage.set('');
    this.modalSuccessMessage.set('');
    this.modalStatus.set('form');
    this.modalOpen.set(true);
    this.setBodyScrollLocked(true);

    // Un turno de renduizado para que exista el input y poder enfocarlo.
    this.schedule(() => this.reminderEmailInput?.nativeElement.focus(), 0);
  }

  closeReminderModal(): void {
    this.modalOpen.set(false);
    this.setBodyScrollLocked(false);
  }

  updateReminderEmail(value: string): void {
    this.reminderEmail.set(value);
  }

  submitReminder(event: Event): void {
    event.preventDefault();

    const email = this.reminderEmail().trim();
    if (!email || !this.selectedActivityId) return;

    this.modalErrorMessage.set('');
    this.modalStatus.set('enviando');

    this.agendaService
      .suscribirse(email, this.selectedActivityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.modalSuccessMessage.set(
            res?.message || 'Te avisaremos por correo cuando la actividad esté por comenzar.'
          );
          this.modalStatus.set('exito');

          this.schedule(() => this.closeReminderModal(), 2500);
        },
        error: (err) => {
          this.modalErrorMessage.set(
            err?.error?.message || 'Error al guardar el recordatorio. Inténtalo de nuevo.'
          );
          this.modalStatus.set('error');
          console.error('Error al suscribir recordatorio:', err);
        }
      });
  }

  //***********************SERVICIOS*************************

  obtenerAgenda(): void {
    this.cargando.set(true);
    this.agendaService
      .getAgenda()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const raw = res.data ?? [];
          this.agenda.set(raw);
          const agrupados = this.agruparPorDia(raw);
          this.dias.set(agrupados);
          if (agrupados.length > 0) {
            this.activeDay.set(agrupados[0].numero);
          }
          this.cargando.set(false);

          if (isPlatformBrowser(this.platformId)) {
            this.schedule(() => this.activarScrollRevealLocal(), 50);
          }
        },
        error: (err) => {
          this.cargando.set(false);
          console.error('Error al obtener agenda:', err);
        }
      });
  }

  private agruparPorDia(items: AgendaEvento[]): AgendaDia[] {
    const mapa = new Map<number, AgendaDia>();

    for (const item of items) {
      const diaNum = Number(item.dia) || 1;
      if (!mapa.has(diaNum)) {
        mapa.set(diaNum, {
          numero: diaNum,
          fecha: item.diaSemana || '',
          resumen: RESUMEN_DIAS[diaNum] || '',
          eventos: []
        });
      }
      mapa.get(diaNum)!.eventos.push({
        id: Number(item.id),
        horaInicio: item.horaInicio || '',
        horaFin: item.horaFin || '',
        titulo: item.titulo || '',
        descripcion: item.descripcion || '',
        lugar: item.lugar || '',
        disertante: item.disertante || '',
        etiqueta: item.etiqueta || ''
      });
    }

    return [...mapa.values()].sort((a, b) => a.numero - b.numero);
  }

  private activarScrollRevealLocal(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.desconectarRevealObserver();

    const reveals = this.hostRef.nativeElement.querySelectorAll('.reveal-on-scroll');
    if (!reveals.length) return;

    reveals.forEach((el: Element) => {
      el.classList.add('is-visible');
    });
  }

  private desconectarRevealObserver(): void {
    if (!this.revealObserver) return;
    this.observedRevealEls.forEach((el) => this.revealObserver!.unobserve(el));
    this.revealObserver.disconnect();
    this.revealObserver = null;
    this.observedRevealEls = [];
  }

  ngOnDestroy(): void {
    // 0. Cancelar la carga diferida si todavia no llego a dispararse.
    this.cancelIdle?.();
    this.cancelIdle = null;

    // 1. Cancelar temporizadores (reveal inicial y cierre automático del modal).
    this.pendingTimers.forEach((id) => clearTimeout(id));
    this.pendingTimers.clear();

    // 2. Desconectar IntersectionObservers.
    this.desconectarRevealObserver();

    // 3. Liberar el bloqueo de scroll si el modal seguía abierto.
    if (this.modalOpen()) {
      this.setBodyScrollLocked(false);
    }
  }
}
