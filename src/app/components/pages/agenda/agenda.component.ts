import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AgendaApi } from '../../../services/apiAgenda.service';
import { ChangeDetectorRef } from '@angular/core';

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

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css'
})
export class AgendaComponent implements OnInit {
  agenda: any[] = [];
  dias: AgendaDia[] = [];
  cargando: boolean = true;
  activeDay: number = 1;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private apiAgenda: AgendaApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.obtenerAgenda();
    if (isPlatformBrowser(this.platformId)) {
      this.bindWindowGlobals();
    }
  }

  private bindWindowGlobals(): void {
    const w = window as any;
    w.switchDayTab = this.selectDay.bind(this);
    w.openReminderModal = this.openReminderModal.bind(this);
    w.closeReminderModal = this.closeReminderModal.bind(this);
    w.submitReminder = this.submitReminder.bind(this);
  }

  selectDay(dayNum: number, event?: Event): void {
    this.activeDay = dayNum;
    if (isPlatformBrowser(this.platformId)) {
      if (event && event.target) {
        const btn = (event.target as HTMLElement).closest('.day-tab');
        document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active-day'));
        if (btn) btn.classList.add('active-day');
      }

      const targetDay = document.getElementById('day-' + dayNum);
      if (targetDay) {
        const hiddenCards = targetDay.querySelectorAll('.reveal-on-scroll');
        hiddenCards.forEach(c => c.classList.add('is-visible'));
      }
    }
  }

  openReminderModal(title: string, time: string): void {
    const modal = document.getElementById('reminder-modal');
    const actName = document.getElementById('reminder-activity-name');
    const actDate = document.getElementById('reminder-activity-date');
    const success = document.getElementById('reminder-success');
    const form = document.getElementById('reminder-form');

    if (!modal) return;
    if (actName) actName.textContent = title;
    if (actDate) actDate.textContent = time;
    if (success) success.classList.add('hidden');
    if (form) form.classList.remove('hidden');

    modal.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }

  closeReminderModal(): void {
    const modal = document.getElementById('reminder-modal');
    if (modal) {
      modal.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }

  submitReminder(event: Event): void {
    event.preventDefault();
    const form = document.getElementById('reminder-form');
    const success = document.getElementById('reminder-success');
    if (form) form.classList.add('hidden');
    if (success) success.classList.remove('hidden');
    setTimeout(() => {
      this.closeReminderModal();
    }, 2400);
  }

    //***********************SERVICIOS*************************

  obtenerAgenda(): void {
    this.cargando = true;
    this.apiAgenda.getAgenda().subscribe({
      next: (res) => {
        const datos = res?.data || res;
        this.agenda = Array.isArray(datos) ? [...datos] : [];
        this.dias = this.agruparPorDia(this.agenda);
        if (this.dias.length > 0) {
          this.activeDay = this.dias[0].numero;
        }
        this.cargando = false;
        this.cdr.detectChanges();

        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            this.activarScrollRevealLocal();
          }, 100);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error('Error al obtener agenda:', err);
      }
    });
  }

  private agruparPorDia(items: any[]): AgendaDia[] {
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
    const reveals = document.querySelectorAll('#agenda .reveal-on-scroll');
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });

      reveals.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('is-visible'));
    }

    const w = window as any;
    if (w.ScrollTrigger) {
      w.ScrollTrigger.refresh();
    }
  }
}