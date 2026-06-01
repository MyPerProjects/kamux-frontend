import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';
import { LyricsFrontendService, ParsedLyrics } from '../../core/services/lyrics.service';
import { Song } from '../../shared/models/music.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit, OnDestroy, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly audioService = inject(AudioService);
  private readonly lyricsService = inject(LyricsFrontendService);
  private readonly router = inject(Router);

  @ViewChild('lyricsContainer') private lyricsContainer!: ElementRef;
  @ViewChild('equalizerCanvas') private equalizerCanvas!: ElementRef<HTMLCanvasElement>;

  currentUser$ = this.authService.currentUser$;
  currentSong$ = this.audioService.currentSong$;
  isPlaying$ = this.audioService.isPlaying$;
  currentTime$ = this.audioService.currentTime$;
  duration$ = this.audioService.duration$;
  playlistQueue$ = this.audioService.playlistQueue$;

  isPlayerExpanded = false;
  isSidebarOpen = false;
  isTabsSectionOpen = false;
  activeTab: 'queue' | 'lyrics' = 'queue';
  isUserSeeking = false;
  temporarySeekValue = 0;
  isLoadingMore = false;

  private touchStartY = 0;
  lyricsData: ParsedLyrics | null = null;
  isLoadingLyrics = false;
  activeLineIndex = -1;
  private animationId: number | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private subManager = new Subscription();
  private lastLoadedSongId = '';

  get displayLines(): { text: string }[] {
    if (!this.lyricsData) return [];
    return this.lyricsData.synced
      ? (this.lyricsData.lines as { time: number; text: string }[]).map((l) => ({ text: l.text }))
      : (this.lyricsData.lines as string[]).map((t) => ({ text: t }));
  }

  ngOnInit(): void {
    this.subManager.add(
      this.currentSong$.subscribe((song) => {
        if (song) {
          this.checkAndLoadLyrics(song);
        } else {
          this.lyricsData = null;
          this.lastLoadedSongId = '';
        }
      }),
    );

    this.subManager.add(
      this.currentTime$.subscribe((seconds) => {
        if (!this.isUserSeeking) this.syncActiveLine(seconds);
      }),
    );

    this.subManager.add(
      this.playlistQueue$.subscribe(() => {
        this.isLoadingMore = false;
      }),
    );
  }

  ngAfterViewInit(): void {
    if (this.equalizerCanvas) {
      this.canvasContext = this.equalizerCanvas.nativeElement.getContext('2d');
      this.resizeCanvas();
    }
  }

  ngOnDestroy(): void {
    this.subManager.unsubscribe();
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  onQueueScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 50;
    const reachedBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + threshold;

    if (reachedBottom && !this.isLoadingMore) {
      this.isLoadingMore = true;
      console.log('[🚀 UI Layout] Usuario llegó al final de la cola, solicitando más tracks...');
      this.audioService.loadMoreInfiniteTracks();
    }
  }

  private resizeCanvas(): void {
    if (!this.equalizerCanvas) return;
    const canvas = this.equalizerCanvas.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  togglePlayerExpand(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.player-controls, .player-volume, .progress-slider, .mobile-bar-actions'))
      return;
    this.isPlayerExpanded = !this.isPlayerExpanded;
    this.handleEqualizerLoop();
  }

  minimizePanel(): void {
    this.isPlayerExpanded = false;
    this.isTabsSectionOpen = false;
    this.handleEqualizerLoop();
  }

  private handleEqualizerLoop(): void {
    if (this.isPlayerExpanded && !this.isTabsSectionOpen) {
      setTimeout(() => {
        this.resizeCanvas();
        this.startEqualizerAnimation();
      }, 50);
    } else if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private startEqualizerAnimation(): void {
    const analyser = this.audioService.getAnalyserNode();
    if (!analyser || !this.canvasContext) return;

    const canvas = this.equalizerCanvas.nativeElement;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isPlayerExpanded || this.isTabsSectionOpen) {
        this.animationId = null;
        return;
      }
      this.animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      this.canvasContext!.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      const gradient = this.canvasContext!.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#1db954');
      gradient.addColorStop(1, 'rgba(29, 185, 84, 0.1)');
      this.canvasContext!.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * 1.2;
        this.canvasContext!.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth + 2;
      }
    };
    draw();
  }

  async checkAndLoadLyrics(song: Song): Promise<void> {
    if (this.activeTab !== 'lyrics' || this.lastLoadedSongId === song.youtube_id) return;
    this.isLoadingLyrics = true;

    const data = await this.lyricsService.fetchLyrics(song.youtube_id, song.title, song.artist);

    this.lyricsData = data; // 🚀 Fijamos los datos de la letra descargada de forma permanente
    this.lastLoadedSongId = song.youtube_id;
    this.isLoadingLyrics = false;
  }

  setTab(tab: 'queue' | 'lyrics'): void {
    this.activeTab = tab;
    this.currentSong$
      .subscribe((song) => {
        if (song) this.checkAndLoadLyrics(song);
      })
      .unsubscribe();
    this.handleEqualizerLoop();
  }

  private syncActiveLine(currentSeconds: number): void {
    if (!this.lyricsData?.synced) return;
    const lines = this.lyricsData.lines as { time: number; text: string }[];
    const newIndex = lines.findIndex(
      (l, i) =>
        currentSeconds >= l.time && (lines[i + 1] ? currentSeconds < lines[i + 1].time : true),
    );
    if (newIndex !== this.activeLineIndex && newIndex !== -1) {
      this.activeLineIndex = newIndex;
      this.scrollToActiveLine();
    }
  }

  private scrollToActiveLine(): void {
    if (!this.lyricsContainer) return;
    setTimeout(() => {
      const el = this.lyricsContainer.nativeElement as HTMLElement;
      const active = el.querySelector('.lyric-line.active') as HTMLElement;
      if (active) {
        el.scrollTo({
          top: active.offsetTop - el.clientHeight / 2 + active.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }, 40);
  }

  formatTime(s: number | null): string {
    if (s === null || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartY = e.touches[0].clientY;
  }

  onTouchEnd(e: TouchEvent): void {
    if (e.changedTouches[0].clientY - this.touchStartY > 120) this.minimizePanel();
  }

  onSeekInput(e: Event): void {
    this.isUserSeeking = true;
    this.temporarySeekValue = Number((e.target as HTMLInputElement).value);
  }

  onSeekChange(e: Event): void {
    this.audioService.seek(Number((e.target as HTMLInputElement).value));
    this.isUserSeeking = false;
  }

  onLogout(): void {
    this.audioService.stop();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  onTogglePlay(): void {
    this.audioService.togglePlay();
  }

  onNext(): void {
    this.audioService.next();
  }

  onPrevious(): void {
    this.audioService.previous();
  }

  onVolumeChange(e: Event): void {
    this.audioService.setVolume(Number((e.target as HTMLInputElement).value));
  }

  playFromQueue(s: Song, q: Song[]): void {
    this.audioService.setQueue(q, s, true);
    this.audioService.loadAndPlay(s);
  }
}
