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

  getHistory(): Observable<PlaybackHistory[]> {
    return this.http.get<PlaybackHistory[]>(`${API_URL}/songs/history`);
  }

  trackPlayback(song: any): Observable<any> {
    // 🔍 Agregamos un log en la consola del navegador (F12) para validar qué envía Angular
    console.log('[🚀 Frontend - Service] Enviando track al historial:', song);

    return this.http.post<any>(`${API_URL}/songs/history/track`, {
      youtube_id: song.youtube_id || song.id, // Por si acaso maneja id en lugar de youtube_id
      title: song.title,
      artist: song.artist,
      duration_seconds: song.duration_seconds || 180,
      thumbnail: song.thumbnail,
    });
  }
}
