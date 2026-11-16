import { Component, ElementRef, OnDestroy, PLATFORM_ID, computed, effect, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatMessage, ChatResult, ChatSuggestion } from '../../models/chatbot.model';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
  abort(): void;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly chatbot = inject(ChatbotService);

  private readonly chatMessagesBox = viewChild<ElementRef<HTMLDivElement>>('chatMessagesBox');
  private readonly chatInputField = viewChild<ElementRef<HTMLInputElement>>('chatInputField');

  // ── Estado de UI ────
  readonly chatOpen = signal(false);
  readonly chatTyping = signal(false);
  readonly chatDraft = signal('');
  readonly chatMessages = signal<ChatMessage[]>([
    { sender: 'bot', text: '¡Hola! Soy PachAI, tu asistente virtual de ExpoJuy 2026. ¿En qué puedo ayudarte hoy?' }
  ]);

  readonly sugerencias = signal<ChatSuggestion[]>([]);
  readonly micActivo = signal(false);
  readonly vozSoportada = signal(false);
  readonly microfonoDeshabilitado = signal(false);

  readonly esperando = computed(() => this.chatTyping());

  readonly puedeEnviar = computed(() => this.chatDraft().trim().length > 0 && !this.chatTyping());

  private readonly subscriptions = new Subscription();
  private chatScrollFrame: number | null = null;
  private activeRecognition: SpeechRecognitionLike | null = null;

  abrirTelegram(event?: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (event) event.preventDefault();

    const botUsername = 'expojuy_ops_bot';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // En dispositivos móviles, la URL universal abre directamente la app oficial
      window.open(`https://t.me/${botUsername}`, '_blank', 'noopener,noreferrer');
    } else {
      // En PC/Escritorio: intenta primero llamar al protocolo nativo de Telegram Desktop (tg://)
      // y si en 400ms la app no interceptó, abre fluidamente Telegram Web en una nueva pestaña.
      const telegramWebUrl = `https://web.telegram.org/a/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3D${botUsername}`;
      
      const appIframe = document.createElement('iframe');
      appIframe.style.display = 'none';
      document.body.appendChild(appIframe);

      let appOpened = false;
      const onBlur = () => {
        appOpened = true;
      };
      window.addEventListener('blur', onBlur, { once: true });

      try {
        appIframe.src = `tg://resolve?domain=${botUsername}`;
      } catch {
        // Ignorar si el navegador bloquea la asignación
      }

      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        if (appIframe.parentNode) {
          appIframe.parentNode.removeChild(appIframe);
        }
        // Si no se abrió la app nativa (la ventana del navegador no perdió foco), abrir Telegram Web
        if (!appOpened && !document.hidden) {
          window.open(telegramWebUrl, '_blank', 'noopener,noreferrer');
        }
      }, 450);
    }
  }

  constructor() {
    effect(() => {
      this.chatMessages();
      this.chatTyping();

      if (typeof requestAnimationFrame !== 'function') return;
      if (this.chatScrollFrame !== null) cancelAnimationFrame(this.chatScrollFrame);

      this.chatScrollFrame = requestAnimationFrame(() => {
        this.chatScrollFrame = null;
        const box = this.chatMessagesBox()?.nativeElement;
        if (box) box.scrollTop = box.scrollHeight;
      });
    });

    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.classList.toggle('chat-open', this.chatOpen());
    });

    if (isPlatformBrowser(this.platformId)) {
      this.subscriptions.add(this.cargarSugerencias());
      this.subscriptions.add(this.escucharConsultas());
      this.vozSoportada.set(this.detectarVozNativa());
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.chatScrollFrame !== null) cancelAnimationFrame(this.chatScrollFrame);
    this.chatScrollFrame = null;

    this.activeRecognition?.abort();
    this.activeRecognition = null;

    if (typeof document !== 'undefined') {
      document.body.classList.remove('chat-open');
    }
  }

  // =========================================================================
  // PASO 1: FLUJO DE CONSULTA DESDE LA UI
  // =========================================================================

  toggleChatbot(): void {
    const next = !this.chatOpen();
    this.chatOpen.set(next);
    if (next) {
      this.chatInputField()?.nativeElement.focus();
    }
  }

  closeChatbot(): void {
    this.chatOpen.set(false);
  }

  updateChatDraft(value: string): void {
    this.chatDraft.set(value);
  }

  sendChatMessage(event: Event): void {
    event.preventDefault();
    this.enviar(this.chatDraft());
  }

  /** Lanza una sugerencia precargada sin pasar por el input. */
  usarSugerencia(consulta: string): void {
    this.enviar(consulta);
  }

  private enviar(texto: string): void {
    const mensaje = texto.trim();
    if (!mensaje || this.chatTyping()) return;

    this.chatMessages.update(mensajes => [...mensajes, { sender: 'user', text: mensaje }]);
    this.chatDraft.set('');
    this.chatTyping.set(true);

    this.chatbot.enviarConsulta(mensaje);
  }


  private escucharConsultas(): Subscription {
    return this.chatbot.consultaDiferida$.subscribe({
      next: data => {
        this.chatTyping.set(false);
        this.chatMessages.update(mensajes => [
          ...mensajes,
          { sender: 'bot', text: data.mensaje, results: data.resultados ?? [] }
        ]);
      },
      error: () => {
        this.chatTyping.set(false);
        this.chatMessages.update(mensajes => [
          ...mensajes,
          { sender: 'bot', text: 'No pude conectar con el servidor. Intentá de nuevo en unos segundos.' }
        ]);
      }
    });
  }

  private cargarSugerencias(): Subscription {
    return this.chatbot.obtenerSugerencias().subscribe({
      next: sugerencias => this.sugerencias.set(sugerencias),
      error: () => this.sugerencias.set([])
    });
  }


  tieneResultados(mensaje: ChatMessage): boolean {
    return (mensaje.results?.length ?? 0) > 0;
  }

  irAResultado(resultado: ChatResult): void {
    this.closeChatbot();

    if (typeof window === 'undefined') return;

    const ancla = resultado.enlace.startsWith('/#') ? resultado.enlace.slice(1) : resultado.enlace;
    window.location.hash = ancla;

    const destino = document.querySelector<HTMLElement>(ancla);
    destino?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Fecha legible para la tarjeta; cae a un guion si la tabla no tiene fecha. */
  formatoFecha(resultado: ChatResult): string {
    if (!resultado.fecha) return '—';

    const fecha = new Date(resultado.fecha);
    if (Number.isNaN(fecha.getTime())) return resultado.fecha;

    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // =========================================================================
  // ENTRADA POR VOZ
  // =========================================================================

  private detectarVozNativa(): boolean {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  toggleVoiceInput(): void {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.microfonoDeshabilitado.set(true);
      this.responder('Tu navegador no soporta reconocimiento de voz nativo. Por favor escribí tu consulta.');
      return;
    }

    if (this.activeRecognition) {
      this.activeRecognition.abort();
      this.activeRecognition = null;
      this.micActivo.set(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        this.micActivo.set(false);
        this.activeRecognition = null;
        this.enviar(transcript);
      };

      this.activeRecognition = recognition;
      this.micActivo.set(true);
      recognition.start();
    } catch {
      this.micActivo.set(false);
      this.activeRecognition = null;
      this.responder('No se pudo activar el micrófono. Podés escribir tu consulta directamente.');
    }
  }

  private responder(texto: string): void {
    this.chatMessages.update(mensajes => [...mensajes, { sender: 'bot', text: texto }]);
  }
}