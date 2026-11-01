import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  AudioPresets,
  ConnectionState,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  RoomOptions,
  Track,
  VideoQuality,
} from 'livekit-client';

export const LIVEKIT_ROOM_FACTORY = new InjectionToken<(options?: RoomOptions) => Room>(
  'LIVEKIT_ROOM_FACTORY',
  {
    providedIn: 'root',
    factory: () => (options) => new Room(options),
  },
);

export type QualityPreset = '720p' | '1080p' | 'native';

@Injectable({ providedIn: 'root' })
export class LivekitService {
  readonly connectionState = signal<ConnectionState>(ConnectionState.Disconnected);

  readonly participantsCount = signal(0);

  readonly hasVideo = signal(false);

  readonly hasAudio = signal(false);

  readonly audioBlocked = signal(true);

  readonly remotePublications = signal<RemoteTrackPublication[]>([]);

  readonly presenterEnded = signal(false);

  private readonly roomFactory = inject(LIVEKIT_ROOM_FACTORY);

  private room: Room | null = null;

  private attached: Track[] = [];

  private videoElement: HTMLVideoElement | null = null;

  private audioElement: HTMLElement | null = null;

  private attachedAudio = new Map<Track, HTMLAudioElement>();

  private audioVolume = 0.8;

  private audioMuted = true;

  private screenStopped: (() => void) | null = null;

  async connectPublisherReady(url: string, token: string): Promise<void> {
    await this.disconnect();

    const room = this.newRoom();

    this.room = room;

    await room.connect(url, token);

    this.updateCount();
  }

  async connectPublisher(
    url: string,
    token: string,
    options: {
      quality: QualityPreset;
      fps: number;
      systemAudio: boolean;
      microphone: boolean;
    },
  ): Promise<void> {
    await this.disconnect();

    const room = this.newRoom();

    this.room = room;

    await room.connect(url, token);

    if (options.microphone) {
      await room.localParticipant.setMicrophoneEnabled(true);
    }

    const height =
      options.quality === 'native'
        ? Math.round(screen.height * devicePixelRatio)
        : options.quality === '720p'
          ? 720
          : 1080;

    const width =
      options.quality === 'native'
        ? Math.round(screen.width * devicePixelRatio)
        : options.quality === '720p'
          ? 1280
          : 1920;

    const publication = await room.localParticipant.setScreenShareEnabled(
      true,
      {
        audio: options.systemAudio
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          : false,
        contentHint: 'detail',
        resolution: { width, height, frameRate: options.fps },
        video: true,
      },
      {
        audioPreset: AudioPresets.musicHighQualityStereo,
        forceStereo: true,
        dtx: false,
        simulcast: true,
      },
    );

    if (!publication) {
      throw new Error('O navegador não iniciou a captura de tela.');
    }

    const tracks = room.localParticipant.getTrackPublications();

    this.hasVideo.set(tracks.some((track) => track.source === 'screen_share' && track.track));

    this.hasAudio.set(tracks.some((track) => track.source === 'screen_share_audio' && track.track));

    const media = (
      publication.track as unknown as { mediaStreamTrack?: MediaStreamTrack } | undefined
    )?.mediaStreamTrack;

    if (media) {
      this.screenStopped = () => {
        void this.stopSharing();
      };

      media.addEventListener('ended', this.screenStopped, { once: true });
    }
  }

