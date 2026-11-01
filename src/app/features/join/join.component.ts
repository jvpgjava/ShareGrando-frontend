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
        <a class="back-link" routerLink="/app">
          <span class="back-arrow" aria-hidden="true">←</span>
          <span>Voltar ao início</span>
        </a>
        <a class="brand-lockup" routerLink="/app" aria-label="ScreenGrando">
          <img src="/ScreenGrandoLogo.png" alt="ScreenGrando" />
        </a>

        <div class="page-heading">
          <h1>Entrar em uma sala</h1>
          <p class="sub">Informe o código recebido do apresentador e o PIN, se a sala exigir.</p>
        </div>

        <form class="create-card" (ngSubmit)="join()">
          <h2>Dados da sala</h2>
          <label class="field">
            <span>Código da sala</span>
            <input
              name="code"
              [(ngModel)]="code"
              maxlength="10"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="Ex.: D83A11BD30"
              required
            />
          </label>
          <label class="field">
            <span>
              PIN
              <span class="optional">(se necessário)</span>
            </span>
            <input
              name="pin"
              [(ngModel)]="pin"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              maxlength="12"
              placeholder="PIN da sala"
            />
          </label>
          <button class="btn primary create" [disabled]="busy()">
            {{ busy() ? 'Procurando sala…' : 'Continuar para a transmissão' }}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
      <sg-brand-footer />
    </main>
  `,
  styleUrls: ['../dashboard/dashboard.component.scss', './join.component.scss'],
})
export class JoinComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly busy = signal(false);
  code = '';
  pin = '';

  join(): void {
    if (this.busy()) return;

    const code = this.code.trim().toUpperCase();
    const pin = this.pin.trim();

    if (!/^[A-F0-9]{10}$/.test(code)) {
      this.toast.show('Informe um código de sala válido com 10 caracteres.', 'warning');
      return;
    }
    if (pin && !/^\d{4,12}$/.test(pin)) {
      this.toast.show('O PIN deve ter de 4 a 12 dígitos.', 'warning');
      return;
    }

    this.busy.set(true);
    this.api.session(code).subscribe({
      next: (session) => {
        this.busy.set(false);
        if (session.status === 'ENDED') {
          this.toast.show('Esta sala já foi encerrada.', 'warning');
          return;
        }
        if (session.pinProtected && !pin) {
          this.toast.show('Esta sala exige um PIN para entrar.', 'warning');
          return;
        }
        void this.router.navigate(['/w', session.code], {
          state: { roomPin: session.pinProtected ? pin : '' },
        });
      },
      error: (error) => {
        this.busy.set(false);
        const detail = (error as HttpErrorResponse).error?.detail;
        this.toast.show(detail ?? 'Sala não encontrada. Confira o código informado.', 'error');
      },
    });
  }
}
