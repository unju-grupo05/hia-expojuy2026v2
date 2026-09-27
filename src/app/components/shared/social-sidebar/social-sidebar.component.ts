import { Component, EventEmitter, Inject, Output, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export const STARDUST_STORAGE_KEY = 'expojuy-stardust';

interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-social-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-sidebar.component.html',
  styleUrls: ['./social-sidebar.component.css']
})
export class SocialSidebarComponent implements OnInit {
  @Output() stardustToggle = new EventEmitter<boolean>();

  public isOpen = false;
  public stardustEnabled = true;

  public socials: SocialLink[] = [
    { label: 'Instagram', url: 'https://www.instagram.com/expojuy/', icon: 'bxl-instagram' },
    { label: 'Facebook', url: 'https://www.facebook.com/ExpoJuy/', icon: 'bxl-facebook-circle' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/company/expojuy', icon: 'bxl-linkedin' }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const saved = localStorage.getItem(STARDUST_STORAGE_KEY);
    this.stardustEnabled = saved === null ? true : saved === 'true';
  }

  public toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  public toggleStardust(): void {
    this.stardustEnabled = !this.stardustEnabled;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STARDUST_STORAGE_KEY, String(this.stardustEnabled));
    }
    this.stardustToggle.emit(this.stardustEnabled);
  }
}