import {
  Component,
  DestroyRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { Expositor } from '../../../models/expositor.model';
import { B2BMeetingRequest } from '../../../models/b2b-meeting.model';
import { ExpositorApi } from '../../../services/apiExpositores.service';
import { B2BMeetingService } from '../../../services/apiB2B-meeting.service';

@Component({
  selector: 'app-expositores',
  standalone: true,
  imports: [InfiniteScrollDirective, ReactiveFormsModule],
  templateUrl: './expositores.component.html',
  styleUrl: './expositores.component.css'
})
export class ExpositoresComponent implements OnInit, OnDestroy {
  readonly exhibitors = signal<Expositor[]>([]);
  readonly loadingExhibitors = signal<boolean>(false);
  readonly hasMoreExhibitors = signal<boolean>(true);
  readonly exhibitorsError = signal<boolean>(false);
  readonly activeCategory = signal<string>('all');
  readonly selectedExhibitor = signal<Expositor | null>(null);
  readonly b2bModalState = signal<'closed' | 'open' | 'submitting' | 'success' | 'validation-error' | 'server-error'>('closed');
  readonly b2bErrorMessage = signal('');
  readonly b2bSuccessMessage = signal('');
  readonly today = this.getToday();

  readonly b2bForm: ReturnType<FormBuilder['group']>;

  private readonly destroyRef = inject(DestroyRef);

  private createB2BForm(): ReturnType<FormBuilder['group']> {
    return this.formBuilder.group({
    nombreCliente: ['', [Validators.required, Validators.minLength(2)]],
    empresaCliente: ['', Validators.required],
    emailCliente: ['', [Validators.required, Validators.email]],
    telefonoCliente: ['', Validators.required],
    exhibitorId: ['', Validators.required],
    empresaExpositora: ['', Validators.required],
    fechaSolicitada: ['', [Validators.required, this.notPastDateValidator]],
    horaInicioSolicitada: ['', Validators.required],
    horaFinSolicitada: ['', Validators.required],
    cantidadAsistentes: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    motivo: ['', [Validators.required, Validators.minLength(5)]],
    modalidad: ['presencial' as 'presencial' | 'virtual', Validators.required],
    observaciones: ['']
    }, { validators: this.timeRangeValidator });
  }

  private currentExhibitorPage = 1;
  private readonly pageSize = 6;
  private currentCategory = 'all';
  private currentSearchQuery = '';

  constructor(
    private apiExpositores: ExpositorApi,
    private b2bMeetingService: B2BMeetingService,
    private formBuilder: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.b2bForm = this.createB2BForm();
  }

  ngOnInit(): void {
    this.loadExhibitors(true);
  }

  loadExhibitors(reset = false): void {
    if (this.loadingExhibitors()) return;

    if (reset) {
      this.currentExhibitorPage = 1;
      this.hasMoreExhibitors.set(true);
      this.exhibitors.set([]);
    }

    if (!this.hasMoreExhibitors()) return;

    this.loadingExhibitors.set(true);
    this.exhibitorsError.set(false);

    this.apiExpositores
      .getExpositores({
        page: this.currentExhibitorPage,
        pageSize: this.pageSize,
        category: this.currentCategory,
        search: this.currentSearchQuery
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          // Contrato de `/expositores`: la pagina viene en `data` y trae `hasMore`.
          const pagina = res.data;
          const items: Expositor[] = pagina?.items ?? [];

          if (reset) {
            this.exhibitors.set(items);
          } else {
            this.exhibitors.update(current => [...current, ...items]);
          }

          this.hasMoreExhibitors.set(pagina?.hasMore === true);
          this.currentExhibitorPage++;
          this.loadingExhibitors.set(false);

          if (isPlatformBrowser(this.platformId)) {
            this.activarScrollRevealLocal();
          }
        },
        error: (err) => {
          this.loadingExhibitors.set(false);
          this.exhibitorsError.set(true);
          this.hasMoreExhibitors.set(false);
          console.error('Error al obtener expositores:', err);
        }
      });
  }

  onScrollExhibitors(): void {
    if (this.hasMoreExhibitors()) {
      this.loadExhibitors(false);
    }
  }

  retryLoadExhibitors(): void {
    this.loadExhibitors(true);
  }

  openB2BModal(exhibitor: Expositor): void {
    this.selectedExhibitor.set(exhibitor);
    this.b2bForm.reset({
      nombreCliente: '', empresaCliente: '', emailCliente: '', telefonoCliente: '',
      exhibitorId: exhibitor.id, empresaExpositora: exhibitor.name, fechaSolicitada: '',
      horaInicioSolicitada: '', horaFinSolicitada: '', cantidadAsistentes: 1, motivo: '',
      modalidad: 'presencial', observaciones: ''
    });
    this.b2bModalState.set('open');
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
  }

  closeB2BModal(): void {
    this.b2bModalState.set('closed');
    this.selectedExhibitor.set(null);
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  closeB2BModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.b2bModalState() !== 'submitting') {
      this.closeB2BModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.b2bModalState() === 'open' || this.b2bModalState() === 'success' || this.b2bModalState() === 'validation-error' || this.b2bModalState() === 'server-error') {
      this.closeB2BModal();
    }
  }

  submitB2BMeeting(): void {
    if (this.b2bForm.invalid) {
      this.b2bForm.markAllAsTouched();
      this.b2bErrorMessage.set('Revisa los campos marcados antes de enviar.');
      this.b2bModalState.set('validation-error');
      return;
    }

    const request = this.b2bForm.getRawValue() as B2BMeetingRequest;
    console.info('Solicitud B2B enviada desde el formulario:', {
      expositorId: request.expositorId,
      empresaExpositora: request.empresaExpositora
    });
    this.b2bModalState.set('submitting');
    this.b2bMeetingService
      .createB2BMeeting(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response) => {
        this.b2bForm.reset();
        this.b2bErrorMessage.set('');
        this.b2bSuccessMessage.set(response?.emailEnviado
          ? 'La solicitud fue registrada y el correo fue enviado al expositor. Se comunicará contigo para confirmar o coordinar otro horario.'
          : (response?.message || 'La solicitud fue guardada, pero no se pudo enviar el correo al expositor.'));
        this.b2bModalState.set('success');
      },
      error: (error) => {
        console.error('Error al registrar la reunión B2B:', error);
        this.b2bErrorMessage.set(error?.error?.message || 'No se pudo registrar la solicitud.');
        this.b2bModalState.set('server-error');
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.b2bForm.get(fieldName);
    return !!field && field.invalid && field.touched;
  }

  private getToday(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private notPastDateValidator(control: AbstractControl): ValidationErrors | null {
    return control.value && control.value < new Date().toISOString().slice(0, 10)
      ? { pastDate: true }
      : null;
  }

  private timeRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('horaInicioSolicitada')?.value;
    const endTime = control.get('horaFinSolicitada')?.value;
    return startTime && endTime && endTime <= startTime ? { invalidTimeRange: true } : null;
  }

  setCategoryFilter(category: string): void {
    this.currentCategory = category;
    this.activeCategory.set(category);
    this.loadExhibitors(true);
  }

  /**
   * La consulta llega desde el binding `(input)="filterExhibitors($any($event.target).value)"`.
   * Antes se leia con `document.getElementById('exhibitor-search')` y ademas se
   * publicaba un global `window.filtrarExpositores` que nunca se eliminaba.
   */
  filterExhibitors(query: string): void {
    this.currentSearchQuery = (query ?? '').trim();
    this.loadExhibitors(true);
  }

  private activarScrollRevealLocal(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const reveals = document.querySelectorAll('#expositores .reveal-on-scroll');
    reveals.forEach((el) => {
      if (el instanceof Element) {
        el.classList.add('visible');
      }
    });
  }

  /**
   * Si el modal B2B seguía abierto al salir de la ruta, el `body` quedaba con
   * `overflow: hidden` y la pagina quedaba sin scroll de forma permanente.
   */
  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.b2bModalState() !== 'closed') {
      document.body.style.overflow = '';
    }
  }
}