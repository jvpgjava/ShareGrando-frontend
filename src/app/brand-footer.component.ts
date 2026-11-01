import { Component } from '@angular/core';

@Component({
  selector: 'sg-brand-footer',
  standalone: true,
  template: '<footer>&copy; {{ year }} Grando Consult. Todos os direitos reservados.</footer>',
  styles: [
    `
      :host {
        position: fixed;
        inset: auto 0 0;
        z-index: 20;
        display: flex;
        align-items: center;
        min-height: 44px;
        background: var(--navy);
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.72rem;
        line-height: 1.3;
        letter-spacing: 0.01em;
      }

      footer {
        width: 100%;
        padding: 12px clamp(16px, 4vw, 64px);
        text-align: center;
      }
    `,
  ],
})
export class BrandFooterComponent {
  readonly year = new Date().getFullYear();
}
