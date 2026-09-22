import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  status: 'published' | 'draft';
  imageUrl: string;
  body: string;
}

export type PostFormData = Omit<Post, 'id' | 'date'> & { id?: string };

@Component({
  selector: 'app-post-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './post-form-modal.component.html'
})
export class PostFormModalComponent {
  private fb = inject(FormBuilder);

  public isOpen = input<boolean>(false);
  public postToEdit = input<Post | null>(null);

  public save = output<PostFormData>();
  public close = output<void>();

  public postForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    slug: ['', [Validators.required]],
    category: ['Minería y Litio', [Validators.required]],
    status: ['published' as 'published' | 'draft', [Validators.required]],
    imageUrl: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', [Validators.required]],
    body: ['', [Validators.required, Validators.minLength(20)]]
  });

  constructor() {
    effect(() => {
      const post = this.postToEdit();
      if (post) {
        this.postForm.patchValue({
          title: post.title,
          slug: post.slug,
          category: post.category,
          status: post.status,
          imageUrl: post.imageUrl,
          body: post.body
        });
      } else {
        this.postForm.reset({
          title: '',
          slug: '',
          category: 'Minería y Litio',
          status: 'published',
          imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
          body: ''
        });
      }
    });
  }

  public onTitleChange(): void {
    const currentSlug = this.postForm.get('slug')?.value;
    const title = this.postForm.get('title')?.value;
    // Autogenerar slug si está vacío o si es una creación nueva
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

  public onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    const formVal = this.postForm.value;
    const data: PostFormData = {
      id: this.postToEdit()?.id,
      title: formVal.title || '',
      slug: formVal.slug || this.slugify(formVal.title || ''),
      category: formVal.category || 'General',
      status: (formVal.status as 'published' | 'draft') || 'draft',
      imageUrl: formVal.imageUrl || '',
      body: formVal.body || ''
    };

    this.save.emit(data);
  }
}
