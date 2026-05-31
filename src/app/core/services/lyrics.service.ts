import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { API_URL } from '../constants';

export interface LyricsResponse {
  id: number;
  song_id: string;
  text: string; // Contiene el JSON stringificado que envía NestJS
}

export interface ParsedLyrics {
  synced: boolean;
  lines: string[] | { time: number; text: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class LyricsFrontendService {
  private readonly http = inject(HttpClient);

  async fetchLyrics(youtubeId: string, title: string, artist: string): Promise<ParsedLyrics> {
    const token = localStorage.getItem('kamux_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const url = `${API_URL}/lyrics?youtubeId=${youtubeId}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;

    try {
      const res = await firstValueFrom(this.http.get<LyricsResponse>(url, { headers }));
      // Parseamos el string de la columna 'text' de PostgreSQL a un objeto estructurado de JavaScript
      return JSON.parse(res.text) as ParsedLyrics;
    } catch (error) {
      console.error('Error al mapear las letras desde NestJS:', error);
      return { synced: false, lines: ['No se pudieron sincronizar las letras para este track.'] };
    }
  }
}
