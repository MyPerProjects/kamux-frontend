import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SongsService } from '../../../../core/services/songs.service';
import { AudioService } from '../../../../core/services/audio.service';
import { Song } from '../../../../shared/models/music.model';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.css'],
})
export class SearchResults implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly songsService = inject(SongsService);
  private readonly audioService = inject(AudioService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentSearch: string = '';
  results: Song[] = [];
  loading: boolean = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.currentSearch = params['query'] || '';
      if (this.currentSearch) {
        this.fetchResults(this.currentSearch);
      }
    });
  }

  fetchResults(query: string): void {
    this.loading = true;
    this.results = [];
    this.cdr.detectChanges();

    this.songsService.searchSongs(query).subscribe({
      next: (data: Song[]) => {
        // 🚀 MOTOR DE FILTRADO ESTILO SPOTIFY
        this.results = data.sort((a, b) => {
          const videoKeywords = /(official video|video oficial|live|en vivo|clip)/i;

          const aIsVideo = videoKeywords.test(a.title);
          const bIsVideo = videoKeywords.test(b.title);

          // Si 'a' es un videoclip y 'b' es una canción con portada limpia, le damos prioridad a 'b'
          if (aIsVideo && !bIsVideo) return 1;
          if (!aIsVideo && bIsVideo) return -1;
          return 0; // Si ambos son del mismo tipo, mantiene el orden original
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al recuperar búsquedas desde tu SongsService:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  playSong(song: Song): void {
    const cleanSong: Song = {
      ...song,
      youtube_id: song.youtube_id || (song as any).id,
    };

    if (!cleanSong.youtube_id) return;

    // 1. Registramos en el historial de PostgreSQL
    this.songsService.trackPlayback(cleanSong).subscribe({
      error: (err) => console.error('Error al registrar historial:', err),
    });

    // 2. Cargamos la canción como elemento único en la cola y activamos el modo Autoplay (true)
    this.audioService.setQueue([cleanSong], cleanSong, true);

    // 3. Reproducción inmediata para cero delay
    this.audioService.loadAndPlay(cleanSong);

    this.cdr.detectChanges();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
