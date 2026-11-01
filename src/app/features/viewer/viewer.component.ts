import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PublicSession } from '../../core/contracts';
import { LivekitService } from '../../livekit/livekit.service';
import { ToastService } from '../../core/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BrandFooterComponent } from '../../brand-footer.component';
@Component({
  standalone: true,
  imports: [FormsModule, BrandFooterComponent],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
})
export class ViewerComponent implements OnInit, OnDestroy {
  @ViewChild('video') private videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('audioHost') private audioRef?: ElementRef<HTMLElement>;
  @ViewChild('player') private playerRef?: ElementRef<HTMLElement>;
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly lk = inject(LivekitService);
  session = signal<PublicSession | null>(null);
  loading = signal(true);
  ended = signal(false);
  joined = signal(false);
  busy = signal(false);
  reconnecting = signal(false);
  controls = signal(true);
  volume = signal(0.8);
  muted = signal(true);
  displayName = '';
  pin = '';
  private code = '';
  private hideTimer?: number;
  private endedWatch = effect(() => {
    if (this.joined() && this.lk.presenterEnded()) {
      this.ended.set(true);
      void this.lk.disconnect();
    }
  });
  ngOnInit() {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    const navigationState = window.history.state as { roomPin?: unknown; [key: string]: unknown };
    if (typeof navigationState.roomPin === 'string') {
      this.pin = navigationState.roomPin;
      const remainingState = { ...navigationState };
      delete remainingState.roomPin;
      window.history.replaceState(remainingState, '');
    }
    this.api.session(this.code).subscribe({
      next: (s) => {
        this.session.set(s);
        this.loading.set(false);
        if (s.status === 'ENDED') this.ended.set(true);
      },
      error: (e) => {
        this.loading.set(false);
        this.ended.set(true);
        this.toast.show(
          (e as HttpErrorResponse).error?.detail ?? 'Esta transmissão não está disponível.',
          'error',
        );
      },
    });
  }
  watch() {
    this.busy.set(true);
    this.joined.set(true);
    this.api
      .viewerToken(this.code, this.displayName.trim() || 'Convidado', this.pin.trim() || null)
      .subscribe({
        next: (t) => {
          const video = this.videoRef?.nativeElement,
            audio = this.audioRef?.nativeElement;
          if (!video || !audio) {
            this.toast.show('Não foi possível preparar o player.', 'error');
            this.busy.set(false);
            return;
          }
          this.lk
            .connectViewer(t.livekitUrl, t.token, video, audio)
            .then(() => {
              this.joined.set(true);
              this.busy.set(false);
              this.showControls();
            })
            .catch((e) => {
              this.toast.show((e as Error).message || 'Falha ao conectar à transmissão.', 'error');
              this.busy.set(false);
              this.joined.set(false);
            });
        },
        error: (e) => {
          this.toast.show(
            (e as HttpErrorResponse).error?.detail ?? 'Não foi possível entrar na transmissão.',
            'error',
          );
          this.busy.set(false);
          this.joined.set(false);
          if ((e as HttpErrorResponse).status === 410) this.ended.set(true);
        },
      });
  }
  async enableSound() {
    try {
      await this.lk.enableAudio();
      this.muted.set(false);
    } catch {
      this.toast.show('Toque novamente para permitir o áudio neste navegador.', 'warning');
    }
  }
  async toggleMute() {
    if (this.muted()) {
      await this.enableSound();
    } else {
      this.muted.set(true);
      this.lk.setMuted(true);
    }
  }
  setVolume(raw: string) {
    const v = Number(raw);
    this.volume.set(v);
    this.muted.set(v === 0);
    this.lk.setVolume(v);
  }
  setQuality(v: 'auto' | 'HIGH' | 'MEDIUM' | 'LOW') {
    this.lk.setQuality(v);
  }
  connectionLabel() {
    const s = this.lk.connectionState();
    return s === 'connected' ? 'Conectado' : s === 'reconnecting' ? 'Reconectando' : 'Desconectado';
  }
  showControls() {
    this.controls.set(true);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.controls.set(false), 3500);
  }
  async fullscreen() {
    const el = this.playerRef?.nativeElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (el?.requestFullscreen) await el.requestFullscreen();
    else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else {
      const video = this.videoRef?.nativeElement as
        | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        | undefined;
      video?.webkitEnterFullscreen?.();
    }
  }
  ngOnDestroy() {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    void this.lk.disconnect();
  }
}
