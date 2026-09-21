import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ElementRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

interface PaseDetail {
  nombre: string;
  precioIndividual: number;
  precioGrupal: number;
  vigencia: string;
  beneficios: string[];
}

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entradas.html',
  styleUrl: './entradas.css'
})
export class Entradas implements OnInit, AfterViewInit {
  public paseActual = 'empresarial';
  public ticketType = 'individual';

  public pasesData: Record<string, PaseDetail> = {
    general: {
      nombre: 'Pase General',
      precioIndividual: 5000,
      precioGrupal: 4000,
      vigencia: 'Acceso 1 Día',
      beneficios: [
        'Acceso libre a pabellones de expositores',
        'Ingreso a patio gastronómico y espectáculos',
        'Credencial digital con código QR'
      ]
    },
    full: {
      nombre: 'Pase VIP / Summit',
      precioIndividual: 25000,
      precioGrupal: 20000,
      vigencia: 'Acceso Total + Conferencias',
      beneficios: [
        'Todos los beneficios del Pase Ejecutivo',
        'Asiento reservado en Conferencias Plenarias y Summits',
        'Cocktail exclusivo de Apertura y Networking',
        'Estacionamiento preferencial dentro del predio'
      ]
    },
    empresarial: {
      nombre: 'Pase Ejecutivo',
      precioIndividual: 12000,
      precioGrupal: 9500,
      vigencia: 'Acceso Full Evento (10 días)',
      beneficios: [
        'Acceso prioritario sin filas a todos los pabellones',
        'Ingreso al Lounge VIP y área de Coworking',
        'Participación en Rondas de Negocios',
        'Catálogo digital de Expositores con contactos directos'
      ]
    }
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private el: ElementRef
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initScrollReveal();
    
    // Forzar renderizado inicial con pequeño delay para que el DOM esté listo
    setTimeout(() => {
      this.selectPase('empresarial');
    }, 100);
  }

  // Permite que la clase .reveal-on-scroll funcione dentro de este componente aislado
  private initScrollReveal(): void {
    const reveals = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');
    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      reveals.forEach((element: Element) => observer.observe(element));
    } else {
      reveals.forEach((element: Element) => element.classList.add('is-visible'));
    }
  }

  public selectPase(paseId: string): void {
    this.paseActual = paseId;

    const nativeEl = this.el.nativeElement as HTMLElement;
    nativeEl.querySelectorAll('.pase-pill').forEach(p => p.classList.remove('active-pase'));
    
    const btn = nativeEl.querySelector('#pase-pill-' + paseId);
    if (btn) btn.classList.add('active-pase');

    this.renderPaseDetail();
    this.generatePassQR();
    this.applyPassTheme(paseId);
  }

  public selectModalidad(modo: string): void {
    this.ticketType = modo;
    const nativeEl = this.el.nativeElement as HTMLElement;
    
    nativeEl.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active-modo'));
    const btn = nativeEl.querySelector('#modo-' + this.ticketType);
    if (btn) btn.classList.add('active-modo');

    this.renderPaseDetail();
    this.generatePassQR();
    this.applyPassTheme(this.paseActual);
  }

  private applyPassTheme(paseId: string): void {
    const nativeEl = this.el.nativeElement as HTMLElement;
    const ticket = nativeEl.querySelector('#pass-ticket') as HTMLElement | null;
    const infoCard = nativeEl.querySelector('#pase-info-card') as HTMLElement | null;

    if (ticket) ticket.setAttribute('data-theme', paseId);
    if (infoCard) infoCard.setAttribute('data-theme', paseId);

    [ticket, infoCard].forEach(el => {
      if (!el) return;
      el.classList.remove('pass-waving');
      void el.offsetWidth; // Fuerza la actualización de estilos (reflow)
      el.classList.add('pass-waving');

      el.addEventListener('animationend', () => {
        el.classList.remove('pass-waving');
      }, { once: true });
    });
  }

  private renderPaseDetail(): void {
    const pase = this.pasesData[this.paseActual];
    if (!pase) return;

    const isGroup = this.ticketType === 'group';
    const precio = isGroup ? pase.precioGrupal : pase.precioIndividual;
    const nativeEl = this.el.nativeElement as HTMLElement;

    const nombreEl = nativeEl.querySelector('#pase-detail-nombre');
    const precioEl = nativeEl.querySelector('#pase-detail-precio');
    const vigenciaEl = nativeEl.querySelector('#pase-detail-vigencia');
    const precioUnitEl = nativeEl.querySelector('#pase-detail-precio-unit');
    const listEl = nativeEl.querySelector('#pase-detail-beneficios');
    const noteEl = nativeEl.querySelector('#pase-detail-grupal-note');

    if (nombreEl) nombreEl.textContent = pase.nombre;
    if (precioEl) precioEl.textContent = '$' + precio.toLocaleString('es-AR');
    if (vigenciaEl) vigenciaEl.textContent = 'Por persona · ' + pase.vigencia;
    if (precioUnitEl) precioUnitEl.textContent = '$' + precio.toLocaleString('es-AR') + ' por persona';

    if (listEl) {
      listEl.innerHTML = '';
      pase.beneficios.forEach(b => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2 text-sm text-on-surface-variant';
        li.innerHTML = '<span class="material-symbols-outlined text-brand-cyan-electric text-[17px] mt-0.5">check_circle</span>' + b;
        listEl.appendChild(li);
      });
    }

    if (noteEl) {
      if (isGroup) noteEl.classList.remove('hidden');
      else noteEl.classList.add('hidden');
    }
  }

  private generatePassQR(nombre?: string): void {
    const nativeEl = this.el.nativeElement as HTMLElement;
    const qrContainer = nativeEl.querySelector('#qrcode');
    if (!qrContainer) return;

    const pase = this.pasesData[this.paseActual] || this.pasesData['empresarial'];
    const modo = this.ticketType === 'group' ? 'GRUPAL' : 'INDIVIDUAL';
    const data = 'EXPOJUY-2026|' + pase.nombre + '|' + modo + '|' + (nombre ? nombre.toUpperCase() : 'VISITANTE') + '|09-12-10-2026';

    qrContainer.innerHTML = '<canvas id="qrcode-canvas"></canvas>';
    const canvas = nativeEl.querySelector('#qrcode-canvas') as HTMLCanvasElement;
    if (canvas) {
      QRCode.toCanvas(canvas, data, {
        width: 132,
        margin: 1,
        color: { dark: '#1A1226', light: '#FFFFFF' }
      }, (error) => {
        if (error) qrContainer.textContent = 'QR';
      });
    }
  }

  public handlePaseSubmit(e: Event): void {
    e.preventDefault();
    const nativeEl = this.el.nativeElement as HTMLElement;
    const input = nativeEl.querySelector('#pase-name-input') as HTMLInputElement | null;
    const nombre = (input && input.value.trim()) ? input.value.trim() : 'Visitante ExpoJuy';

    const passName = nativeEl.querySelector('#pass-name');
    const passTipo = nativeEl.querySelector('#pass-tipo');
    if (passName) passName.textContent = nombre;
    if (passTipo) passTipo.textContent = this.pasesData[this.paseActual].nombre;

    this.generatePassQR(nombre);

    const wrap = nativeEl.querySelector('#qrcode-wrap');
    if (wrap) wrap.classList.remove('is-locked');

    const success = nativeEl.querySelector('#pase-form-success');
    if (success) {
      success.classList.remove('hidden');
    }
  }
}