import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  public isMobileSidebarOpen = signal<boolean>(false);

  public toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(v => !v);
  }

  public closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }
}
