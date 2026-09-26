import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GaleriaApi } from '../../../services/apiGaleria.service';
import { GaleriaItem } from '../../../models/galeria.model';
import { ApiMediaService } from '../../../services/apiMedia.service';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size: string;
  dimensions: string;
  uploadedAt: string;
  titulo: string;
  descripcion: string;
  seccion: string;
  orden: number;
}

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-gallery.component.html'
})
export class MediaGalleryComponent implements OnInit {
  public images = signal<MediaItem[]>([]);

  public loading = signal(true);
  public loadError = signal(false);

  public searchTerm = signal<string>('');
  public copiedId = signal<string | null>(null);
  public toastMessage = signal<string | null>(null);
  public toastError = signal<boolean>(false);
  public uploading = signal(false);

  public editing = signal<MediaItem | null>(null);
  public saving = signal(false);

  constructor(
    private galeriaApi: GaleriaApi,
    private apiMedia: ApiMediaService
  ) {}

  ngOnInit(): void {
    this.cargarGaleria();
  }

  public filteredImages = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.images();
    return this.images().filter(img =>
      img.name.toLowerCase().includes(term) ||
      (img.descripcion && img.descripcion.toLowerCase().includes(term))
    );
  });

  public cargarGaleria(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.galeriaApi.getGaleria().subscribe({
      next: (res) => {
        const items: GaleriaItem[] = res.data ?? [];
        const mapped: MediaItem[] = items.map((g) => ({
          id: String(g.id),
          name: g.titulo || '',
          url: this.apiMedia.normalizeImageUrl(g.imagen || ''),
          size: g.imagen?.endsWith('.webp') ? 'WebP' : 'Original',
          dimensions: 'WebP (1920 max)',
          uploadedAt: g.createdAt ? String(g.createdAt).slice(0, 10) : '',
          titulo: g.titulo || '',
          descripcion: g.descripcion || '',
          seccion: g.seccion || '',
          orden: g.orden ?? 0
        }));

        this.images.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar la galería:', err);
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  private readonly maxUploadMb = 5;

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (file.size > this.maxUploadMb * 1024 * 1024) {
      this.showToast(`La imagen supera el máximo de ${this.maxUploadMb} MB permitido.`, true);
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.showToast('Subiendo y optimizando imagen a WebP...');

    this.apiMedia.uploadImage(file).subscribe({
      next: (res) => {
        const webpUrl = this.apiMedia.normalizeImageUrl(res.url);
        const maxOrden = this.images().reduce((max, img) => Math.max(max, img.orden), 0);

        this.galeriaApi.postGaleria({
          titulo: file.name.replace(/\.[^/.]+$/, ''),
          descripcion: '',
          imagen: webpUrl,
          seccion: 'General',
          orden: maxOrden + 1
        }).subscribe({
          next: () => {
            this.uploading.set(false);
            const sizeKb = Math.round(res.size / 1024);
            this.showToast(`Imagen convertida a WebP (${sizeKb} KB) y guardada con éxito.`);
            this.cargarGaleria();
            input.value = '';
          },
          error: (err) => {
            this.uploading.set(false);
            this.showToast(err?.error?.message || 'Error al registrar en la galería.', true);
            input.value = '';
          }
        });
      },
      error: (err) => {
        this.uploading.set(false);
        const msg = err?.error?.message || 'No se pudo procesar la imagen en el servidor.';
        this.showToast(msg, true);
        input.value = '';
      }
    });
  }

  public copyUrl(image: MediaItem): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(image.url);
    }
    this.copiedId.set(image.id);
    setTimeout(() => {
      if (this.copiedId() === image.id) {
        this.copiedId.set(null);
      }
    }, 2000);
  }

  public openEdit(image: MediaItem): void {
    this.editing.set({ ...image });
  }

  public cancelEdit(): void {
    this.editing.set(null);
  }

  public saveEdit(): void {
    const edit = this.editing();
    if (!edit) return;

    if (!edit.titulo || !edit.titulo.trim()) {
      this.showToast('El título de la imagen es obligatorio.', true);
      return;
    }

    this.saving.set(true);

    this.galeriaApi.putModificarGaleria(edit.id, {
      titulo: edit.titulo,
      descripcion: edit.descripcion,
      imagen: edit.url,
      seccion: edit.seccion,
      orden: edit.orden ?? 0
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.showToast('Imagen actualizada correctamente.');
        this.cargarGaleria();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'No se pudo actualizar la imagen.', true);
      }
    });
  }

  public deleteImage(id: string): void {
    const img = this.images().find(i => i.id === id);
    if (!img) return;

    if (confirm(`¿Deseas eliminar la imagen "${img.name}" de la biblioteca?`)) {
      this.galeriaApi.deleteGaleria(id).subscribe({
        next: () => {
          this.showToast('Imagen eliminada de la biblioteca.');
          this.cargarGaleria();
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'No se pudo eliminar la imagen.', true);
        }
      });
    }
  }

  private showToast(msg: string, isError = false): void {
    this.toastMessage.set(msg);
    this.toastError.set(isError);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}