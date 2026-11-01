import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { BrandFooterComponent } from '../../brand-footer.component';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, BrandFooterComponent],
  template: `
    <main class="shell home">
      <section class="workspace">
        <a class="brand-lockup" href="/" aria-label="ScreenGrando">
          <img src="/ScreenGrandoLogo.png" alt="ScreenGrando" />
        </a>

        <div class="page-heading">
          <h1>Criar sala de transmissão</h1>
          <p class="sub">Configure os detalhes e compartilhe sua tela com a equipe.</p>
        </div>

        <form class="create-card" (ngSubmit)="create()">
          <h2>Detalhes da sala</h2>
          <label class="field">
            <span>Assunto</span>
            <input
              name="title"
              [(ngModel)]="title"
              maxlength="100"
              placeholder="Ex.: Reunião de equipe"
              required
            />
          </label>
          <label class="pin-toggle">
            <input name="pinEnabled" type="checkbox" [(ngModel)]="pinEnabled" />
            <span>Exigir PIN para entrar</span>
          </label>
          @if (pinEnabled) {
            <label class="field pin-field">
              <span>PIN da sala</span>
              <input
                name="pin"
                [(ngModel)]="pin"
                type="password"
                inputmode="numeric"
                pattern="[0-9]{4,12}"
                minlength="4"
                maxlength="12"
                placeholder="4 a 12 dígitos"
                [required]="pinEnabled"
              />
            </label>
            <p class="pin-help">Envie o PIN aos espectadores junto com o link.</p>
          }
          <button class="btn primary create" [disabled]="busy()">
            {{ busy() ? 'Criando sala…' : 'Criar sala' }}
            <span aria-hidden="true">→</span>
          </button>
          <a class="btn join-link" routerLink="/join">
            Entrar em uma sala com código
            <span aria-hidden="true">→</span>
          </a>
        </form>
      </section>
      <sg-brand-footer />
    </main>
  `,
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  private readonly router = inject(Router);

  private readonly toast = inject(ToastService);

  readonly busy = signal(false);

  title = '';

  pinEnabled = false;

  pin = '';

  create(): void {
    if (this.busy()) return;

    if (!this.title.trim()) {
      this.toast.show('Informe o assunto da sala.', 'warning');

      return;
    }

    if (this.pinEnabled && !/^\d{4,12}$/.test(this.pin)) {
      this.toast.show('O PIN deve ter de 4 a 12 dígitos.', 'warning');

      return;
    }

    this.busy.set(true);

    this.api.create(this.title.trim(), this.pinEnabled ? this.pin : null).subscribe({
      next: (session) => {
        sessionStorage.setItem(`screengrando.publisher.${session.code}`, session.publisherSecret);

        void this.router.navigate(['/share', session.code]);
      },
      error: (error) => {
        const detail = (error as HttpErrorResponse).error?.detail;

        this.toast.show(
          detail ?? 'Não foi possível criar a sala. Confira se o servidor está ativo.',
          'error',
        );

        this.busy.set(false);
      },
    });
  }
}
