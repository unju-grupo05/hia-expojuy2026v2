import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pillar, PillarFormData, PillarFormModalComponent } from './pillar-form-modal.component';
import { EjesService } from '../../../services/ejes.service';
import { Eje, EjePayload } from '../../../models/eje.model';

@Component({
  selector: 'app-pillars',
  standalone: true,
  imports: [CommonModule, FormsModule, PillarFormModalComponent],
  templateUrl: './pillars.component.html'
})
export class PillarsComponent implements OnInit {
  private ejesService = inject(EjesService);

  public pillars = signal<Pillar[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public viewMode = signal<'grid' | 'table'>('grid');
  public searchTerm = signal<string>('');
  public isModalOpen = signal<boolean>(false);
  public editingPillar = signal<Pillar | null>(null);
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  public sortedPillars = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.pillars().filter(p =>
      !term ||
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );

    return [...list].sort((a, b) => a.order - b.order);
  });

  public ngOnInit(): void {
    this.cargarEjes();
  }

  private mapearEjeDesdeApi(api: Eje): Pillar {
    return {
      id: Number(api.id),
      title: api.nombre,
      description: api.descripcion,
      iconSvgName: api.icono || 'lightbulb',
      order: Number(api.orden) || 0
    };
  }

  private mapearEjeParaApi(data: PillarFormData): EjePayload {
    return {
      nombre: data.title,
      descripcion: data.description,
      icono: data.iconSvgName || 'lightbulb',
      orden: Number(data.order) || 1
    };
  }

  private cargarEjes(): void {
    this.isLoading.set(true);
    this.ejesService.getEjes().subscribe({
      next: (res) => {
        this.pillars.set((res.data ?? []).map((eje) => this.mapearEjeDesdeApi(eje)));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.pillars.set([]);
        this.isLoading.set(false);
        this.showToast(err?.error?.message || 'Error al cargar los ejes estratégicos.', 'error');
      }
    });
  }

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
    if (this.isSaving()) return;

    this.isSaving.set(true);
    const payload = this.mapearEjeParaApi(formData);

    const request = formData.id
      ? this.ejesService.putModificarEje(formData.id, payload)
      : this.ejesService.postEje(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.showToast(
          formData.id
            ? 'Pilar estratégico actualizado con éxito.'
            : 'Nuevo pilar estratégico añadido al evento.',
          'success'
        );
        this.cargarEjes();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showToast(err?.error?.message || 'No se pudo guardar el pilar. Revisa tu sesión.', 'error');
      }
    });
  }

  public deletePillar(id: number): void {
    const pillarToDelete = this.pillars().find(p => p.id === id);
    if (!pillarToDelete) return;

    if (confirm(`¿Eliminar el pilar "${pillarToDelete.title}"?`)) {
      this.ejesService.deleteEje(id).subscribe({
        next: () => {
          this.pillars.update(list => list.filter(p => p.id !== id));
          this.showToast('Pilar eliminado correctamente.', 'success');
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'No se pudo eliminar el pilar. Revisa tu sesión.', 'error');
        }
      });
    }
  }

  private showToast(msg: string, tipo: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(msg);
    this.toastType.set(tipo);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}