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

  // 🚀 GOLAZO: Modificado para generar una Radio Temática Real en lugar de usar los resultados sueltos
  playSong(song: Song): void {
    // 1. Registramos de inmediato en tu historial de PostgreSQL
    this.songsService.trackPlayback(song).subscribe({
      error: (err) => console.error('Error al registrar historial en segundo plano:', err),
    });

    // 2. Cargamos y reproducimos la canción seleccionada al instante para cero delay
    this.audioService.loadAndPlay(song);

    // 3. Generamos la cola automática usando el nombre del artista como semilla inteligente (Radio de ...)
    this.songsService.searchSongs(song.artist).subscribe({
      next: (radioSongs: Song[]) => {
        // Filtramos para evitar que la canción actual se duplique en la cola intermedia
        const finalQueue = [song, ...radioSongs.filter((s) => s.youtube_id !== song.youtube_id)];

        // Seteamos la cola real unificada en el AudioService
        this.audioService.setQueue(finalQueue, song);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al generar la radio automática del artista:', err);
        // Salvaguarda: Si falla el algoritmo de similitud, cae con elegancia usando la lista de búsqueda
        this.audioService.setQueue(this.results, song);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
