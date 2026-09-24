import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Masterplan3dService } from '../../../../../services/masterplan-3d.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('masterplanCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('map3dWrapper', { static: true }) wrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('floatingPin', { static: true }) pinRef!: ElementRef<HTMLElement>;
  @ViewChild('pinTagText', { static: true }) pinTextRef!: ElementRef<HTMLElement>;

  public activeCameraMode: 'iso' | 'top' | 'entrance' = 'iso';
  public isFullscreen = signal<boolean>(false);

  private fsChangeHandler = () => {
    const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
    this.isFullscreen.set(isFull);

    // Múltiples reintentos para asegurar que Three.js tome las dimensiones post-animación del browser
    setTimeout(() => this.threeService.handleResize(), 50);
    setTimeout(() => this.threeService.handleResize(), 200);
    setTimeout(() => this.threeService.handleResize(), 400);
  };

  constructor(public threeService: Masterplan3dService) {}

  ngAfterViewInit(): void {
    this.threeService.init(
      this.canvasRef.nativeElement,
      this.wrapperRef.nativeElement,
      this.pinRef.nativeElement,
      this.pinTextRef.nativeElement
    );

    document.addEventListener('fullscreenchange', this.fsChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fsChangeHandler);
  }

  public setCamera(mode: 'iso' | 'top' | 'entrance'): void {
    this.activeCameraMode = mode;
    this.threeService.setCameraView(mode);
  }

  public toggleRoof(): void {
    this.threeService.setRoofVisibility(!this.threeService.roofVisible);
  }

  public zoomIn(): void {
    this.threeService.zoomIn();
  }

  public zoomOut(): void {
    this.threeService.zoomOut();
  }

  public async toggleFullscreen(): Promise<void> {
    const elem = this.wrapperRef.nativeElement as any;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }

        // Forzar rotación horizontal en mobile estilo YouTube
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.warn('Error al activar fullscreen:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }

        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch (err) {
        console.warn('Error al salir de fullscreen:', err);
      }
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.fsChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fsChangeHandler);
    this.threeService.destroy();
  }
}
