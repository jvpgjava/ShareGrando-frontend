import { Component, ElementRef, HostListener, ViewChild, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'sg-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (toast.message()) {
      <div
        class="dialog-backdrop"
        role="presentation"
        (click)="toast.hide()"
        (keydown.escape)="toast.hide()"
      >
        <section
          class="dialog-panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="notice-title"
          aria-describedby="notice-message"
          (click)="$event.stopPropagation()"
        >
          <div class="dialog-body">
            <div class="dialog-heading">
              <h2 class="dialog-title" id="notice-title">
                @switch (toast.kind()) {
                  @case ('success') {
                    Tudo certo
                  }
                  @case ('warning') {
                    Atenção
                  }
                  @case ('error') {
                    Não foi possível concluir
                  }
                  @default {
                    Aviso
                  }
                }
              </h2>
            </div>
            <p class="dialog-message" id="notice-message">{{ toast.message() }}</p>
            <div class="dialog-actions">
              <button
                #noticeAction
                class="dialog-button dialog-button-primary"
                type="button"
                (click)="toast.hide()"
              >
                OK
              </button>
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class AppComponent {
  readonly toast = inject(ToastService);

  @ViewChild('noticeAction') private noticeAction?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;

  private readonly focusNotice = effect(() => {
    if (typeof document === 'undefined') return;

    if (this.toast.message()) {
      this.previousFocus ??= document.activeElement as HTMLElement;
      setTimeout(() => {
        if (this.toast.message()) this.noticeAction?.nativeElement.focus();
      });
    } else if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.toast.message()) this.toast.hide();
  }
}
