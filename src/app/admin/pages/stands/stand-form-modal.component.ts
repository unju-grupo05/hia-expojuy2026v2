import { Component, DestroyRef, ElementRef, effect, inject, input, output, signal, computed, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StandsService } from '../../../services/stands.service';
import { StandBackendDto } from '../../../components/models/stand.model';
import { ExpositoresService } from '../../../services/expositores.service';
import { ASSETS_BASE } from '../../../core/api-url';

/** Mismo filtro que aplica `upload.middleware.js` en el backend. */
const LOGO_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export interface Stand {
  id: string;
  name: string;
  stand: string;
  category: string;
  subtitle: string;
  description: string;
  origin: string;
  /** Correo de contacto. Opcional: vacio o null cuando el expositor no lo cargo. */
  email: string;
  logo?: string | null;
  standIds?: string[];
}

export type StandFormData = Omit<Stand, 'id'> & { id?: string; standIds: string[] };

export const CATEGORY_LABELS: Record<string, string> = {
  agroindustria: 'Agroindustria & Tabaco',
  automotor: 'Automotor & Maquinaria Pesada',
  construccion: 'Construcción e Inmobiliaria',
  mineria: 'Minería & Litio',
  alimentos_bebidas: 'Alimentos, Bebidas & Regionales',
  medios_comunicacion: 'Medios de Comunicación',
  educacion: 'Educación & Académico',
  institucional: 'Institucional & Gobierno',
  comercio_servicios: 'Comercio, Banca & Servicios',
  bazar_regaleria: 'Bazar, Regalería & Moda',
  tecnologia_3d: 'Tecnología, 3D & Electrónica'
};

/** Opciones para los selectores/dropdowns de la interfaz */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'agroindustria', label: 'Agroindustria & Tabaco' },
  { value: 'automotor', label: 'Automotor & Maquinaria Pesada' },
  { value: 'construccion', label: 'Construcción e Inmobiliaria' },
  { value: 'mineria', label: 'Minería & Litio' },
  { value: 'alimentos_bebidas', label: 'Alimentos, Bebidas & Regionales' },
  { value: 'medios_comunicacion', label: 'Medios de Comunicación' },
  { value: 'educacion', label: 'Educación & Académico' },
  { value: 'institucional', label: 'Institucional & Gobierno' },
  { value: 'comercio_servicios', label: 'Comercio, Banca & Servicios' },
  { value: 'bazar_regaleria', label: 'Bazar, Regalería & Moda' },
  { value: 'tecnologia_3d', label: 'Tecnología, 3D & Electrónica' }
];

