import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Post, PostFormData, PostFormModalComponent } from './post-form-modal.component';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PostFormModalComponent],
  templateUrl: './posts-list.component.html'
})
export class PostsListComponent {
  public posts = signal<Post[]>([
    {
      id: 'post-1',
      title: 'Presentación Oficial del Corredor Bioceánico y Nuevos Acuerdos',
      slug: 'presentacion-oficial-corredor-bioceanico',
      category: 'Corredor Bioceánico',
      date: '2026-09-18',
      status: 'published',
      imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
      body: 'Representantes gubernamentales y cámaras de comercio de la región consolidaron la hoja de ruta para la integración logística y portuaria de Jujuy con el Pacífico.'
    },
    {
      id: 'post-2',
      title: 'Lanzamiento de la Ronda de Negocios Mineros y Litio 2026',
      slug: 'lanzamiento-ronda-negocios-mineros-litio',
      category: 'Minería y Litio',
      date: '2026-09-15',
      status: 'published',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      body: 'Más de 80 empresas internacionales confirmaron su presencia en los paneles de industrialización de litio, cadenas de valor y minería con bajas emisiones.'
    },
    {
      id: 'post-3',
      title: 'Protocolos de Acreditación Internacional para Expositores',
      slug: 'protocolos-acreditacion-internacional',
      category: 'Institucional',
      date: '2026-09-12',
      status: 'draft',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
      body: 'Guía detallada con la documentación aduanera requerida para stands del exterior y el ingreso de maquinaria pesada al predio ferial.'
    },
    {
      id: 'post-4',
      title: 'Nuevas Tecnologías Verdes y Parques Solares aplicados al NOA',
      slug: 'tecnologias-verdes-parques-solares-noa',
      category: 'Energías Limpias',
      date: '2026-09-08',
      status: 'published',
      imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
      body: 'Exposición interactiva sobre la ampliación del parque solar Cauchari y nuevos modelos de microrredes para comunidades y empresas en la puna jujeña.'
    },
    {
      id: 'post-5',
      title: 'Agenda preliminar de Charlas Magistrales en Ciudad Cultural',
      slug: 'agenda-preliminar-charlas-ciudad-cultural',
      category: 'Innovación',
      date: '2026-09-02',
      status: 'draft',
      imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80',
      body: 'Cronograma estimado con oradores invitados, paneles temáticos simultáneos y sesiones de networking empresarial en el pabellón principal.'
    }
  ]);

  public searchTerm = signal<string>('');
  public selectedStatusFilter = signal<'all' | 'published' | 'draft'>('all');
  public isModalOpen = signal<boolean>(false);
  public editingPost = signal<Post | null>(null);
  public toastMessage = signal<string | null>(null);

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

  public savePost(formData: PostFormData): void {
    if (formData.id) {
      // Actualizar post existente
      this.posts.update(list => list.map(p => {
        if (p.id === formData.id) {
          return {
            ...p,
            ...formData,
            id: p.id,
            date: p.date
          };
        }
        return p;
      }));
      this.showToast('Publicación actualizada correctamente.');
    } else {
      // Crear nuevo post
      const newPost: Post = {
        id: 'post-' + Date.now(),
        title: formData.title,
        slug: formData.slug,
        category: formData.category,
        date: new Date().toISOString().split('T')[0],
        status: formData.status,
        imageUrl: formData.imageUrl,
        body: formData.body
      };
      this.posts.update(list => [newPost, ...list]);
      this.showToast('Nueva publicación creada y guardada con éxito.');
    }

    this.closeModal();
  }

  public deletePost(id: string): void {
    const postToDelete = this.posts().find(p => p.id === id);
    if (!postToDelete) return;

    if (confirm(`¿Estás seguro de eliminar la publicación "${postToDelete.title}"?`)) {
      this.posts.update(list => list.filter(p => p.id !== id));
      this.showToast('Publicación eliminada correctamente.');
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}
