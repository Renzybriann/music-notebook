import { supabase } from './supabase';

function guard() {
  if (!supabase) throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
}

const AUDIO_BUCKET = 'audio';
const COVERS_BUCKET = 'covers';

function getStoragePath(userId, filename) {
  return `${userId}/${Date.now()}-${(filename || '').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
}

export async function getSongs(userId) {
  guard();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  return Promise.all(
    rows.map(async (row) => {
      const dur = row.duration_seconds ?? 0;
      const start = row.start_time_seconds != null ? Number(row.start_time_seconds) : null;
      const end = row.end_time_seconds != null ? Number(row.end_time_seconds) : null;
      let audioUrl = null;
      if (row.audio_path) {
        try {
          audioUrl = await getAudioUrl(row.audio_path);
        } catch (e) {
          console.warn('[Music Notebook] getAudioUrl failed for song', row.id, e?.message);
        }
      }
      return {
        id: row.id,
        title: row.title,
        artist: null,
        duration: row.duration_display || formatDuration(dur),
        duration_seconds: dur,
        startTimeSeconds: start,
        endTimeSeconds: end,
        album: 'Unreleased',
        isReleased: row.is_released,
        audioUrl,
        audioPath: row.audio_path,
        notes: row.notes ?? '',
        createdAt: row.created_at,
      };
    })
  );
}

export async function getAlbums(userId) {
  guard();
  const { data: albums, error: albumsError } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (albumsError) throw albumsError;

  const list = albums || [];
  return Promise.all(
    list.map(async (a) => {
      const { data: links } = await supabase
        .from('album_songs')
        .select('song_id, position')
        .eq('album_id', a.id)
        .order('position');
      const songIds = (links || []).sort((x, y) => x.position - y.position).map(l => l.song_id);
      let coverImage = null;
      if (a.cover_path) {
        try {
          coverImage = await getCoverUrl(a.cover_path);
        } catch (e) {
          console.warn('[Music Notebook] getCoverUrl failed for album', a.id, e?.message);
        }
      }
      return {
        id: a.id,
        name: a.name,
        songs: songIds,
        coverImage,
        coverPath: a.cover_path,
        createdAt: a.created_at,
      };
    })
  );
}

export async function getAudioSignedUrl(path) {
  return path ? await getAudioUrl(path) : null;
}

export async function getCoverSignedUrl(path) {
  return path ? await getCoverUrl(path) : null;
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

async function getAudioUrl(path) {
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error) {
    console.warn('[Music Notebook] Audio signed URL:', error.message, path);
    return null;
  }
  return data?.signedUrl ?? null;
}

async function getCoverUrl(path) {
  const { data, error } = await supabase.storage.from(COVERS_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error) {
    console.warn('[Music Notebook] Cover signed URL:', error.message, path);
    return null;
  }
  return data?.signedUrl ?? null;
}

function formatDuration(seconds) {
  if (seconds == null) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function uploadSong(userId, { title, durationDisplay, durationSeconds, isReleased, notes, audioFile, startTimeSeconds, endTimeSeconds }) {
  guard();
  let audioPath = null;
  if (audioFile) {
    const path = getStoragePath(userId, audioFile.name);
    const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(path, audioFile, {
      contentType: audioFile.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    audioPath = path;
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({
      user_id: userId,
      title,
      duration_display: durationDisplay,
      duration_seconds: durationSeconds ?? null,
      audio_path: audioPath,
      is_released: !!isReleased,
      notes: notes || null,
      start_time_seconds: startTimeSeconds ?? null,
      end_time_seconds: endTimeSeconds ?? null,
    })
    .select(
      'id, title, duration_display, duration_seconds, audio_path, is_released, notes, created_at, start_time_seconds, end_time_seconds'
    )
    .single();
  if (error) throw error;

  const start = data.start_time_seconds != null ? Number(data.start_time_seconds) : null;
  const end = data.end_time_seconds != null ? Number(data.end_time_seconds) : null;
  let signedAudio = null;
  if (data.audio_path) {
    try {
      signedAudio = await getAudioUrl(data.audio_path);
    } catch (e) {
      console.warn('[Music Notebook] uploadSong signed URL failed:', e?.message);
    }
  }
  return {
    id: data.id,
    title: data.title,
    artist: null,
    duration: data.duration_display || formatDuration(data.duration_seconds),
    duration_seconds: data.duration_seconds,
    startTimeSeconds: start,
    endTimeSeconds: end,
    isReleased: data.is_released,
    audioUrl: signedAudio,
    audioPath: data.audio_path,
    notes: data.notes ?? '',
    createdAt: data.created_at,
  };
}

export async function updateSong(userId, songId, updates) {
  guard();
  const row = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.durationDisplay !== undefined) row.duration_display = updates.durationDisplay;
  if (updates.durationSeconds !== undefined) row.duration_seconds = updates.durationSeconds;
  if (updates.isReleased !== undefined) row.is_released = updates.isReleased;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.startTimeSeconds !== undefined) row.start_time_seconds = updates.startTimeSeconds;
  if (updates.endTimeSeconds !== undefined) row.end_time_seconds = updates.endTimeSeconds;
  row.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('songs')
    .update(row)
    .eq('id', songId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return await mapSongRow(data);
}

export async function deleteSong(userId, songId) {
  guard();
  const { error } = await supabase.from('songs').delete().eq('id', songId).eq('user_id', userId);
  if (error) throw error;
}

export async function createAlbum(userId, { name, coverFile, songIds }) {
  guard();
  let coverPath = null;
  if (coverFile) {
    const path = getStoragePath(userId, coverFile.name);
    const { error: uploadError } = await supabase.storage.from(COVERS_BUCKET).upload(path, coverFile, {
      contentType: coverFile.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    coverPath = path;
  }

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .insert({ user_id: userId, name, cover_path: coverPath })
    .select()
    .single();
  if (albumError) throw albumError;

  if (songIds?.length) {
    const rows = songIds.map((songId, i) => ({ album_id: album.id, song_id: songId, position: i }));
    const { error: linkError } = await supabase.from('album_songs').insert(rows);
    if (linkError) throw linkError;
  }

  let coverImage = null;
  if (coverPath) {
    try {
      coverImage = await getCoverUrl(coverPath);
    } catch (e) {
      console.warn('[Music Notebook] createAlbum cover URL failed:', e?.message);
    }
  }
  return {
    id: album.id,
    name: album.name,
    songs: songIds || [],
    coverImage,
    coverPath,
    createdAt: album.created_at,
  };
}

export async function updateAlbum(userId, albumId, { name, coverFile, songIds }) {
  guard();
  const row = { updated_at: new Date().toISOString() };
  if (name !== undefined) row.name = name;
  if (coverFile) {
    const path = getStoragePath(userId, coverFile.name);
    const { error: uploadError } = await supabase.storage.from(COVERS_BUCKET).upload(path, coverFile, {
      contentType: coverFile.type,
      upsert: true,
    });
    if (uploadError) throw uploadError;
    row.cover_path = path;
  }

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .update(row)
    .eq('id', albumId)
    .eq('user_id', userId)
    .select()
    .single();
  if (albumError) throw albumError;

  if (songIds !== undefined) {
    await supabase.from('album_songs').delete().eq('album_id', albumId);
    if (songIds.length) {
      const linkRows = songIds.map((songId, i) => ({ album_id: albumId, song_id: songId, position: i }));
      await supabase.from('album_songs').insert(linkRows);
    }
  }

  let coverImage = null;
  if (album.cover_path) {
    try {
      coverImage = await getCoverUrl(album.cover_path);
    } catch (e) {
      console.warn('[Music Notebook] updateAlbum cover URL failed:', e?.message);
    }
  }
  return {
    id: album.id,
    name: album.name,
    songs: songIds ?? (await getAlbumSongIds(albumId)),
    coverImage,
    coverPath: album.cover_path,
    createdAt: album.created_at,
  };
}

async function getAlbumSongIds(albumId) {
  const { data } = await supabase
    .from('album_songs')
    .select('song_id, position')
    .eq('album_id', albumId)
    .order('position');
  return (data || []).sort((a, b) => a.position - b.position).map(l => l.song_id);
}

export async function deleteAlbum(userId, albumId) {
  guard();
  const { error } = await supabase.from('albums').delete().eq('id', albumId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateAlbumSongOrder(userId, albumId, orderedSongIds) {
  guard();
  await supabase.from('album_songs').delete().eq('album_id', albumId);
  if (orderedSongIds.length) {
    const rows = orderedSongIds.map((songId, i) => ({ album_id: albumId, song_id: songId, position: i }));
    const { error } = await supabase.from('album_songs').insert(rows);
    if (error) throw error;
  }
}

async function mapSongRow(row) {
  const start = row.start_time_seconds != null ? Number(row.start_time_seconds) : null;
  const end = row.end_time_seconds != null ? Number(row.end_time_seconds) : null;
  let audioUrl = null;
  if (row.audio_path) {
    try {
      audioUrl = await getAudioUrl(row.audio_path);
    } catch (e) {
      console.warn('[Music Notebook] mapSongRow getAudioUrl failed', row.id, e?.message);
    }
  }
  return {
    id: row.id,
    title: row.title,
    artist: null,
    duration: row.duration_display || formatDuration(row.duration_seconds),
    duration_seconds: row.duration_seconds,
    startTimeSeconds: start,
    endTimeSeconds: end,
    isReleased: row.is_released,
    audioUrl,
    audioPath: row.audio_path,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}
