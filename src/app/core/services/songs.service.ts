import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants';
import { Song, PlaybackHistory } from '../../shared/models/music.model';

@Injectable({
  providedIn: 'root',
})
export class SongsService {
  private readonly http = inject(HttpClient);

  searchSongs(query: string): Observable<Song[]> {
    return this.http.get<Song[]>(`${API_URL}/songs/search`, {
      params: { query },
    });
  }

  getRelatedSongs(youtubeId: string): Observable<Song[]> {
    return this.http.get<Song[]>(`${API_URL}/songs/related/${youtubeId}`);
  }

  getHistory(): Observable<PlaybackHistory[]> {
    return this.http.get<PlaybackHistory[]>(`${API_URL}/songs/history`);
  }

  trackPlayback(song: any): Observable<any> {
    console.log('[🚀 Frontend - Service] Enviando track al historial:', song);

    return this.http.post<any>(`${API_URL}/songs/history/track`, {
      youtube_id: song.youtube_id || song.id,
      title: song.title,
      artist: song.artist,
      duration_seconds: song.duration_seconds || 180,
      thumbnail: song.thumbnail,
    });
  }

  // 📡 NUEVO: Puente para la Radio Contextual usando metadatos limpios de estudio
  getRelatedSongsExtended(artist: string, track: string): Observable<Song[]> {
    return this.http.get<Song[]>(`${API_URL}/songs/related-extended`, {
      params: { artist, track },
    });
  }

  // 📡 NUEVO: Puente para resolver un único ID de YouTube (Fondo o Clic Caliente) bajo demanda
  resolveSongId(
    artist: string,
    track: string,
  ): Observable<{ youtube_id: string; thumbnail: string }> {
    return this.http.get<{ youtube_id: string; thumbnail: string }>(`${API_URL}/songs/resolve-id`, {
      params: { artist, track },
    });
  }
}
