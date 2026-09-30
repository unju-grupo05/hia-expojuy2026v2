import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import type { Masterplan3dScene } from './masterplan-3d-scene';
import { MasterplanDataService } from './masterplan-data.service';

export type MasterplanCameraMode = 'iso' | 'top' | 'entrance';

/**
 * Fachada perezosa del visualizador 3D.
 *
 * `UbicacionPredioHubComponent` registra este servicio en `providers`, asi que la
 * clase vive en el bundle inicial. Por eso la dependencia pesada (`three`,
 * `OrbitControls` y `gsap`) NO se importa aqui de forma estatica: se resuelve
 * con `import()` dentro de `init()`, es decir, unicamente cuando el canvas 3D
 * entra en pantalla. Asi `three` deja de formar parte de los chunks iniciales
 * que el navegador descarga y parsea antes de pintar.
 *
 * Los metodos son seguros de llamar antes de que la escena exista: los estados
 * pendientes (filtro, busqueda, pausa, resize) se reproducen en cuanto llega.
 */
@Injectable()
export class Masterplan3dService implements OnDestroy {
  private readonly dataService = inject(MasterplanDataService);
  private readonly ngZone = inject(NgZone);

  private scene: Masterplan3dScene | null = null;
  private pending: Promise<void> | null = null;
  private destroyed = false;
  private paused = false;
  private resizePending = false;
  /** Se incrementa en cada `destroy()` para invalidar cargas en vuelo. */
  private generation = 0;

  private pendingFilter: string | null = null;
  private pendingSearch: string | null = null;

  /** `true` mientras se descarga y monta la escena 3D. */
  readonly loading = signal(true);
  /** `true` si la carga fallo (WebGL no disponible, chunk bloqueado, etc.). */
  readonly loadError = signal(false);

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

        this.replayPendingState(scene);
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
    if (this.pendingSearch !== null) scene.applySearch(this.pendingSearch);
    if (this.resizePending) scene.handleResize();
    if (this.paused) scene.pauseLoop();
  }

  public applyFilter(rubro: string): void {
    this.pendingFilter = rubro;
    this.scene?.applyFilter(rubro);
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

  /**
   * Libera la escena y deja el servicio reutilizable. Es idempotente: la puede
   * llamar tanto `CanvasComponent` al destruirse como Angular al desmontar el
   * proveedor del hub.
   */
  public destroy(): void {
    this.generation++;
    this.scene?.destroy();
    this.scene = null;
    this.loading.set(false);
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy();
  }
}
