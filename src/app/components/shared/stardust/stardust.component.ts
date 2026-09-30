import { AfterViewInit, Component, ElementRef, HostBinding, Inject, Input, OnChanges, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface StardustParticle {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  baseAlpha: number;
  pulse: number;
}

@Component({
  selector: 'app-stardust',
  standalone: true,
  imports: [],
  template: `<canvas #stardustCanvas></canvas>`,
  styleUrls: ['./stardust.component.css']
})
export class StardustComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('stardustCanvas') private stardustCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() active = true;

  @HostBinding('class.stardust-off')
  public get isOff(): boolean {
    return !this.active;
  }

  private ctx: CanvasRenderingContext2D | null = null;
  private particles: StardustParticle[] = [];
  private width = 0;
  private height = 0;
  private animFrameId: number | null = null;
  private scrollSpeed = 0;
  private lastScrollY = 0;
  private running = false;

  private readonly particleCount = 65;
  private readonly colors = ['#00C2D1', '#9D4EDD', '#5E3A8C', '#B299D3', '#FFFFFF'];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private onResize = (): void => {
    if (!this.stardustCanvas?.nativeElement) return;
    this.width = this.stardustCanvas.nativeElement.width = window.innerWidth;
    this.height = this.stardustCanvas.nativeElement.height = window.innerHeight;
  };

  private onScroll = (): void => {
    const currentY = window.scrollY;
    this.scrollSpeed = Math.abs(currentY - this.lastScrollY) * 0.08;
    this.lastScrollY = currentY;
  };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.stardustCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    const startStardust = () => {
      if (!this.stardustCanvas?.nativeElement) return;
      this.onResize();
      window.addEventListener('resize', this.onResize);
      window.addEventListener('scroll', this.onScroll, { passive: true });
      if (this.active) {
        this.start();
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startStardust, { timeout: 2000 });
    } else {
      setTimeout(startStardust, 250);
    }
  }

  ngOnChanges(): void {
    if (!this.ctx || !this.stardustCanvas?.nativeElement) return;
    if (this.active) {
      this.start();
    } else {
      this.stop();
    }
  }

  ngOnDestroy(): void {
    this.stop();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  private start(): void {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.seedParticles();
    const animate = () => {
      if (!this.running || !this.ctx) return;
      this.drawFrame();
      this.animFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  private seedParticles(): void {
    const particles: StardustParticle[] = [];
    for (let i = 0; i < this.particleCount; i++) {
      particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.8 + 0.6,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.4,
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI
      });
    }
    this.particles = particles;
  }

  private drawFrame(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    this.scrollSpeed *= 0.94;

    this.particles.forEach(p => {
      p.x += p.vx + (p.vx > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.4;
      p.y += p.vy - this.scrollSpeed * 0.5;
      p.pulse += 0.025;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      const currentAlpha = p.baseAlpha + Math.sin(p.pulse) * 0.2;
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
      ctx.fillStyle = p.color;
      ctx.shadowBlur = p.radius * 4;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}