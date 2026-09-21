import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PortalLayoutComponent } from './components/layout/portal-layout/portal-layout.component';
import { StardustComponent } from './components/shared/stardust/stardust.component';
import { SocialSidebarComponent, STARDUST_STORAGE_KEY } from './components/shared/social-sidebar/social-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PortalLayoutComponent, StardustComponent, SocialSidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  public stardustEnabled = true;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STARDUST_STORAGE_KEY);
      this.stardustEnabled = saved === null ? true : saved === 'true';
    }
  }

  public onStardustToggle(enabled: boolean): void {
    this.stardustEnabled = enabled;
  }
}