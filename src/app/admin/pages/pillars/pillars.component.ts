import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pillar, PillarFormData, PillarFormModalComponent } from './pillar-form-modal.component';

@Component({
  selector: 'app-pillars',
  standalone: true,
  imports: [CommonModule, FormsModule, PillarFormModalComponent],
  templateUrl: './pillars.component.html'
})
export class PillarsComponent {
  public pillars = signal<Pillar[]>([
    {
      id: 'pillar-1',
      title: 'Minería & Litio Sustentable',
      description: 'Industrialización del litio, estándares ESG, electromovilidad y desarrollo de proveedores locales de alta competitividad.',
      iconSvgName: 'science',
      order: 1
    },
    {
      id: 'pillar-2',
      title: 'Energías Renovables & Hidrógeno',
      description: 'El potencial solar de la Puna, Parque Cauchari, almacenamiento BESS y proyectos de descarbonización productiva.',
      iconSvgName: 'solar_power',
      order: 2
    },
    {
      id: 'pillar-3',
      title: 'Corredor Bioceánico & Logística',
      description: 'Conexión vial y ferroviaria entre el Atlántico y los puertos de Chile y Brasil para potenciar la exportación regional.',
      iconSvgName: 'rv_hookup',
      order: 3
    },
    {
      id: 'pillar-4',
      title: 'Agrotecnología & Bioeconomía',
      description: 'Sistemas de riego inteligente, bioplásticos, azúcar, bioetanol y productos andinos con denominación de origen.',
      iconSvgName: 'agriculture',
      order: 4
    },
    {
      id: 'pillar-5',
      title: 'Innovación, Startups & IA',
      description: 'Transformación digital aplicada a cadenas productivas, telemetría y polos científicos de alta tecnología en Jujuy.',
      iconSvgName: 'lightbulb',
      order: 5
    },
    {
      id: 'pillar-6',
      title: 'Rondas de Negocios & Cooperación',
      description: 'Vinculación directa entre inversores internacionales, cámaras empresariales y PyMEs exportadoras.',
      iconSvgName: 'handshake',
      order: 6
    }
  ]);

  public viewMode = signal<'grid' | 'table'>('grid');
  public searchTerm = signal<string>('');
  public isModalOpen = signal<boolean>(false);
  public editingPillar = signal<Pillar | null>(null);
  public toastMessage = signal<string | null>(null);

  public sortedPillars = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.pillars().filter(p =>
      !term ||
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );

    return [...list].sort((a, b) => a.order - b.order);
  });

  public openCreateModal(): void {
    this.editingPillar.set(null);
    this.isModalOpen.set(true);
  }

  public openEditModal(pillar: Pillar): void {
    this.editingPillar.set(pillar);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
    this.editingPillar.set(null);
  }

  public savePillar(formData: PillarFormData): void {
    if (formData.id) {
      this.pillars.update(list => list.map(p => {
        if (p.id === formData.id) {
          return {
            ...p,
            ...formData,
            id: p.id
          };
        }
        return p;
      }));
      this.showToast('Pilar estratégico actualizado con éxito.');
    } else {
      const newPillar: Pillar = {
        id: 'pillar-' + Date.now(),
        title: formData.title,
        description: formData.description,
        iconSvgName: formData.iconSvgName,
        order: formData.order
      };
      this.pillars.update(list => [...list, newPillar]);
      this.showToast('Nuevo pilar estratégico añadido al evento.');
    }

    this.closeModal();
  }

  public deletePillar(id: string): void {
    const pillarToDelete = this.pillars().find(p => p.id === id);
    if (!pillarToDelete) return;

    if (confirm(`¿Eliminar el pilar "${pillarToDelete.title}"?`)) {
      this.pillars.update(list => list.filter(p => p.id !== id));
      this.showToast('Pilar eliminado correctamente.');
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
