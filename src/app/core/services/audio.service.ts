import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

  // 🚀 VARIABLES DEL MOTOR DE FRECUENCIA BINARIA
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  constructor() {
    // Esencial para permitir la lectura de bytes sin bloqueos de seguridad CORS
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
  }

  public getAnalyserNode(): AnalyserNode | null {
    if (this.analyser) return this.analyser;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // Resoluciones óptimas para barras simétricas y elegantes en móviles

      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      return this.analyser;
    } catch (e) {
      console.warn('[⚠️ AudioContext] Bloqueado por interacción del usuario o no soportado.', e);
      return null;
    }
  }

  setQueue(songs: Song[], currentSong: Song, autoplayMode: boolean = false): void {
    this.isAutoplayMode = autoplayMode;
    this.playlistQueue = [...songs];
    this.playlistQueueSubject.next(this.playlistQueue);
    this.currentIndex = songs.findIndex((s) => s.youtube_id === currentSong.youtube_id);
  }

  loadAndPlay(song: Song): void {
    this.stop();
    this.currentSongSubject.next(song);
    this.isPlayingSubject.next(true);
    this.currentTimeSubject.next(0);
    this.isSeeking = false;

    // Reactivar el contexto multimedia si el navegador lo dejó en suspenso
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const token = localStorage.getItem('kamux_token') || '';
    this.audio.src = `${API_URL}/songs/stream/${song.youtube_id}?token=${token}`;
    this.audio.load();

    this.audio.play().catch((err) => {
      console.error('Error al reproducir audio:', err);
      this.isPlayingSubject.next(false);
    });

    // 📻 CARGA PEREZOZA INTEGRADA: Si está activado el modo automático, alimenta la cola con recomendados
    if (this.isAutoplayMode) {
      this.fetchAndAppendRelatedSongs(song.youtube_id);
    }
  }

  private fetchAndAppendRelatedSongs(youtubeId: string): void {
    this.songsService.getRelatedSongs(youtubeId).subscribe({
      next: (recommendedTracks) => {
        if (!recommendedTracks || recommendedTracks.length === 0) return;

        // Filtramos para asegurarnos de no añadir canciones que ya existen en nuestra cola actual
        const filteredTracks = recommendedTracks.filter(
          (track) => !this.playlistQueue.some((q) => q.youtube_id === track.youtube_id),
        );

        if (filteredTracks.length > 0) {
          console.log(
            `[📻 Kamux Radio] Inyectando ${filteredTracks.length} tracks sugeridos a la cola.`,
          );
          this.playlistQueue.push(...filteredTracks);
          this.playlistQueueSubject.next(this.playlistQueue);
        }
      },
      error: (err) => {
        console.error(
          '[🚨 Kamux Radio Error] Falló el fetch asíncrono de recomendados:',
          err.message,
        );
      },
    });
  }

  public loadMoreInfiniteTracks(): void {
    if (this.playlistQueue.length === 0) return;
    const lastTrack = this.playlistQueue[this.playlistQueue.length - 1];
    console.log(
      `[🔄 Scroll Infinito] Disparando recarga perezosa usando como semilla: ${lastTrack.title}`,
    );
    this.fetchAndAppendRelatedSongs(lastTrack.youtube_id);
  }

  togglePlay(): void {
    if (!this.audio.src) return;

    if (this.audio.paused) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audio.play();
      this.isPlayingSubject.next(true);
    } else {
      this.audio.pause();
      this.isPlayingSubject.next(false);
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

    // Si estamos en el modo de cola infinita inteligente y nos acercamos al final (ej: quedan 4 canciones)
    // forzamos automáticamente la recarga asíncrona de más tracks usando la última canción de la lista.
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
  }
}
