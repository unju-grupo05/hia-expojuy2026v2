import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PortalLayoutComponent } from './components/layout/portal-layout/portal-layout.component';
import { StardustComponent } from './components/shared/stardust/stardust.component';
import { SocialSidebarComponent, STARDUST_STORAGE_KEY } from './components/shared/social-sidebar/social-sidebar.component';
import { SvgSpriteComponent } from './shared/components/svg-sprite/svg-sprite.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PortalLayoutComponent, StardustComponent, SocialSidebarComponent, SvgSpriteComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  public stardustEnabled = true;
  public isAdminRoute = signal<boolean>(false);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.stardustEnabled = true;
      try {
        localStorage.setItem(STARDUST_STORAGE_KEY, 'true');
      } catch {}
      this.isAdminRoute.set(window.location.pathname.startsWith('/admin'));
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin') || event.url.startsWith('/admin'));
      });
  }

  public onStardustToggle(enabled: boolean): void {
    this.stardustEnabled = enabled;
  }
}