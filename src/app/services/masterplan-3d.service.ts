import { Injectable, NgZone, OnDestroy, inject, signal, effect } from '@angular/core';
import type { Masterplan3dScene } from './masterplan-3d-scene';
import { MasterplanDataService } from './masterplan-data.service';
import { CommercialStatus } from '../components/models/stand.model';

export type MasterplanCameraMode = 'iso' | 'top' | 'entrance';


@Injectable()
export class Masterplan3dService implements OnDestroy {
  private readonly dataService = inject(MasterplanDataService);
  private readonly ngZone = inject(NgZone);

  private scene: Masterplan3dScene | null = null;
  private readonly sceneSignal = signal<Masterplan3dScene | null>(null);
  private pending: Promise<void> | null = null;
  private destroyed = false;
  private paused = false;
  private resizePending = false;
  /** Se incrementa en cada `destroy()` para invalidar cargas en vuelo. */
  private generation = 0;

  private pendingFilter: string | null = null;
  private pendingStatusFilter: (CommercialStatus | 'all') | null = null;
  private pendingSearch: string | null = null;

  /** `true` mientras se descarga y monta la escena 3D. */
  readonly loading = signal(true);
  /** `true` si la carga fallo (WebGL no disponible, chunk bloqueado, etc.). */
  readonly loadError = signal(false);

  constructor() {
    // Sincronización reactiva del catálogo de stands con Three.js fuera de Zone.js
    effect(() => {
      const scene = this.sceneSignal();
      const stands = this.dataService.stands();
      if (scene && stands.length > 0) {
        this.ngZone.runOutsideAngular(() => {
          scene.rebuildStands(stands);
        });
      }
    });

    // Sincronización reactiva del filtro de estado comercial
    effect(() => {
      const scene = this.sceneSignal();
      const status = this.dataService.filterStatus();
      if (scene) {
        this.ngZone.runOutsideAngular(() => {
          scene.applyStatusFilter(status);
        });
      }
    });
  }

  public get isReady(): boolean {
    return this.scene !== null;
  }

  /** Se mantiene como getter para no romper las plantillas que lo leen. */
  public get roofVisible(): boolean {
    return this.scene ? this.scene.roofVisible : true;
  }

  public init(
    canvas: HTMLCanvasElement,
    wrapper: HTMLElement,
    pinEl: HTMLElement,
    pinTextEl: HTMLElement
  ): void {
    if (this.destroyed || this.pending) return;

    const generation = this.generation;

    this.pending = (async () => {
      try {
        const { Masterplan3dScene } = await import('./masterplan-3d-scene');

        // El host pudo desmontarse (o pedir otro `destroy()`) mientras cargabamos.
        if (this.destroyed || generation !== this.generation) return;

        const scene = new Masterplan3dScene(this.dataService, this.ngZone);
        scene.init(canvas, wrapper, pinEl, pinTextEl);
        this.scene = scene;
        this.sceneSignal.set(scene);

        this.replayPendingState(scene);

        // Si los stands ya fueron resueltos por el backend o el cache, renderizarlos de inmediato
        const currentStands = this.dataService.stands().length > 0
          ? this.dataService.stands()
          : this.dataService.getStandsProcessed();
        if (currentStands.length > 0) {
          this.ngZone.runOutsideAngular(() => {
            scene.rebuildStands(currentStands);
          });
        }
      } catch (error) {
        console.error('[masterplan-3d] No se pudo inicializar la escena 3D', error);
        this.loadError.set(true);
      } finally {
        this.loading.set(false);
      }
    })();
  }

  private replayPendingState(scene: Masterplan3dScene): void {
    if (this.pendingFilter !== null) scene.applyFilter(this.pendingFilter);
    if (this.pendingStatusFilter !== null) scene.applyStatusFilter(this.pendingStatusFilter);
    if (this.pendingSearch !== null) scene.applySearch(this.pendingSearch);
    if (this.resizePending) scene.handleResize();
    if (this.paused) scene.pauseLoop();
  }

  public applyFilter(rubro: string): void {
    this.pendingFilter = rubro;
    this.scene?.applyFilter(rubro);
  }

  public applyStatusFilter(status: CommercialStatus | 'all'): void {
    this.pendingStatusFilter = status;
    this.scene?.applyStatusFilter(status);
  }

  public applySearch(query: string): void {
    this.pendingSearch = query;
    this.scene?.applySearch(query);
  }

  public handleResize(): void {
    if (!this.scene) {
      this.resizePending = true;
      return;
    }
    this.resizePending = false;
    this.scene.handleResize();
  }

  public setCameraView(mode: MasterplanCameraMode): void {
    this.scene?.setCameraView(mode);
  }

  public setRoofVisibility(visible: boolean, animate = true): void {
    this.scene?.setRoofVisibility(visible, animate);
  }

  public zoomIn(): void {
    this.scene?.zoomIn();
  }

  public zoomOut(): void {
    this.scene?.zoomOut();
  }

  public pauseLoop(): void {
    this.paused = true;
    this.scene?.pauseLoop();
  }

  public resumeLoop(): void {
    this.paused = false;
    this.scene?.resumeLoop();
  }

  public destroy(): void {
    this.generation++;
    this.scene?.destroy();
    this.scene = null;
    this.sceneSignal.set(null);
    this.loading.set(false);
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy();
  }
}
