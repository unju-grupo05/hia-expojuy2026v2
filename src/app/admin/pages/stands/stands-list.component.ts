import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stand, StandFormData, StandFormModalComponent } from './stand-form-modal.component';

@Component({
  selector: 'app-stands-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StandFormModalComponent],
  templateUrl: './stands-list.component.html'
})
export class StandsListComponent {
  public stands = signal<Stand[]>([
    {
      id: 'stand-1',
      name: 'Sales de Jujuy & Allkem',
      sector: 'Minería & Litio',
      standNumber: 'A-01',
      origin: 'Olaroz, Jujuy',
      description: 'Extracción, refinamiento y exportación de carbonato de litio grado batería para electromovilidad.',
      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80',
      isVisible: true
    },
    {
      id: 'stand-2',
      name: 'Parque Solar Cauchari S.E.',
      sector: 'Energías Renovables',
      standNumber: 'B-04',
      origin: 'Susques, Jujuy',
      description: 'Generación fotovoltaica a 4000 msnm con más de 300 MW y proyectos de almacenamiento en baterías BESS.',
      logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      isVisible: true
    },
    {
      id: 'stand-3',
      name: 'Ledesma Bioenergía & Azúcar',
      sector: 'Agroindustria',
      standNumber: 'C-10',
      origin: 'Libertador Gral. San Martín',
      description: 'Producción agroindustrial sustentable, bioetanol, papel de caña de azúcar y frutas de exportación.',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
      isVisible: true
    },
    {
      id: 'stand-4',
      name: 'Puerto Seco Perico & Zona Franca',
      sector: 'Logística & Puertos',
      standNumber: 'D-02',
      origin: 'Perico, Jujuy',
      description: 'Centro multimodal de transferencia de cargas y aduana integrada sobre el Corredor Bioceánico.',
      logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      isVisible: true
    },
    {
      id: 'stand-5',
      name: 'NOA Tech & Robótica Andina',
      sector: 'Tecnología & IA',
      standNumber: 'E-08',
      origin: 'Palpalá, Jujuy',
      description: 'Sistemas embebidos de telemetría minera, gemelos digitales y visión artificial para control de plantas.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      isVisible: false
    }
  ]);

  public searchTerm = signal<string>('');
  public selectedSectorFilter = signal<string>('all');
  public isModalOpen = signal<boolean>(false);
  public editingStand = signal<Stand | null>(null);
  public previewingStand = signal<Stand | null>(null);
  public toastMessage = signal<string | null>(null);

  public filteredStands = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const sector = this.selectedSectorFilter();

    return this.stands().filter(stand => {
      const matchesTerm = !term ||
        stand.name.toLowerCase().includes(term) ||
        stand.standNumber.toLowerCase().includes(term) ||
        stand.sector.toLowerCase().includes(term);

      const matchesSector = sector === 'all' || stand.sector === sector;

      return matchesTerm && matchesSector;
    });
  });

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

  // Toggle reactivo en línea para visibilidad instantánea
  public toggleVisibility(stand: Stand): void {
    this.stands.update(list => list.map(s => {
      if (s.id === stand.id) {
        const nextState = !s.isVisible;
        return { ...s, isVisible: nextState };
      }
      return s;
    }));

    const nextState = !stand.isVisible;
    this.showToast(`Stand "${stand.name}" ahora está ${nextState ? 'visible' : 'oculto'} en la landing.`);
  }

  public saveStand(formData: StandFormData): void {
    if (formData.id) {
      this.stands.update(list => list.map(s => {
        if (s.id === formData.id) {
          return {
            ...s,
            ...formData,
            id: s.id
          };
        }
        return s;
      }));
      this.showToast('Stand de expositor actualizado correctamente.');
    } else {
      const newStand: Stand = {
        id: 'stand-' + Date.now(),
        name: formData.name,
        sector: formData.sector,
        standNumber: formData.standNumber,
        origin: formData.origin,
        description: formData.description,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.bannerUrl,
        isVisible: formData.isVisible
      };
      this.stands.update(list => [newStand, ...list]);
      this.showToast('Nuevo stand registrado exitosamente.');
    }

    this.closeModal();
  }

  public deleteStand(id: string): void {
    const standToDelete = this.stands().find(s => s.id === id);
    if (!standToDelete) return;

    if (confirm(`¿Eliminar el stand "${standToDelete.name}" (${standToDelete.standNumber})?`)) {
      this.stands.update(list => list.filter(s => s.id !== id));
      this.showToast('Stand eliminado del catálogo.');
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
