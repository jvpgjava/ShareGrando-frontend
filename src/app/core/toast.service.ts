import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');

  readonly kind = signal<ToastKind>('info');

  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, kind: ToastKind = 'info', duration = 0): void {
    this.message.set(message);

    this.kind.set(kind);

    if (this.timer) clearTimeout(this.timer);

    if (duration > 0) this.timer = setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    if (this.timer) clearTimeout(this.timer);

    this.timer = undefined;

    this.message.set('');
  }
}
