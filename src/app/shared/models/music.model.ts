export interface Song {
  youtube_id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  thumbnail?: string;
}

export interface Playlist {
  id: number;
  name: string;
  user_id: number;
  created_at: Date;
  playlist_songs?: PlaylistSong[];
}

export interface PlaylistSong {
  id: number;
  playlist_id: number;
  song_id: string;
  added_at: Date;
  song?: Song;
}

export interface PlaybackHistory {
  id: number;
  user_id: number;
  song_id: string;
  played_at: Date;
  song?: Song;
}

export interface LyricResponse {
  id: number;
  song_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
}
