import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Post, PostFormData, PostFormModalComponent } from './post-form-modal.component';
import { PostCardComponent } from '../../../components/shared/post-card/post-card.component';
import { ApiNoticiasService } from '../../../services/apiNoticias.service';
import { ApiMediaService } from '../../../services/apiMedia.service';
import { NoticiaDTO, NoticiaPayload } from '../../../models/noticia.model';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PostFormModalComponent, PostCardComponent],
  templateUrl: './posts-list.component.html'
})
export class PostsListComponent {
  public posts = signal<Post[]>([]);
  public loading = signal<boolean>(false);
  public loadError = signal<boolean>(false);

  public searchTerm = signal<string>('');
  public selectedStatusFilter = signal<'all' | 'published' | 'draft'>('all');
  public isModalOpen = signal<boolean>(false);
  public editingPost = signal<Post | null>(null);
  public previewingPost = signal<Post | null>(null);
  public toastMessage = signal<string | null>(null);
  public toastError = signal<boolean>(false);
  public saving = signal<boolean>(false);

  constructor(
    private apiNoticias: ApiNoticiasService,
    private apiMedia: ApiMediaService
  ) {}

  ngOnInit(): void {
    this.cargarNoticias();
  }

  cargarNoticias(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.apiNoticias.getNoticias(true).subscribe({
      next: (res) => {
        // `NoticiaDTO` es el contrato de la API (campos en espanol). `Post` es el
        // view model del panel: traduce los nombres y decide el `status`.
        const items: NoticiaDTO[] = res.data ?? [];
        const mapped: Post[] = items.map((n) => ({
          id: String(n.id),
          title: n.titulo || '',
          slug: n.slug || '',
          category: n.categoria || 'General',
          date: n.fecha || '',
          status: n.vigente === false ? 'draft' : 'published',
          displaySize: 'small',
          imageUrl: this.apiMedia.normalizeImageUrl(n.imagen || ''),
          body: n.descripcion || ''
        }));
        this.posts.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(true);
        this.showToast('No se pudieron cargar las publicaciones desde el servidor.', true);
        console.error('Error al cargar noticias:', err);
      }
    });
  }

  public filteredPosts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.selectedStatusFilter();

    return this.posts().filter(post => {
      const matchesTerm = !term ||
        post.title.toLowerCase().includes(term) ||
        post.category.toLowerCase().includes(term) ||
        post.slug.toLowerCase().includes(term);

      const matchesStatus = filter === 'all' || post.status === filter;

      return matchesTerm && matchesStatus;
    });
  });

  public formatFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    const date = new Date(`${fecha}T00:00:00`);
    if (isNaN(date.getTime())) return fecha;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  public openCreateModal(): void {
    this.editingPost.set(null);
    this.isModalOpen.set(true);
  }

  public openEditModal(post: Post): void {
    this.editingPost.set(post);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    this.editingPost.set(null);
  }

  public openPreview(post: Post): void {
    this.previewingPost.set(post);
  }

  public closePreview(): void {
    this.previewingPost.set(null);
  }

  public savePost(formData: PostFormData): void {
    if (this.saving()) return;
    this.saving.set(true);

    const payload: NoticiaPayload = {
      titulo: formData.title,
      slug: formData.slug,
      categoria: formData.category,
      descripcion: formData.body,
      imagen: formData.imageUrl || null,
      fecha: formData.date,
      vigente: formData.status === 'published'
    };

    if (formData.id) {
      this.apiNoticias.putModificarNoticias(formData.id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.showToast('Publicación actualizada correctamente.');
          this.cargarNoticias();
        },
        error: (err) => {
          this.saving.set(false);
          console.error('Error al actualizar noticia:', err);
          this.showToast(err?.error?.message || 'No se pudo actualizar la publicación.', true);
        }
      });
    } else {
      this.apiNoticias.postNoticias(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.showToast('Nueva publicación creada y guardada con éxito.');
          this.cargarNoticias();
        },
        error: (err) => {
          this.saving.set(false);
          console.error('Error al crear noticia:', err);
          this.showToast(err?.error?.message || 'No se pudo crear la publicación.', true);
        }
      });
    }
  }

  public deletePost(id: string): void {
    const postToDelete = this.posts().find(p => p.id === id);
    if (!postToDelete) return;

    if (confirm(`¿Estás seguro de eliminar la publicación "${postToDelete.title}"?`)) {
      this.apiNoticias.deleteNoticias(id).subscribe({
        next: () => {
          this.showToast('Publicación eliminada correctamente.');
          this.cargarNoticias();
        },
        error: (err) => {
          console.error('Error al eliminar noticia:', err);
          this.showToast('No se pudo eliminar la publicación.', true);
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