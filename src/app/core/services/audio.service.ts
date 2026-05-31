import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { API_URL } from '../constants';
import { Song } from '../../shared/models/music.model';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private readonly audio = new Audio();

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

  /**
   * ⚡ CONDUCTO DE EXTRACCIÓN: Inicializa y expone el nodo de análisis multimedia
   */
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

  setQueue(songs: Song[], currentSong: Song): void {
    this.playlistQueue = songs;
    this.playlistQueueSubject.next(songs);
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
    this.currentIndex = (this.currentIndex + 1) % this.playlistQueue.length;
    this.loadAndPlay(this.playlistQueue[this.currentIndex]);
  }

  previous(): void {
    if (this.playlistQueue.length === 0 || this.currentIndex === -1) return;
    this.currentIndex = this.currentIndex === 0 ? this.playlistQueue.length - 1 : this.currentIndex - 1;
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
