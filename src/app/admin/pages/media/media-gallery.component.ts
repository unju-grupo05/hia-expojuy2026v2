import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size: string;
  dimensions: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-gallery.component.html'
})
export class MediaGalleryComponent {
  public images = signal<MediaItem[]>([
    {
      id: 'img-1',
      name: 'predio-ferial-ciudad-cultural.jpg',
      url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
      size: '482 KB',
      dimensions: '1920x1080',
      uploadedAt: '2026-09-18'
    },
    {
      id: 'img-2',
      name: 'parque-solar-cauchari-litio.jpg',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      size: '620 KB',
      dimensions: '1920x1280',
      uploadedAt: '2026-09-17'
    },
    {
      id: 'img-3',
      name: 'ronda-negocios-internacional.jpg',
      url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
      size: '340 KB',
      dimensions: '1600x900',
      uploadedAt: '2026-09-15'
    },
    {
      id: 'img-4',
      name: 'conferencia-corredor-bioceanico.jpg',
      url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
      size: '512 KB',
      dimensions: '1920x1080',
      uploadedAt: '2026-09-14'
    },
    {
      id: 'img-5',
      name: 'stand-mineria-sustentable.jpg',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      size: '410 KB',
      dimensions: '1280x853',
      uploadedAt: '2026-09-10'
    },
    {
      id: 'img-6',
      name: 'tecnologia-litio-baterias.jpg',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      size: '298 KB',
      dimensions: '1200x800',
      uploadedAt: '2026-09-08'
    },
    {
      id: 'img-7',
      name: 'pabellon-gourmet-jujuy.jpg',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      size: '540 KB',
      dimensions: '1920x1080',
      uploadedAt: '2026-09-05'
    },
    {
      id: 'img-8',
      name: 'expojuy-banner-institucional.jpg',
      url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
      size: '390 KB',
      dimensions: '1600x900',
      uploadedAt: '2026-09-01'
    }
  ]);

  public searchTerm = signal<string>('');
  public copiedId = signal<string | null>(null);
  public toastMessage = signal<string | null>(null);

  public filteredImages = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.images();
    return this.images().filter(img => img.name.toLowerCase().includes(term));
  });

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeFormatted = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        : Math.round(file.size / 1024) + ' KB';

      const newImage: MediaItem = {
        id: 'img-' + Date.now(),
        name: file.name,
        url: dataUrl,
        size: sizeFormatted,
        dimensions: 'Original',
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      this.images.update(current => [newImage, ...current]);
      this.showToast(`Imagen "${file.name}" subida exitosamente.`);
      input.value = '';
    };

    reader.readAsDataURL(file);
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

  public deleteImage(id: string): void {
    const img = this.images().find(i => i.id === id);
    if (!img) return;

    if (confirm(`¿Deseas eliminar la imagen "${img.name}" de la biblioteca?`)) {
      this.images.update(current => current.filter(i => i.id !== id));
      this.showToast('Imagen eliminada de la biblioteca.');
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}
