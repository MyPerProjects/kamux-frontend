import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SongsService } from '../../../../core/services/songs.service';
import { AudioService } from '../../../../core/services/audio.service';
import { Song } from '../../../../shared/models/music.model';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-view.html',
  styleUrls: ['./history-view.css'],
})
export class HistoryView implements OnInit {
  private readonly router = inject(Router);
  private readonly songsService = inject(SongsService);
  private readonly audioService = inject(AudioService);
  private readonly cdr = inject(ChangeDetectorRef);

  historySongs: Song[] = [];
  loading = false;

  ngOnInit(): void {
    this.loading = true;
    this.songsService.getHistory().subscribe({
      next: (history) => {
        // 1. Mapeamos y estructuramos las canciones válidas primero
        const mappedSongs: Song[] = history
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

        // 2. 🛡️ Filtro de Unicidad: Eliminamos duplicados por youtube_id sobre la marcha
        const uniqueSongsMap = new Map<string, Song>();
        for (const song of mappedSongs) {
          // Si el ID ya existe, sobreescribe guardando la instancia más reciente del historial
          uniqueSongsMap.set(song.youtube_id, song);
        }

        // 3. Convertimos el Map de elementos únicos de vuelta a un Array lineal
        this.historySongs = Array.from(uniqueSongsMap.values());

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => (this.loading = false),
    });
  }

  playSong(song: Song): void {
    this.audioService.setQueue(this.historySongs, song);
    this.audioService.loadAndPlay(song);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
