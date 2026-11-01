import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LivekitService, QualityPreset } from '../../livekit/livekit.service';
import { ToastService } from '../../core/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BrandFooterComponent } from '../../brand-footer.component';
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, BrandFooterComponent],
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent implements OnInit, OnDestroy {
  @ViewChild('cancelEndButton') private cancelEndButton?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly lk = inject(LivekitService);
  code = '';
  private publisherSecret = '';
  title = signal('Transmissão');
  viewerUrl = signal('');
  loading = signal(true);
  live = signal(false);
  ended = signal(false);
  confirmEnd = signal(false);
  busy = signal(false);
  copied = signal(false);
  codeCopied = signal(false);
  micMuted = signal(false);
  quality: QualityPreset = '1080p';
  fps = 30;
  systemAudio = true;
  microphone = true;
  private timer?: number;
  private started = Date.now();
  elapsed = signal('00:00');
  incompatible =
    /Firefox|Safari/i.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg/i.test(navigator.userAgent);
  private watch = effect(() => {
    if (this.live() && !this.lk.hasVideo()) this.live.set(false);
  });
  ngOnInit() {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    this.publisherSecret = sessionStorage.getItem(`screengrando.publisher.${this.code}`) ?? '';
    this.viewerUrl.set(`${location.origin}/w/${this.code}`);
    if (!this.publisherSecret) {
      this.toast.show(
        'A chave privada desta sala não está nesta aba. Crie uma nova sala para transmitir.',
        'error',
      );
      void this.router.navigateByUrl('/app');
      this.loading.set(false);
      return;
    }
    this.api.session(this.code).subscribe({
      next: (s) => {
        this.title.set(s.title);
        this.loading.set(false);
        if (s.status === 'ENDED') this.ended.set(true);
      },
      error: (e) => {
        this.fail(e, 'Não foi possível carregar os detalhes da sessão.');
        this.loading.set(false);
      },
    });
    this.timer = window.setInterval(() => {
      if (this.live()) {
        const n = Math.floor((Date.now() - this.started) / 1000);
        this.elapsed.set(
          `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`,
        );
      }
    }, 1000);
  }
  async start() {
    this.busy.set(true);
    try {
      const t = await new Promise<{ livekitUrl: string; token: string }>((resolve, reject) =>
        this.api
          .publisherToken(this.code, this.publisherSecret)
          .subscribe({ next: resolve, error: reject }),
      );
      await this.lk.connectPublisher(t.livekitUrl, t.token, {
        quality: this.quality,
        fps: this.fps,
        systemAudio: this.systemAudio,
        microphone: this.microphone,
      });
      await new Promise<void>((resolve, reject) =>
        this.api
          .markPublisherStarted(this.code, this.publisherSecret)
          .subscribe({ next: () => resolve(), error: reject }),
      );
      this.live.set(true);
      this.micMuted.set(!this.microphone);
      this.started = Date.now();
    } catch (e) {
      const err = e as Error;
      this.toast.show(
        err.name === 'NotAllowedError'
          ? 'A captura foi cancelada. Selecione uma tela e permita o compartilhamento.'
          : err.message || 'Não foi possível iniciar a transmissão.',
        err.name === 'NotAllowedError' ? 'warning' : 'error',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async toggleMic() {
    this.micMuted.set(!this.micMuted());
    await this.lk.setMicrophoneMuted(this.micMuted());
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.viewerUrl());
      this.copied.set(true);
      this.toast.show('Link copiado.', 'success');
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.toast.show('Não foi possível copiar o link.', 'error');
    }
  }
  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code);
      this.codeCopied.set(true);
      this.toast.show('Código copiado.', 'success');
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      this.toast.show('Não foi possível copiar o código.', 'error');
    }
  }
  endSession() {
    this.previousFocus = document.activeElement as HTMLElement;
    this.confirmEnd.set(true);
    setTimeout(() => {
      if (this.confirmEnd()) this.cancelEndButton?.nativeElement.focus();
    });
  }
  cancelEnd() {
    this.confirmEnd.set(false);
    this.restoreFocus();
  }
  confirmEndSession() {
    this.confirmEnd.set(false);
    this.restoreFocus();
    this.api.end(this.code, this.publisherSecret).subscribe({
      next: () => {
        sessionStorage.removeItem('screengrando.publisher.' + this.code);
        this.ended.set(true);
        this.live.set(false);
        void this.lk.disconnect();
      },
      error: (e) => this.fail(e, 'Não foi possível encerrar a sessão.'),
    });
  }
  back() {
    void this.router.navigateByUrl('/app');
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmEnd()) this.cancelEnd();
  }
  private restoreFocus(): void {
    this.previousFocus?.focus();
    this.previousFocus = null;
  }
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    void this.lk.disconnect();
  }
  private fail(e: unknown, fallback: string) {
    this.toast.show((e as HttpErrorResponse).error?.detail ?? fallback, 'error');
  }
}
