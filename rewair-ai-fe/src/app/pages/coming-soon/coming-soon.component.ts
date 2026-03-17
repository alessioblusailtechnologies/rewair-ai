import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  template: `
    <div class="cs-wrapper">
      <div class="cs-card">
        <span class="cs-icon">&#9881;</span>
        <h2>Sezione in lavorazione</h2>
        <p>La sezione <strong>{{ sectionName }}</strong> è attualmente in fase di sviluppo e sarà disponibile a breve.</p>
      </div>
    </div>
  `,
  styles: [`
    .cs-wrapper {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - var(--topbar-height) - 80px);
    }
    .cs-card {
      text-align: center; padding: 48px 40px;
      background: var(--N0); border-radius: var(--r-lg);
      box-shadow: var(--shadow); max-width: 420px;
    }
    .cs-icon { font-size: 36px; display: block; margin-bottom: 16px; opacity: .35; }
    h2 { font-size: 18px; font-weight: 600; color: var(--N900); margin-bottom: 8px; }
    p { font-size: 14px; color: var(--N300); line-height: 1.5; }
    strong { color: var(--N500); }
  `]
})
export class ComingSoonComponent {
  sectionName = '';
  constructor(private route: ActivatedRoute) {
    const path = this.route.snapshot.url[0]?.path || '';
    this.sectionName = path === 'quality' ? 'Quality' : path === 'settings' ? 'Settings' : path;
  }
}