@Component({
  selector: 'app-stand-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stand-form-modal.component.html'
})
export class StandFormModalComponent {
  private fb = inject(FormBuilder);
  private standsService = inject(StandsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly expositoresService = inject(ExpositoresService);

  public isOpen = input<boolean>(false);
  public standToEdit = input<Stand | null>(null);

  public save = output<StandFormData>();
  public close = output<void>();

  public isPreviewOpen = signal<boolean>(false);
  public standsDisponibles = signal<StandBackendDto[]>([]);
  public standsLoading = signal<boolean>(false);
  public selectedStandIds = signal<string[]>([]);
  public standsSearch = signal<string>('');
  public isStandSelectorOpen = signal<boolean>(false);

  /** Ruta del logo WebP vigente (`/uploads/logo-<uuid>.webp`) o null. */
  public logoPath = signal<string | null>(null);
  /** Vista previa local mientras se sube el archivo (object URL). */
  public logoPreviewUrl = signal<string | null>(null);
  public logoUploading = signal<boolean>(false);
  public logoError = signal<string | null>(null);

  private readonly logoInput = viewChild<ElementRef<HTMLInputElement>>('logoInput');
  private objectUrlPendiente: string | null = null;

  public categories = CATEGORY_OPTIONS;

  public standForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    stand: ['', [Validators.required]],
    category: ['comercio_servicios', [Validators.required]],
    subtitle: [''],
    origin: ['Jujuy, Argentina', [Validators.required]],
    // Opcional: `Validators.email` acepta el valor vacio, asi que solo bloquea el envio
    // cuando hay algo escrito con un formato que no es de correo.
    email: ['', [Validators.email, Validators.maxLength(254)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  public filteredStandsDisponibles = computed(() => {
    const term = this.standsSearch().trim().toLowerCase();
    const all = this.standsDisponibles();
    if (!term) return all;

    return all.filter(s =>
      s.id.toLowerCase().includes(term) ||
      (s.sector && s.sector.toLowerCase().includes(term)) ||
      (s.superficie && s.superficie.toLowerCase().includes(term))
    );
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeObjectUrl());

    effect(() => {
      const open = this.isOpen();
      const stand = this.standToEdit();

      if (open) {
        if (stand) {
          // Extraer IDs existentes desde standIds o desde la cadena concatenada "A1, A2"
          const parsedIds = stand.standIds && stand.standIds.length > 0
            ? [...stand.standIds]
            : (stand.stand ? stand.stand.split(',').map(s => s.trim()).filter(Boolean) : []);

          this.selectedStandIds.set(parsedIds);

          this.standForm.patchValue({
            name: stand.name,
            stand: parsedIds.join(', '),
            category: stand.category || 'comercio_servicios',
            subtitle: stand.subtitle || '',
            origin: stand.origin || 'Jujuy, Argentina',
            email: stand.email || '',
            description: stand.description || ''
          });

          this.resetLogo(stand.logo ?? null);

          this.cargarStandsDisponibles(stand.id);
        } else {
          this.selectedStandIds.set([]);
          this.standForm.reset({
            name: '',
            stand: '',
            category: 'comercio_servicios',
            subtitle: '',
            origin: 'Jujuy, Argentina',
            email: '',
            description: ''
          });

          this.resetLogo(null);

          this.cargarStandsDisponibles();
        }

        this.isPreviewOpen.set(false);
        this.isStandSelectorOpen.set(false);
        this.standsSearch.set('');
      }
    });
  }

  public cargarStandsDisponibles(expositorId?: string): void {
    this.standsLoading.set(true);
    this.standsService.getStandsDisponibles(expositorId).subscribe({
      next: (res) => {
        this.standsDisponibles.set(res.data || []);
        this.standsLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar parcelas disponibles:', err);
        this.standsLoading.set(false);
      }
    });
  }

  public toggleStandSelection(standId: string): void {
    const current = this.selectedStandIds();
    let updated: string[];

    if (current.includes(standId)) {
      updated = current.filter(id => id !== standId);
    } else {
      updated = [...current, standId].sort();
    }

    this.selectedStandIds.set(updated);
    this.standForm.patchValue({ stand: updated.join(', ') });
    this.standForm.get('stand')?.markAsDirty();
  }

  public removeStand(standId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const updated = this.selectedStandIds().filter(id => id !== standId);
    this.selectedStandIds.set(updated);
    this.standForm.patchValue({ stand: updated.join(', ') });
    this.standForm.get('stand')?.markAsDirty();
  }

  public isStandSelected(standId: string): boolean {
    return this.selectedStandIds().includes(standId);
  }

  //=============================== LOGO ===============================

  /** URL absoluta para previsualizar el logo (WebP servido desde /uploads). */
  public logoPreviewSrc(): string {
    const preview = this.logoPreviewUrl();
    if (preview) return preview;

    const path = this.logoPath();
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;

    return `${ASSETS_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /**
   * Sube el logo elegido. El backend lo normaliza a WebP (<=150x150 px, quality 80):
   * - expositor existente → `POST /api/expositores/:id/logo` (asigna y borra el anterior);
   * - alta nueva → `POST /api/expositores/logo` (devuelve la URL para el payload).
   */
  public onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.logoError.set(null);

    if (!LOGO_MIME_PERMITIDOS.includes(file.type)) {
      this.logoError.set('Formato no permitido. Solo se admiten imágenes (JPEG, PNG, WebP o AVIF).');
      this.resetFileInput();
      return;
    }

    if (file.size > LOGO_MAX_BYTES) {
      this.logoError.set('El archivo excede el tamaño máximo permitido de 5MB.');
      this.resetFileInput();
      return;
    }

    this.revokeObjectUrl();
    this.logoPreviewUrl.set(URL.createObjectURL(file));
    this.objectUrlPendiente = this.logoPreviewUrl();
    this.logoUploading.set(true);

    const expositorId = this.standToEdit()?.id;
    const request = expositorId
      ? this.expositoresService.uploadExpositorLogo(expositorId, file)
      : this.expositoresService.uploadExpositorLogoSinAsignar(file);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.logoUploading.set(false);
        this.logoPath.set(expositorId ? (res.data?.logo ?? null) : (res.data?.url ?? null));

        if (!this.logoPath()) {
          this.logoError.set('No se pudo obtener la URL del logo converted.');
          this.revokeObjectUrl();
          this.logoPreviewUrl.set(null);
        }
      },
      error: (err) => {
        this.logoUploading.set(false);
        this.revokeObjectUrl();
        this.logoPreviewUrl.set(null);
        this.logoError.set(err?.error?.message || 'No se pudo subir el logo del expositor.');
        this.resetFileInput();
      }
    });
  }

  /** Quita el logo (se envía `logo: null` al guardar y el backend borra el archivo). */
  public removeLogo(): void {
    this.revokeObjectUrl();
    this.logoPreviewUrl.set(null);
    this.logoPath.set(null);
    this.logoError.set(null);
    this.resetFileInput();
  }

  public onLogoPreviewError(): void {
    this.logoError.set('El logo cargado no se pudo previsualizar.');
  }

  private resetLogo(logo: string | null): void {
    this.revokeObjectUrl();
    this.logoPreviewUrl.set(null);
    this.logoPath.set(logo && logo.trim() ? logo.trim() : null);
    this.logoError.set(null);
    this.logoUploading.set(false);
    this.resetFileInput();
  }

  private resetFileInput(): void {
    const input = this.logoInput()?.nativeElement;
    if (input) input.value = '';
  }

  private revokeObjectUrl(): void {
    if (!this.objectUrlPendiente) return;
    URL.revokeObjectURL(this.objectUrlPendiente);
    this.objectUrlPendiente = null;
  }

  public onSubmit(): void {
    if (this.selectedStandIds().length === 0) {
      this.standForm.get('stand')?.setErrors({ required: true });
      this.standForm.markAllAsTouched();
      return;
    }

    if (this.standForm.invalid) {
      this.standForm.markAllAsTouched();
      return;
    }

    if (this.logoUploading()) {
      this.logoError.set('Espera a que termine de subir el logo antes de guardar.');
      return;
    }

    const val = this.standForm.value;
    const standIds = this.selectedStandIds();
    const data: StandFormData = {
      id: this.standToEdit()?.id,
      name: val.name || '',
      stand: standIds.join(', '),
      standIds: standIds,
      category: val.category || 'comercio_servicios',
      subtitle: val.subtitle || '',
      origin: val.origin || 'Jujuy, Argentina',
      email: val.email?.trim() || '',
      description: val.description || '',
      logo: this.logoPath()
    };

    this.save.emit(data);
  }

  public togglePreview(): void {
    this.isPreviewOpen.update(v => !v);
  }

  public toggleSelector(): void {
    this.isStandSelectorOpen.update(v => !v);
  }

  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.standsSearch.set(target.value || '');
  }

  public formatCategory(category: string): string {
    return CATEGORY_LABELS[category] || category;
  }
}