  async connectViewer(
    url: string,
    token: string,
    video: HTMLVideoElement,
    audio: HTMLElement,
  ): Promise<void> {
    await this.disconnect();

    this.presenterEnded.set(false);

    this.videoElement = video;

    this.audioElement = audio;

    const room = this.newRoom();

    this.room = room;

    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      this.attach(track, publication);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
      track.detach();

      this.attachedAudio.get(track)?.remove();

      this.attachedAudio.delete(track);

      this.attached = this.attached.filter((attachedTrack) => attachedTrack !== track);

      this.remotePublications.set(
        this.remotePublications().filter((remotePublication) => remotePublication !== publication),
      );

      this.updateFlags();
    });

    room.on(RoomEvent.ParticipantConnected, () => this.updateCount());

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.updateCount();

      if (participant.identity.startsWith('publisher')) {
        this.presenterEnded.set(true);

        this.hasVideo.set(false);
      }
    });

    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      this.audioBlocked.set(!room.canPlaybackAudio);
    });

    room.on(RoomEvent.Reconnecting, () => {
      this.connectionState.set(ConnectionState.Reconnecting);
    });

    room.on(RoomEvent.Reconnected, () => {
      this.connectionState.set(ConnectionState.Connected);
    });

    room.on(RoomEvent.Disconnected, () => {
      this.connectionState.set(ConnectionState.Disconnected);

      this.presenterEnded.set(true);

      this.hasVideo.set(false);
    });

    await room.connect(url, token);

    this.updateCount();

    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track) {
          this.attach(publication.track, publication);
        }
      }
    }
  }

  private newRoom(): Room {
    const room = this.roomFactory({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        audioPreset: AudioPresets.speech,
        forceStereo: false,
        dtx: true,
      },
      audioCaptureDefaults: {},
      stopLocalTrackOnUnpublish: true,
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.connectionState.set(state);
    });

    room.on(RoomEvent.ParticipantConnected, () => this.updateCount());

    room.on(RoomEvent.ParticipantDisconnected, () => this.updateCount());

    return room;
  }

  private attach(track: Track, publication: RemoteTrackPublication): void {
    if (this.attached.includes(track)) return;

    if (track.kind === Track.Kind.Video && this.videoElement) {
      track.attach(this.videoElement);

      this.videoElement.autoplay = true;

      this.videoElement.playsInline = true;

      this.hasVideo.set(true);
    } else if (track.kind === Track.Kind.Audio && this.audioElement) {
      const element = document.createElement('audio');

      element.autoplay = true;

      element.muted = this.audioMuted;

      element.volume = this.audioVolume;

      track.attach(element);

      element.muted = this.audioMuted;

      this.audioElement.append(element);

      this.attachedAudio.set(track, element);

      this.hasAudio.set(true);
    }

    this.attached.push(track);

    this.remotePublications.set([...this.remotePublications(), publication]);
  }

  private updateCount(): void {
    if (!this.room) {
      return;
    }

    const remotes = this.room.remoteParticipants;

    const isPublisher = this.room.localParticipant.identity.startsWith('publisher');

    const presenterPresent = Array.from(remotes.values()).some((participant) =>
      participant.identity.startsWith('publisher'),
    );

    this.participantsCount.set(
      isPublisher ? remotes.size : remotes.size + (presenterPresent ? 0 : 1),
    );
  }

  private updateFlags(): void {
    this.hasVideo.set(this.attached.some((track) => track.kind === Track.Kind.Video));

    this.hasAudio.set(this.attached.some((track) => track.kind === Track.Kind.Audio));
  }

  async enableAudio(): Promise<void> {
    if (!this.room) {
      return;
    }

    await this.room.startAudio();

    this.audioMuted = false;

    for (const element of this.attachedAudio.values()) element.muted = false;

    this.audioBlocked.set(!this.room.canPlaybackAudio);
  }

  setVolume(value: number): void {
    this.audioVolume = value;

    this.audioMuted = value === 0;

    for (const element of this.attachedAudio.values()) {
      element.volume = value;

      element.muted = this.audioMuted;
    }
  }

  setMuted(muted: boolean): void {
    this.audioMuted = muted;

    for (const element of this.attachedAudio.values()) element.muted = muted;
  }

  setQuality(value: 'auto' | 'HIGH' | 'MEDIUM' | 'LOW'): void {
    for (const publication of this.remotePublications()) {
      if (publication.kind === Track.Kind.Video) {
        publication.setVideoQuality(value === 'auto' ? VideoQuality.HIGH : VideoQuality[value]);
      }
    }
  }

  async setMicrophoneMuted(muted: boolean): Promise<void> {
    await this.room?.localParticipant.setMicrophoneEnabled(!muted);
  }

  async stopSharing(): Promise<void> {
    if (!this.room) {
      return;
    }

    await this.room.localParticipant.setScreenShareEnabled(false);

    await this.room.localParticipant.setMicrophoneEnabled(false);

    this.hasVideo.set(false);

    this.hasAudio.set(false);

    this.screenStopped = null;
  }

  async disconnect(): Promise<void> {
    if (this.screenStopped) {
      this.screenStopped();

      this.screenStopped = null;
    }

    for (const track of this.attached) {
      track.detach();
    }

    this.attached = [];

    this.videoElement?.replaceChildren();

    this.audioElement?.replaceChildren();

    this.attachedAudio.clear();

    this.audioVolume = 0.8;

    this.audioMuted = true;

    const room = this.room;

    this.room = null;

    if (room) {
      room.removeAllListeners();

      await room.disconnect();
    }

    this.videoElement = null;

    this.audioElement = null;

    this.connectionState.set(ConnectionState.Disconnected);

    this.participantsCount.set(0);

    this.hasVideo.set(false);

    this.hasAudio.set(false);

    this.audioBlocked.set(true);

    this.remotePublications.set([]);

    this.presenterEnded.set(false);
  }
}
