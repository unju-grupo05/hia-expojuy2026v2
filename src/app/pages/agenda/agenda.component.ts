import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css'
})
export class AgendaComponent implements OnInit {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.bindWindowGlobals();
    }
  }

  private bindWindowGlobals(): void {
    const w = window as any;
    w.switchDayTab = this.switchDayTab.bind(this);
    w.openReminderModal = this.openReminderModal.bind(this);
    w.closeReminderModal = this.closeReminderModal.bind(this);
    w.submitReminder = this.submitReminder.bind(this);
  }

  switchDayTab(dayNum: number, event?: Event): void {
    document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active-day'));
    if (event && event.target) {
      const btn = (event.target as HTMLElement).closest('.day-tab');
      if (btn) btn.classList.add('active-day');
    }

    document.querySelectorAll('.day-content').forEach(c => c.classList.add('hidden'));
    const targetDay = document.getElementById('day-' + dayNum);
    if (targetDay) {
      targetDay.classList.remove('hidden');
      const hiddenCards = targetDay.querySelectorAll('.reveal-on-scroll');
      hiddenCards.forEach(c => c.classList.add('is-visible'));
    }
  }

  openReminderModal(title: string, time: string): void {
    const modal = document.getElementById('reminder-modal');
    const actTitle = document.getElementById('reminder-activity-title');
    const actTime = document.getElementById('reminder-activity-time');
    const success = document.getElementById('reminder-success');
    const form = document.getElementById('reminder-form');

    if (!modal) return;
    if (actTitle) actTitle.textContent = title;
    if (actTime) actTime.textContent = time;
    if (success) success.classList.add('hidden');
    if (form) form.classList.remove('hidden');

    modal.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }

  closeReminderModal(): void {
    const modal = document.getElementById('reminder-modal');
    if (modal) {
      modal.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }

  submitReminder(event: Event): void {
    event.preventDefault();
    const form = document.getElementById('reminder-form');
    const success = document.getElementById('reminder-success');
    if (form) form.classList.add('hidden');
    if (success) success.classList.remove('hidden');
    setTimeout(() => {
      this.closeReminderModal();
    }, 2400);
  }
}