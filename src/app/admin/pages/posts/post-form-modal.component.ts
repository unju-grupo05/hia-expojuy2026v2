import { Component, effect, inject, input, output, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PostCardComponent, PostCardData } from '../../../components/shared/post-card/post-card.component';
import { ApiMediaService } from '../../../services/apiMedia.service';

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  status: 'published' | 'draft';
  imageUrl: string;
  body: string;
  displaySize: 'large' | 'small';
}

export type PostFormData = Omit<Post, 'id'> & { id?: string };

@Component({
  selector: 'app-post-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PostCardComponent],
  templateUrl: './post-form-modal.component.html'
})
export class PostFormModalComponent {
  private fb = inject(FormBuilder);
  private apiMedia = inject(ApiMediaService);

  public isOpen = input<boolean>(false);
  public postToEdit = input<Post | null>(null);

  public save = output<PostFormData>();
  public close = output<void>();

  public activeTab = signal<'form' | 'preview'>('form');
  public isUploadingImage = signal<boolean>(false);
  public uploadImageError = signal<string | null>(null);

  public postForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    slug: ['', [Validators.required]],
    category: ['Minería y Litio', [Validators.required]],
    fecha: [this.hoyIso(), [Validators.required]],
    status: ['published' as 'published' | 'draft', [Validators.required]],
    displaySize: ['small' as 'large' | 'small', [Validators.required]],
    imageUrl: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', [Validators.required]],
    body: ['', [Validators.required, Validators.minLength(20)]]
  });

  private hoyIso(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  // Preview dinámico en tiempo real
  public previewData = computed<PostCardData>(() => {
    const val = this.postForm.value;
    return {
      title: val.title?.trim() || 'Título de ejemplo para la publicación',
      category: val.category || 'Categoría',
      date: this.postToEdit()?.date || 'Fecha actual',
      imageUrl: val.imageUrl?.trim() || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      body: val.body?.trim() || 'Resumen descriptivo del contenido oficial de la noticia.',
      slug: val.slug || 'slug-ejemplo'
    };
  });

  constructor() {
    effect(() => {
      const post = this.postToEdit();
      if (post) {
        this.postForm.patchValue({
          title: post.title,
          slug: post.slug,
          category: post.category,
          fecha: (post.date || '').slice(0, 10),
          status: post.status,
          displaySize: post.displaySize || 'small',
          imageUrl: post.imageUrl,
          body: post.body
        });
      } else {
        this.postForm.reset({
          title: '',
          slug: '',
          category: 'Minería y Litio',
          fecha: this.hoyIso(),
          status: 'published',
          displaySize: 'small',
          imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
          body: ''
        });
      }
      this.activeTab.set('form');
    });
  }

  public onTitleChange(): void {
    const currentSlug = this.postForm.get('slug')?.value;
    const title = this.postForm.get('title')?.value;
    if (!this.postToEdit() && (!currentSlug || currentSlug === this.slugify(title || ''))) {
      this.postForm.patchValue({ slug: this.slugify(title || '') });
    }
  }

  public slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  public onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.uploadImageError.set('La imagen supera el límite de 5MB permitido.');
      input.value = '';
      return;
    }

    this.isUploadingImage.set(true);
    this.uploadImageError.set(null);

    this.apiMedia.uploadImage(file).subscribe({
      next: (res) => {
        const webpUrl = `${this.apiMedia.urlHost}${res.url}`;
        this.postForm.patchValue({ imageUrl: webpUrl });
        this.isUploadingImage.set(false);
        input.value = '';
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.uploadImageError.set(err?.error?.message || 'Error al procesar y convertir la imagen a WebP.');
        input.value = '';
      }
    });
  }

  public onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      this.activeTab.set('form');
      return;
    }

    const formVal = this.postForm.value;
    const data: PostFormData = {
      id: this.postToEdit()?.id,
      title: formVal.title || '',
      slug: formVal.slug || this.slugify(formVal.title || ''),
      category: formVal.category || 'General',
      date: formVal.fecha || this.hoyIso(),
      status: (formVal.status as 'published' | 'draft') || 'draft',
      displaySize: (formVal.displaySize as 'large' | 'small') || 'small',
      imageUrl: formVal.imageUrl || '',
      body: formVal.body || ''
    };

    this.save.emit(data);
  }
}
