import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stand, StandFormData, StandFormModalComponent, CATEGORY_OPTIONS } from './stand-form-modal.component';
import { ExpositoresService } from '../../../services/expositores.service';

@Component({
  selector: 'app-stands-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StandFormModalComponent],
  templateUrl: './stands-list.component.html'
})
export class StandsListComponent {
  public stands = signal<Stand[]>([]);
  public loading = signal<boolean>(false);
  public loadError = signal<boolean>(false);

  public searchTerm = signal<string>('');
  public selectedSectorFilter = signal<string>('all');
  public isModalOpen = signal<boolean>(false);
  public editingStand = signal<Stand | null>(null);
  public previewingStand = signal<Stand | null>(null);
  public toastMessage = signal<string | null>(null);
  public toastError = signal<boolean>(false);

  public categories = CATEGORY_OPTIONS;
  public categoryLabelMap: Record<string, string> = CATEGORY_OPTIONS.reduce((map, opt) => {
    map[opt.value] = opt.label;
    return map;
  }, {} as Record<string, string>);

  constructor(private expositoresService: ExpositoresService) {}

  ngOnInit(): void {
    this.cargarStands();
  }

  cargarStands(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.expositoresService.getExpositores({ page: 1, pageSize: 500 }).subscribe({
      next: (res) => {
        // El contrato de `/expositores` siempre envuelve la lista en `data`.
        // `Stand` exige textos no nulos, asi que el DTO se normaliza en el borde.
        this.stands.set((res.data?.items ?? []).map((expositor) => ({
          id: expositor.id,
          name: expositor.name,
          stand: expositor.stand || '',
          category: expositor.category,
          subtitle: expositor.subtitle ?? '',
          description: expositor.description ?? '',
          origin: expositor.origin ?? '',
          standIds: (expositor.stands || []).map(s => s.id)
        })));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(true);
        this.showToast('No se pudieron cargar los expositores desde el servidor.', true);
        console.error('Error al cargar expositores:', err);
      }
    });
  }

  public filteredStands = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedSectorFilter();

    return this.stands().filter(stand => {
      const matchesTerm = !term ||
        stand.name.toLowerCase().includes(term) ||
        stand.stand.toLowerCase().includes(term) ||
        stand.category.toLowerCase().includes(term);

      const matchesCategory = category === 'all' || stand.category === category;

      return matchesTerm && matchesCategory;
    });
  });

  public formatCategory(category: string): string {
    return this.categoryLabelMap[category] || category;
  }

  public openCreateModal(): void {
    this.editingStand.set(null);
    this.isModalOpen.set(true);
  }

  public openEditModal(stand: Stand): void {
    this.editingStand.set(stand);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    this.editingStand.set(null);
  }

  public openPreview(stand: Stand): void {
    this.previewingStand.set(stand);
  }

  public closePreview(): void {
    this.previewingStand.set(null);
  }

  public saveStand(formData: StandFormData): void {
    if (formData.id) {
      this.expositoresService.putModificarExpositor(formData.id, {
        name: formData.name,
        stand: formData.stand,
        standIds: formData.standIds,
        category: formData.category,
        subtitle: formData.subtitle,
        origin: formData.origin,
        description: formData.description
      }).subscribe({
        next: () => {
          this.showToast('Expositor actualizado correctamente.');
          this.cargarStands();
        },
        error: (err) => {
          console.error('Error al actualizar expositor:', err);
          const msg = err.error?.message || 'No se pudo actualizar el expositor.';
          this.showToast(msg, true);
        }
      });
    } else {
      this.expositoresService.postExpositor({
        name: formData.name,
        stand: formData.stand,
        standIds: formData.standIds,
        category: formData.category,
        subtitle: formData.subtitle,
        origin: formData.origin,
        description: formData.description
      }).subscribe({
        next: () => {
          this.showToast('Nuevo expositor registrado exitosamente.');
          this.cargarStands();
        },
        error: (err) => {
          console.error('Error al crear expositor:', err);
          const msg = err.error?.message || 'No se pudo registrar el expositor.';
          this.showToast(msg, true);
        }
      });
    }

    this.closeModal();
  }

  public deleteStand(id: string): void {
    const standToDelete = this.stands().find(s => s.id === id);
    if (!standToDelete) return;

    if (confirm(`¿Eliminar el expositor "${standToDelete.name}"?`)) {
      this.expositoresService.deleteExpositor(id).subscribe({
        next: () => {
          this.showToast('Expositor eliminado del catálogo.');
          this.cargarStands();
        },
        error: (err) => {
          console.error('Error al eliminar expositor:', err);
          this.showToast('No se pudo eliminar el expositor.', true);
        }
      });
    }
  }

  private showToast(msg: string, isError = false): void {
    this.toastMessage.set(msg);
    this.toastError.set(isError);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}