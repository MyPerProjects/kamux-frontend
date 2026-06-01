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

  /**
   * 📻 ACTIVACIÓN DEL ALGORITMO INFINITO
   * Al reproducir una canción, limpia el historial de reproducción previo, establece
   * el track seleccionado como la raíz y enciende el motor de recomendaciones automáticas.
   */
  playSong(song: Song): void {
    // 1. Registramos de inmediato en tu historial de PostgreSQL
    this.songsService.trackPlayback(song).subscribe({
      error: (err) => console.error('Error al registrar historial en segundo plano:', err),
    });

    // 2. Seteamos la cola inicial únicamente con la canción seleccionada y activamos el modo Autoplay (true)
    // Esto limpia la cola vieja y le dice al AudioService que empiece a jalar recomendados de fondo.
    this.audioService.setQueue([song], song, true);

    // 3. Cargamos y reproducimos la canción seleccionada al instante para cero delay
    this.audioService.loadAndPlay(song);

    this.cdr.detectChanges();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
