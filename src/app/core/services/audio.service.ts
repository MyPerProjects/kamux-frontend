import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, from, concatMap, toArray } from 'rxjs';
import { API_URL } from '../constants';
import { Song } from '../../shared/models/music.model';
import { SongsService } from './songs.service';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private readonly audio = new Audio();
  private readonly songsService = inject(SongsService);

  private readonly currentSongSubject = new BehaviorSubject<Song | null>(null);
  public currentSong$ = this.currentSongSubject.asObservable();

  private readonly isPlayingSubject = new BehaviorSubject<boolean>(false);
  public isPlaying$ = this.isPlayingSubject.asObservable();

  private readonly currentTimeSubject = new BehaviorSubject<number>(0);
  public currentTime$ = this.currentTimeSubject.asObservable();

  private readonly durationSubject = new BehaviorSubject<number>(0);
  public duration$ = this.durationSubject.asObservable();

  private readonly playlistQueueSubject = new BehaviorSubject<Song[]>([]);
  public playlistQueue$ = this.playlistQueueSubject.asObservable();

  private playlistQueue: Song[] = [];
  private currentIndex: number = -1;
  private isSeeking: boolean = false;
  private isAutoplayMode: boolean = false;
  private isResolvingQueue: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  constructor() {
    this.audio.crossOrigin = 'anonymous';

    this.audio.addEventListener('timeupdate', () => {
      if (!this.isSeeking) {
        this.currentTimeSubject.next(this.audio.currentTime);
      }
    });

    this.audio.addEventListener('durationchange', () => {
      if (!isNaN(this.audio.duration)) {
        this.durationSubject.next(this.audio.duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('seeking', () => {
      this.isSeeking = true;
    });

    this.audio.addEventListener('seeked', () => {
      this.isSeeking = false;
      this.currentTimeSubject.next(this.audio.currentTime);
    });

    this.initMediaSessionActionHandlers();
  }

  private initMediaSessionActionHandlers(): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.previous();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.next();
      });
    }
  }

  private updateMediaSessionMetadata(song: Song): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: 'Kamux Official',
        artwork: [
          {
            src: song.thumbnail || 'assets/default-track.png',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    if (this.analyser) return this.analyser;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      return this.analyser;
    } catch (e) {
      return null;
    }
  }

  setQueue(songs: Song[], currentSong: Song, autoplayMode: boolean = false): void {
    this.isAutoplayMode = autoplayMode;
    this.playlistQueue = [...songs];
    this.playlistQueueSubject.next(this.playlistQueue);
    this.currentIndex = songs.findIndex(
      (s) => s.title === currentSong.title && s.artist === currentSong.artist,
    );

    this.triggerBackgroundQueueResolver();
  }

  loadAndPlay(song: Song): void {
    this.stop();
    this.currentSongSubject.next(song);
    this.isPlayingSubject.next(true);
    this.currentTimeSubject.next(0);
    this.isSeeking = false;

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const token = localStorage.getItem('kamux_token') || '';

    if (!song.youtube_id) {
      console.log(
        `[🎯 Clic Caliente] Resolviendo ID en tiempo real para: ${song.artist} - ${song.title}`,
      );
      this.songsService.resolveSongId(song.artist, song.title).subscribe({
        next: (res) => {
          if (res && res.youtube_id) {
            song.youtube_id = res.youtube_id;
            song.thumbnail = res.thumbnail;

            this.updateMediaSessionMetadata(song);
            this.updateMediaSessionPlaybackState('playing');

            this.audio.src = `${API_URL}/songs/stream/${song.youtube_id}?token=${token}`;
            this.audio.load();
            this.audio.play().catch(() => {
              this.isPlayingSubject.next(false);
              this.updateMediaSessionPlaybackState('paused');
            });
          }
        },
        error: () => {
          this.isPlayingSubject.next(false);
          this.updateMediaSessionPlaybackState('none');
        },
      });
      return;
    }

    this.updateMediaSessionMetadata(song);
    this.updateMediaSessionPlaybackState('playing');

    this.audio.src = `${API_URL}/songs/stream/${song.youtube_id}?token=${token}`;
    this.audio.load();
    this.audio.play().catch((err) => {
      console.error('Error al reproducir audio:', err);
      this.isPlayingSubject.next(false);
      this.updateMediaSessionPlaybackState('paused');
    });

    if (this.isAutoplayMode) {
      this.fetchAndAppendRelatedSongs(song);
    }
  }

  private fetchAndAppendRelatedSongs(song: Song): void {
    this.songsService.getRelatedSongsExtended(song.artist, song.title).subscribe({
      next: (recommendedTracks) => {
        if (!recommendedTracks || recommendedTracks.length === 0) return;

        const filteredTracks = recommendedTracks.filter(
          (track) =>
            !this.playlistQueue.some((q) => q.title === track.title && q.artist === track.artist),
        );

        if (filteredTracks.length > 0) {
          console.log(
            `[📻 Kamux Radio] Inyectando ${filteredTracks.length} tracks sugeridos a la cola.`,
          );
          this.playlistQueue.push(...filteredTracks);
          this.playlistQueueSubject.next(this.playlistQueue);

          this.triggerBackgroundQueueResolver();
        }
      },
    });
  }

  public loadMoreInfiniteTracks(): void {
    if (this.playlistQueue.length === 0) return;

    const queueLength = this.playlistQueue.length;
    const sampleTracks = this.playlistQueue.slice(Math.max(0, queueLength - 3), queueLength);
    const selectedSeed = sampleTracks[Math.floor(Math.random() * sampleTracks.length)];

    console.log(
      `[🔄 Scroll Infinito] Recarga contextual secuencial usando semilla: ${selectedSeed.artist} - ${selectedSeed.title}`,
    );
    this.fetchAndAppendRelatedSongs(selectedSeed);
  }

  private triggerBackgroundQueueResolver(): void {
    if (this.isResolvingQueue) return;

    const unresolvedTracks = this.playlistQueue.filter((t) => !t.youtube_id);
    if (unresolvedTracks.length === 0) return;

    this.isResolvingQueue = true;

    from(unresolvedTracks)
      .pipe(
        concatMap((track) => {
          return new Promise((resolve) => {
            this.songsService.resolveSongId(track.artist, track.title).subscribe({
              next: (res) => {
                if (res && res.youtube_id) {
                  track.youtube_id = res.youtube_id;
                  track.thumbnail = res.thumbnail;
                }
                setTimeout(() => resolve(track), 300);
              },
              error: () => setTimeout(() => resolve(track), 300),
            });
          });
        }),
      )
      .subscribe({
        complete: () => {
          this.isResolvingQueue = false;
          this.playlistQueueSubject.next(this.playlistQueue);

          const checkNew = this.playlistQueue.some((t) => !t.youtube_id);
          if (checkNew) this.triggerBackgroundQueueResolver();
        },
      });
  }

  togglePlay(): void {
    if (!this.audio.src) return;
    if (this.audio.paused) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audio.play();
      this.isPlayingSubject.next(true);
      this.updateMediaSessionPlaybackState('playing');
    } else {
      this.audio.pause();
      this.isPlayingSubject.next(false);
      this.updateMediaSessionPlaybackState('paused');
    }
  }

  seek(seconds: number): void {
    if (!this.audio.src) return;
    this.isSeeking = true;
    this.currentTimeSubject.next(seconds);
    this.audio.currentTime = seconds;
  }

  next(): void {
    if (this.playlistQueue.length === 0 || this.currentIndex === -1) return;

    if (this.isAutoplayMode && this.playlistQueue.length - this.currentIndex <= 5) {
      this.loadMoreInfiniteTracks();
    }

    this.currentIndex = (this.currentIndex + 1) % this.playlistQueue.length;
    this.loadAndPlay(this.playlistQueue[this.currentIndex]);
  }

  previous(): void {
    if (this.playlistQueue.length === 0 || this.currentIndex === -1) return;
    this.currentIndex =
      this.currentIndex === 0 ? this.playlistQueue.length - 1 : this.currentIndex - 1;
    this.loadAndPlay(this.playlistQueue[this.currentIndex]);
  }

  setVolume(volume: number): void {
    this.audio.volume = volume / 100;
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlayingSubject.next(false);
    this.isSeeking = false;
    this.updateMediaSessionPlaybackState('none');
  }
}
