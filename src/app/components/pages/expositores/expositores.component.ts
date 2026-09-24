import { Component, HostListener, Inject, OnInit, PLATFORM_ID, ChangeDetectorRef, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { Exhibitor } from '../../models/exhibitor.model';
import { B2BMeetingRequest } from '../../models/b2b-meeting.model';
import { ExpositorApi } from '../../../services/apiExpositores.service';
import { B2BMeetingService } from '../../../services/b2b-meeting.service';

@Component({
  selector: 'app-expositores',
  standalone: true,
  imports: [InfiniteScrollDirective, ReactiveFormsModule],
  templateUrl: './expositores.component.html',
  styleUrl: './expositores.component.css'
})
export class ExpositoresComponent implements OnInit {
  readonly exhibitors = signal<Exhibitor[]>([]);
  readonly loadingExhibitors = signal<boolean>(false);
  readonly hasMoreExhibitors = signal<boolean>(true);
  readonly exhibitorsError = signal<boolean>(false);
  readonly activeCategory = signal<string>('all');
  readonly selectedExhibitor = signal<Exhibitor | null>(null);
  readonly b2bModalState = signal<'closed' | 'open' | 'submitting' | 'success' | 'validation-error' | 'server-error'>('closed');
  readonly today = this.getToday();

  readonly b2bForm: ReturnType<FormBuilder['group']>;

  private createB2BForm(): ReturnType<FormBuilder['group']> {
    return this.formBuilder.group({
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    clientCompany: ['', Validators.required],
    clientEmail: ['', [Validators.required, Validators.email]],
    clientPhone: ['', Validators.required],
    exhibitorId: ['', Validators.required],
    exhibitorName: ['', Validators.required],
    meetingDate: ['', [Validators.required, this.notPastDateValidator]],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    attendees: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    modality: ['presencial' as 'presencial' | 'virtual', Validators.required],
    notes: ['']
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
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.b2bForm = this.createB2BForm();
  }

  ngOnInit(): void {
    this.bindWindowGlobals();
    this.loadExhibitors(true);
  }

  private bindWindowGlobals(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    (window as any).filtrarExpositores = () => this.filterExhibitors();
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

    this.apiExpositores.getExpositores({
      page: this.currentExhibitorPage,
      pageSize: this.pageSize,
      category: this.currentCategory,
      search: this.currentSearchQuery
    }).subscribe({
      next: (res) => {
        const datos = res?.data && Array.isArray(res.data.items) ? res.data : res;
        const items: Exhibitor[] = Array.isArray(datos.items) ? datos.items : [];

        if (reset) {
          this.exhibitors.set(items);
        } else {
          this.exhibitors.update(current => [...current, ...items]);
        }

        this.hasMoreExhibitors.set(datos.hasMore !== false);
        this.currentExhibitorPage++;
        this.loadingExhibitors.set(false);
        this.cdr.detectChanges();

        if (isPlatformBrowser(this.platformId)) {
          this.activarScrollRevealLocal();
        }
      },
      error: (err) => {
        this.loadingExhibitors.set(false);
        this.exhibitorsError.set(true);
        this.hasMoreExhibitors.set(false);
        this.cdr.detectChanges();
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

  openB2BModal(exhibitor: Exhibitor): void {
    this.selectedExhibitor.set(exhibitor);
    this.b2bForm.reset({
      clientName: '', clientCompany: '', clientEmail: '', clientPhone: '',
      exhibitorId: exhibitor.id, exhibitorName: exhibitor.name, meetingDate: '',
      startTime: '', endTime: '', attendees: 1, description: '',
      modality: 'presencial', notes: ''
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
      this.b2bModalState.set('validation-error');
      return;
    }

    const request = this.b2bForm.getRawValue() as B2BMeetingRequest;
    this.b2bModalState.set('submitting');
    this.b2bMeetingService.createB2BMeeting(request).subscribe({
      next: () => {
        this.b2bForm.reset();
        this.b2bModalState.set('success');
      },
      error: (error) => {
        console.error('Error al registrar la reunión B2B:', error);
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
    const startTime = control.get('startTime')?.value;
    const endTime = control.get('endTime')?.value;
    return startTime && endTime && endTime <= startTime ? { invalidTimeRange: true } : null;
  }

  setCategoryFilter(category: string): void {
    this.currentCategory = category;
    this.activeCategory.set(category);
    this.loadExhibitors(true);
  }

  filterExhibitors(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = document.getElementById('exhibitor-search') as HTMLInputElement | null;
    this.currentSearchQuery = input?.value ?? '';
    this.loadExhibitors(true);
  }

  smoothScrollTo(target: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const id = target.replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private activarScrollRevealLocal(): void {
    const reveals = document.querySelectorAll('#expositores .reveal-on-scroll');
    reveals.forEach((el) => {
      if (el instanceof Element) {
        el.classList.add('visible');
      }
    });
  }
}