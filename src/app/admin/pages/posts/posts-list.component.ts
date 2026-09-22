import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Post, PostFormData, PostFormModalComponent } from './post-form-modal.component';
import { PostCardComponent } from '../../../components/shared/post-card/post-card.component';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PostFormModalComponent, PostCardComponent],
  templateUrl: './posts-list.component.html'
})
export class PostsListComponent {
  public posts = signal<Post[]>([
    {
      id: 'post-1',
      title: 'El Parque Solar Cauchari expondrá sus proyectos de expansión e hidrógeno verde en el Pabellón de Energías',
      slug: 'parque-solar-cauchari-expansion-hidrogeno',
      category: 'Energías Limpias',
      date: '02 Agosto 2026',
      status: 'published',
      displaySize: 'large',
      imageUrl: './Img/Cauchari.jpg',
      body: 'El Parque Solar Cauchari, el mayor de su tipo a gran altura del mundo, presentará en el Pabellón de Energías sus nuevas fases de expansión y la hoja de ruta para la producción de hidrógeno verde en la Puna.'
    },
    {
      id: 'post-2',
      title: 'Jujuy da inicio a su tradicional ExpoJuy en su edición 2026',
      slug: 'jujuy-da-inicio-expojuy-2026',
      category: 'Inauguración',
      date: '09 Octubre 2026',
      status: 'published',
      displaySize: 'small',
      imageUrl: './Img/ExpoJuy-1.webp',
      body: 'Se realizará en el predio de la Ciudad Cultural con la presencia de delegaciones internacionales y rondas de negocios estratégicas.'
    },
    {
      id: 'post-3',
      title: 'Cobertura técnica y streaming en directo durante la muestra internacional',
      slug: 'cobertura-tecnica-streaming-directo',
      category: 'En vivo 🎙️',
      date: '10 Octubre 2026',
      status: 'published',
      displaySize: 'small',
      imageUrl: './Img/Expojuy-8.webp',
      body: 'Transmisión exclusiva minuto a minuto con entrevistas a líderes de industria, paneles y conferencias en vivo.'
    },
    {
      id: 'post-4',
      title: 'Avanzan los acuerdos estratégicos del Corredor Bioceánico',
      slug: 'acuerdos-estrategicos-corredor-bioceanico',
      category: 'Comercio Exterior',
      date: '11 Octubre 2026',
      status: 'published',
      displaySize: 'small',
      imageUrl: './Img/ExpoJuy-1.webp',
      body: 'Integración logística y portuaria de Jujuy con el Pacífico para potenciar exportaciones mineras y agroindustriales.'
    },
    {
      id: 'post-5',
      title: 'Presentarán el nuevo ecosistema de startups e innovación industrial',
      slug: 'ecosistema-startups-innovacion-industrial',
      category: 'Tecnología',
      date: '12 Octubre 2026',
      status: 'draft',
      displaySize: 'small',
      imageUrl: './Img/Cultural.png',
      body: 'Espacio dedicado a incubadoras, soluciones de inteligencia artificial aplicada y robótica para el sector productivo.'
    }
  ]);

  public searchTerm = signal<string>('');
  public selectedStatusFilter = signal<'all' | 'published' | 'draft'>('all');
  public isModalOpen = signal<boolean>(false);
  public editingPost = signal<Post | null>(null);
  public previewingPost = signal<Post | null>(null);
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

  public openPreview(post: Post): void {
    this.previewingPost.set(post);
  }

  public closePreview(): void {
    this.previewingPost.set(null);
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
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        status: formData.status,
        displaySize: formData.displaySize,
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
