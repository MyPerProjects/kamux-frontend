import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SongsService } from '../../../../core/services/songs.service';
import { AudioService } from '../../../../core/services/audio.service';
import { Song, PlaybackHistory } from '../../../../shared/models/music.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly router = inject(Router);
  private readonly songsService = inject(SongsService);
  private readonly audioService = inject(AudioService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;
  @ViewChild('quickScrollContainer', { static: false }) quickScrollContainer!: ElementRef;

  searchQuery = '';
  historySongs: Song[] = [];
  quickSelectSongs: Song[] = [];
  isLoadingHistory = false;

  activePageIndex = 0;
  pagesArray: number[] = [];

  get historyPages(): Song[][] {
    const chunks: Song[][] = [];
    for (let i = 0; i < this.historySongs.length; i += 9) {
      chunks.push(this.historySongs.slice(i, i + 9));
    }
    return chunks;
  }

  ngOnInit(): void {
    this.loadPlaybackHistory();
  }

  loadPlaybackHistory(): void {
    this.isLoadingHistory = true;
    this.songsService.getHistory().subscribe({
      next: (history: PlaybackHistory[]) => {
        const mappedSongs = history
          .filter((h) => h.song)
          .map((h) => ({
            youtube_id: h.song!.youtube_id,
            title: h.song!.title,
            artist: h.song!.artist,
            duration_seconds: h.song!.duration_seconds,
            thumbnail:
              h.song!.thumbnail ||
              'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop',
          }));

        const uniqueSongsMap = new Map<string, Song>();
        mappedSongs.forEach((song) => {
          if (!uniqueSongsMap.has(song.youtube_id)) {
            uniqueSongsMap.set(song.youtube_id, song);
          }
        });

        this.historySongs = Array.from(uniqueSongsMap.values()).slice(0, 27);
        const totalPages = Math.min(Math.ceil(this.historySongs.length / 9), 3);
        this.pagesArray = Array.from({ length: totalPages }, (_, i) => i);

        // ✨ CONTROL ABSOLUTO: Si la cuenta es nueva y no hay historial, matamos el flujo aquí
        if (this.historySongs.length === 0) {
          this.quickSelectSongs = [];
          this.isLoadingHistory = false;
          this.cdr.detectChanges();
          return; // Frenamos y evitamos que consulte a Megadeth por defecto
        }

        // Si el usuario SÍ tiene historial, calculamos su artista favorito de forma normal
        const artistCounts = this.historySongs.reduce((acc: any, song) => {
          acc[song.artist] = (acc[song.artist] || 0) + 1;
          return acc;
        }, {});

        const seedArtist = Object.keys(artistCounts).reduce((a, b) =>
          artistCounts[a] > artistCounts[b] ? a : b,
        );

        this.songsService.searchSongs(seedArtist).subscribe({
          next: (discoveredSongs: Song[]) => {
            const historyIds = new Set(this.historySongs.map((s) => s.youtube_id));
            const trulyNewSongs = discoveredSongs.filter((s) => !historyIds.has(s.youtube_id));

            const mixedList: Song[] = [];
            const historyCopy = [...this.historySongs].sort(() => 0.5 - Math.random());
            const discoveryCopy = [...trulyNewSongs].sort(() => 0.5 - Math.random());

            const maxLength = Math.max(historyCopy.length, discoveryCopy.length);
            for (let i = 0; i < maxLength; i++) {
              if (historyCopy[i]) mixedList.push(historyCopy[i]);
              if (discoveryCopy[i]) mixedList.push(discoveryCopy[i]);
            }

            this.quickSelectSongs = mixedList.slice(0, 16);
            this.isLoadingHistory = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error en el motor de recomendaciones:', err);
            this.quickSelectSongs = [...this.historySongs].sort(() => 0.5 - Math.random());
            this.isLoadingHistory = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Error al recuperar el historial del Home:', err);
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
    });
  }

  scrollSection(container: HTMLElement, direction: 'left' | 'right'): void {
    if (!container) return;
    const scrollAmount = container.clientWidth;

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }

  onScrollHistory(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;

    const page = Math.round(scrollLeft / clientWidth);
    if (this.activePageIndex !== page && page < this.pagesArray.length) {
      this.activePageIndex = page;
      this.cdr.detectChanges();
    }
  }

  scrollToPage(pageIndex: number): void {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement as HTMLElement;
    const targetScrollLeft = pageIndex * container.clientWidth;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });
    this.activePageIndex = pageIndex;
  }

  playAllQuickSelect(): void {
    if (this.quickSelectSongs.length === 0) return;
    this.audioService.setQueue(this.quickSelectSongs, this.quickSelectSongs[0]);
    this.audioService.loadAndPlay(this.quickSelectSongs[0]);
    this.songsService.trackPlayback(this.quickSelectSongs[0]).subscribe();
  }

  goToHistoryView(): void {
    this.router.navigate(['/history']);
  }

  onSearchSubmit(): void {
    if (!this.searchQuery.trim()) return;
    this.router.navigate(['/search'], { queryParams: { query: this.searchQuery } });
  }

  playSongFromList(song: Song, targetList: Song[]): void {
    this.songsService.trackPlayback(song).subscribe();
    this.audioService.setQueue(targetList, song);
    this.audioService.loadAndPlay(song);
  }
}
