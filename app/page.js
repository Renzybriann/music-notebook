'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, Upload, Plus, Music, User, Home, Image as ImageIcon, Search, Pencil, Trash2,
  ListPlus, ListOrdered, GripVertical, X, FileText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import AuthForm from '@/components/AuthForm';
import Player from '@/components/Player';
import * as data from '@/lib/data';

const LOAD_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 180_000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

const inputStyle = {
  fontFamily: 'Comic Sans MS, cursive',
  border: '3px solid #4A5FBF',
  borderRadius: '10px',
  outline: 'none',
  width: '100%',
  padding: '12px 16px',
  fontSize: '1rem',
  color: '#374151',
};

const btnPrimary = {
  fontFamily: 'Comic Sans MS, cursive',
  padding: '12px 24px',
  borderRadius: '12px',
  border: '3px solid #2C3E8F',
  backgroundColor: '#4A5FBF',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '4px 4px 0px #2C3E8F',
};

const btnSecondary = {
  fontFamily: 'Comic Sans MS, cursive',
  padding: '12px 24px',
  borderRadius: '12px',
  border: '3px solid #4A5FBF',
  backgroundColor: '#E8D4C0',
  color: '#4A5FBF',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default function MusicNotebook() {
  const { user, profile, displayName, signOut, updateProfile, isSupabaseConfigured } = useAuth();
  const { play, addToQueue, addToQueueNext } = usePlayer();

  const [currentView, setCurrentView] = useState('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReleased, setFilterReleased] = useState('all'); // all | released | unreleased

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [savingSong, setSavingSong] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'song'|'album', id, name }

  const [newSong, setNewSong] = useState({ title: '', duration: '', durationSeconds: null, startTimeSeconds: 0, endTimeSeconds: null, isReleased: false, notes: '', audioFile: null, audioUrl: null });
  const [newAlbum, setNewAlbum] = useState({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null });
  const audioInputRef = useRef(null);
  const albumCoverInputRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await withTimeout(
        Promise.all([data.getSongs(user.id), data.getAlbums(user.id)]),
        LOAD_TIMEOUT_MS,
        'Loading took too long. Check your network, that your Supabase project is not paused, and that Storage buckets and policies match the docs.'
      );
      setSongs(s);
      setAlbums(a);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const songById = useMemo(() => Object.fromEntries(songs.map(s => [s.id, s])), [songs]);
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s => s.title?.toLowerCase().includes(q));
    }
    if (filterReleased === 'released') list = list.filter(s => s.isReleased);
    if (filterReleased === 'unreleased') list = list.filter(s => !s.isReleased);
    return list;
  }, [songs, searchQuery, filterReleased]);

  const selectedAlbum = useMemo(() => albums.find(a => a.id === selectedAlbumId), [albums, selectedAlbumId]);
  const albumSongsOrdered = useMemo(() => {
    if (!selectedAlbum) return [];
    return selectedAlbum.songs.map(id => songById[id]).filter(Boolean);
  }, [selectedAlbum, songById]);

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      const audioUrl = URL.createObjectURL(file);
      setNewSong(prev => ({ ...prev, audioFile: file, audioUrl }));
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        const sec = Math.floor(audio.duration);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const maxEnd = Math.min(60, sec);
        setNewSong(prev => ({ ...prev, duration: `${m}:${s.toString().padStart(2, '0')}`, durationSeconds: sec, startTimeSeconds: 0, endTimeSeconds: maxEnd }));
      });
    } else {
      setError('Please select a valid audio file (MP3, WAV, etc.)');
    }
  };

  const handleAlbumCoverChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setNewAlbum(prev => ({ ...prev, coverImage: file, coverImageUrl: URL.createObjectURL(file) }));
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleUploadSong = async () => {
    if (!newSong.title || !newSong.audioUrl) {
      setError('Please fill in title and upload an audio file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const created = await withTimeout(
        data.uploadSong(user.id, {
          title: newSong.title,
          durationDisplay: newSong.duration,
          durationSeconds: newSong.durationSeconds,
          isReleased: newSong.isReleased,
          notes: newSong.notes || null,
          audioFile: newSong.audioFile,
          startTimeSeconds: newSong.startTimeSeconds ?? null,
          endTimeSeconds: newSong.endTimeSeconds ?? null,
        }),
        UPLOAD_TIMEOUT_MS,
        'Upload timed out. Try a smaller file, check your connection, and confirm the audio Storage bucket exists with upload policies for your account.'
      );
      setSongs(prev => [created, ...prev]);
      setNewSong({ title: '', duration: '', durationSeconds: null, startTimeSeconds: 0, endTimeSeconds: null, isReleased: false, notes: '', audioFile: null, audioUrl: null });
      setShowUploadModal(false);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateSong = async () => {
    if (!editingSong) return;
    setSavingSong(true);
    setError(null);
    try {
      const updated = await data.updateSong(user.id, editingSong.id, {
        title: editingSong.title,
        durationDisplay: editingSong.duration,
        durationSeconds: editingSong.durationSeconds,
        isReleased: editingSong.isReleased,
        notes: editingSong.notes ?? '',
        startTimeSeconds: editingSong.startTimeSeconds ?? null,
        endTimeSeconds: editingSong.endTimeSeconds ?? null,
      });
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditingSong(null);
    } catch (e) {
      setError(e.message || 'Update failed');
    } finally {
      setSavingSong(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!deleteTarget || deleteTarget.type !== 'song') return;
    setDeleting(true);
    setError(null);
    try {
      await data.deleteSong(user.id, deleteTarget.id);
      setSongs(prev => prev.filter(s => s.id !== deleteTarget.id));
      setAlbums(prev => prev.map(a => ({ ...a, songs: a.songs.filter(id => id !== deleteTarget.id) })));
      setDeleteTarget(null);
    } catch (e) {
      setError(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbum.name || newAlbum.selectedSongs.length === 0) {
      setError('Enter album name and select at least one song');
      return;
    }
    setCreatingAlbum(true);
    setError(null);
    try {
      const created = await data.createAlbum(user.id, {
        name: newAlbum.name,
        coverFile: newAlbum.coverImage,
        songIds: newAlbum.selectedSongs,
      });
      setAlbums(prev => [created, ...prev]);
      setNewAlbum({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null });
      setShowAlbumModal(false);
    } catch (e) {
      setError(e.message || 'Create album failed');
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleUpdateAlbum = async () => {
    if (!editingAlbum) return;
    setSavingAlbum(true);
    setError(null);
    try {
      const updated = await data.updateAlbum(user.id, editingAlbum.id, {
        name: editingAlbum.name,
        coverFile: editingAlbum.coverImage || undefined,
        songIds: editingAlbum.selectedSongs,
      });
      setAlbums(prev => prev.map(a => a.id === updated.id ? updated : a));
      if (selectedAlbumId === editingAlbum.id) setSelectedAlbumId(null);
      setEditingAlbum(null);
    } catch (e) {
      setError(e.message || 'Update failed');
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!deleteTarget || deleteTarget.type !== 'album') return;
    setDeleting(true);
    setError(null);
    try {
      await data.deleteAlbum(user.id, deleteTarget.id);
      setAlbums(prev => prev.filter(a => a.id !== deleteTarget.id));
      if (selectedAlbumId === deleteTarget.id) setSelectedAlbumId(null);
      setDeleteTarget(null);
    } catch (e) {
      setError(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleAlbumTrackOrder = async (orderedSongIds) => {
    if (!selectedAlbum) return;
    setLoading(true);
    setError(null);
    try {
      await data.updateAlbumSongOrder(user.id, selectedAlbum.id, orderedSongIds);
      setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, songs: orderedSongIds } : a));
    } catch (e) {
      setError(e.message || 'Reorder failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSongInAlbum = (songId) => {
    setNewAlbum(prev => ({
      ...prev,
      selectedSongs: prev.selectedSongs.includes(songId)
        ? prev.selectedSongs.filter(id => id !== songId)
        : [...prev.selectedSongs, songId],
    }));
  };

  const playSong = (song, list) => {
    const listToUse = list && list.length ? list : filteredSongs;
    if (song.audioUrl) play(song, listToUse);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6" style={{
        background: '#FFF8F0',
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E8D4C0 31px, #E8D4C0 32px)',
      }}>
        {!isSupabaseConfigured && (
          <p className="text-center max-w-md text-amber-800 bg-amber-100 border-2 border-amber-500 rounded-xl px-4 py-3" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            Supabase is not configured. Copy <code className="bg-amber-200 px-1">.env.example</code> to <code className="bg-amber-200 px-1">.env.local</code> and set <code className="bg-amber-200 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-200 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from your project dashboard.
          </p>
        )}
        <AuthForm />
      </div>
    );
  }

  const navStyle = (active) => ({
    fontFamily: 'Comic Sans MS, cursive',
    color: active ? '#DC3545' : '#4A5FBF',
    transform: active ? 'rotate(-1deg)' : 'rotate(1deg)',
    textDecoration: active ? 'underline wavy #DC3545' : 'none',
  });

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: '#FFF8F0',
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E8D4C0 31px, #E8D4C0 32px)',
      }}
    >
      <div className="fixed top-10 left-20 text-blue-600 opacity-40 text-2xl" aria-hidden>✦</div>
      <div className="fixed top-32 right-32 text-blue-600 opacity-30 text-xl" aria-hidden>✧</div>
      <div className="fixed bottom-40 left-40 text-blue-600 opacity-35 text-lg" aria-hidden>✦</div>
      <div className="fixed top-1/2 right-20 text-blue-600 opacity-25 text-2xl" aria-hidden>✧</div>

      <header className="relative pt-8 pb-6 px-6 border-b-2 border-blue-400" style={{ borderStyle: 'dashed' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF', textShadow: '2px 2px 0px rgba(74, 95, 191, 0.1)', transform: 'rotate(-1deg)' }}>
            ♪ MUSIC NOTEBOOK ♪
          </h1>
          <nav className="flex justify-center gap-6 md:gap-8 mt-6 flex-wrap" role="navigation" aria-label="Main">
            <button type="button" onClick={() => { setCurrentView('home'); setSelectedAlbumId(null); }} className="px-6 py-3 text-lg font-bold transition hover:scale-105" style={navStyle(currentView === 'home')}>
              <Home size={20} className="inline mr-2" aria-hidden /> Home
            </button>
            <button type="button" onClick={() => setCurrentView('profile')} className="px-6 py-3 text-lg font-bold transition hover:scale-105" style={navStyle(currentView === 'profile')}>
              <User size={20} className="inline mr-2" aria-hidden /> Profile
            </button>
            <button type="button" onClick={() => signOut()} className="px-4 py-2 text-base font-bold transition hover:scale-105" style={btnSecondary}>
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 pb-40">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border-2 border-red-400 text-red-800 flex justify-between items-center" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="text-[#374151]"><X size={20} /></button>
          </div>
        )}
        {loading && (
          <p className="text-center py-4" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Loading...</p>
        )}

        {currentView === 'profile' && !selectedAlbumId && (
          <div className="space-y-8">
            <div className="relative p-6 md:p-8 bg-white rounded-lg" style={{ border: '3px solid #4A5FBF', borderStyle: 'dashed', boxShadow: '8px 8px 0px rgba(74, 95, 191, 0.2)', transform: 'rotate(-0.5deg)' }}>
              <div className="flex items-start gap-6 flex-wrap">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl md:text-6xl" style={{ background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 10px, #FFD4B8 10px, #FFD4B8 20px)', border: '4px solid #4A5FBF' }}>🎤</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545' }}>{displayName}</h2>
                  <p className="text-base md:text-lg mb-4" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>✎ {profile?.bio || 'Your music notebook'}</p>
                  <p className="text-base" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}><span className="font-bold text-xl text-[#DC3545]">{songs.length}</span> Songs</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <button type="button" onClick={() => setShowUploadModal(true)} style={btnPrimary} className="flex items-center gap-2">
                <Upload size={20} aria-hidden /> Upload Song
              </button>
              <button type="button" onClick={() => setShowAlbumModal(true)} style={{ ...btnPrimary, backgroundColor: '#DC3545', borderColor: '#A02030', boxShadow: '5px 5px 0px #A02030' }} className="flex items-center gap-2">
                <Plus size={20} aria-hidden /> Create Album
              </button>
            </div>

            <section aria-label="Albums">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 flex items-center" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF', transform: 'rotate(-1deg)' }}>
                <span className="mr-3">📚</span> My Albums <span className="ml-3">✦</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {albums.map((album, idx) => (
                  <button
                    type="button"
                    key={album.id}
                    onClick={() => setSelectedAlbumId(album.id)}
                    className="bg-white p-4 md:p-5 text-left rounded-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-#4A5FBF"
                    style={{ border: '3px solid #4A5FBF', boxShadow: '6px 6px 0px rgba(74, 95, 191, 0.3)', transform: `rotate(${idx % 2 === 0 ? '-1deg' : '1deg'})` }}
                  >
                    <div className="w-full aspect-square rounded-lg flex items-center justify-center text-5xl md:text-6xl mb-3 overflow-hidden" style={{ background: album.coverImage ? 'transparent' : 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 10px, #FFD4B8 10px, #FFD4B8 20px)', border: '2px dashed #DC3545' }}>
                      {album.coverImage ? <img src={album.coverImage} alt="" className="w-full h-full object-cover" /> : '🎵'}
                    </div>
                    <h4 className="font-bold text-lg truncate" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545' }}>{album.name}</h4>
                    <p className="text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>♪ {album.songs.length} songs</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {currentView === 'home' && (
          <div className="space-y-10">
            <section aria-label="All songs">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 flex items-center" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545', transform: 'rotate(1deg)' }}>
                <span className="mr-3">🎵</span> All Songs <span className="ml-3">♫</span>
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-[#4A5FBF] text-[#374151]"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                    aria-label="Search songs"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'released', 'unreleased'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterReleased(f)}
                      className="px-4 py-2 rounded-lg font-bold capitalize border-2 border-[#4A5FBF] transition"
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: filterReleased === f ? '#4A5FBF' : 'transparent',
                        color: filterReleased === f ? 'white' : '#4A5FBF',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filteredSongs.map((song, idx) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-xl flex-wrap"
                    style={{ border: '2px solid #4A5FBF', boxShadow: '4px 4px 0px rgba(74, 95, 191, 0.2)', transform: `rotate(${idx % 2 === 0 ? '0.5deg' : '-0.5deg'})` }}
                  >
                    <button
                      type="button"
                      onClick={() => playSong(song)}
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition hover:scale-105"
                      style={{ border: '2px dashed #DC3545', background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 5px, #FFD4B8 5px, #FFD4B8 10px)' }}
                      aria-label={`Play ${song.title}`}
                    >
                      <Play size={24} style={{ color: '#DC3545' }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg flex items-center gap-2 flex-wrap" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>
                        {song.title}
                        {!song.isReleased && <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FFE8D6', color: '#DC3545', border: '2px solid #DC3545' }}>★ Unreleased</span>}
                        {song.notes && <FileText size={14} className="text-gray-500" title="Has notes" aria-hidden />}
                      </h4>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{song.duration}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); addToQueueNext(song); }} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" title="Play next" aria-label={`Play ${song.title} next`}><ListOrdered size={18} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); addToQueue(song); }} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" title="Add to queue" aria-label={`Add ${song.title} to queue`}><ListPlus size={18} /></button>
                      <button type="button" onClick={() => setEditingSong({ ...song })} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" aria-label={`Edit ${song.title}`}><Pencil size={18} /></button>
                      <button type="button" onClick={() => setDeleteTarget({ type: 'song', id: song.id, name: song.title })} className="p-2 rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition" aria-label={`Delete ${song.title}`}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {currentView === 'profile' && selectedAlbumId && selectedAlbum && (
          <div className="space-y-6">
            <button type="button" onClick={() => setSelectedAlbumId(null)} className="text-lg font-bold flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>
              ← Back to albums
            </button>
            <div className="flex flex-wrap items-start gap-6">
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '3px dashed #DC3545', boxShadow: '6px 6px 0px rgba(74, 95, 191, 0.3)' }}>
                {selectedAlbum.coverImage ? <img src={selectedAlbum.coverImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 10px, #FFD4B8 10px, #FFD4B8 20px)' }}>🎵</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545' }}>{selectedAlbum.name}</h2>
                <p className="text-lg mb-4" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>♪ {albumSongsOrdered.length} tracks</p>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" onClick={() => setEditingAlbum({ ...selectedAlbum, selectedSongs: selectedAlbum.songs, coverImage: null, coverImageUrl: selectedAlbum.coverImage })} style={btnSecondary} className="flex items-center gap-2"><Pencil size={18} /> Edit</button>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'album', id: selectedAlbum.id, name: selectedAlbum.name })} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition"><Trash2 size={18} /> Delete</button>
                </div>
              </div>
            </div>
            <h4 className="text-xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Tracks (drag to reorder)</h4>
            <AlbumTrackList
              albumId={selectedAlbum.id}
              albumSongsOrdered={albumSongsOrdered}
              onReorder={handleAlbumTrackOrder}
              onPlay={(song) => playSong(song, albumSongsOrdered)}
              onEdit={(song) => setEditingSong({ ...song })}
              onDelete={(song) => setDeleteTarget({ type: 'song', id: song.id, name: song.title })}
              onPlayNext={addToQueueNext}
              onAddToQueue={addToQueue}
            />
          </div>
        )}
      </div>

      <Player />

      {/* Upload Song Modal */}
      {showUploadModal && (
        <Modal title="♪ Upload Song ♪" onClose={() => { if (!uploading) { setShowUploadModal(false); setNewSong({ title: '', duration: '', durationSeconds: null, startTimeSeconds: 0, endTimeSeconds: null, isReleased: false, notes: '', audioFile: null, audioUrl: null }); } }}>
          <UploadSongForm
            newSong={newSong}
            onAudioChange={handleAudioFileChange}
            onTitleChange={(v) => setNewSong(prev => ({ ...prev, title: v }))}
            onStartChange={(v) => setNewSong(prev => {
              const total = prev.durationSeconds ?? 0;
              const maxEnd = Math.min(v + 60, total);
              const newEnd = Math.min(Math.max(prev.endTimeSeconds ?? maxEnd, v + 0.5), maxEnd);
              return { ...prev, startTimeSeconds: v, endTimeSeconds: newEnd };
            })}
            onEndChange={(v) => setNewSong(prev => {
              const newStart = Math.max(Math.min(prev.startTimeSeconds ?? 0, v - 0.5), Math.max(0, v - 60));
              return { ...prev, endTimeSeconds: v, startTimeSeconds: newStart };
            })}
            onReleasedChange={(v) => setNewSong(prev => ({ ...prev, isReleased: v }))}
            onNotesChange={(v) => setNewSong(prev => ({ ...prev, notes: v }))}
            audioInputRef={audioInputRef}
          />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleUploadSong} disabled={uploading} style={btnPrimary} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed">
              {uploading ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                  Uploading...
                </>
              ) : (
                'Upload!'
              )}
            </button>
            <button type="button" onClick={() => { setShowUploadModal(false); setNewSong({ title: '', duration: '', durationSeconds: null, startTimeSeconds: 0, endTimeSeconds: null, isReleased: false, notes: '', audioFile: null, audioUrl: null }); }} disabled={uploading} style={btnSecondary} className="flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Edit Song Modal */}
      {editingSong && (
        <Modal title="♪ Edit Song ♪" onClose={() => { if (!savingSong) setEditingSong(null); }}>
          <div className="space-y-4">
            <input type="text" placeholder="Song title" value={editingSong.title} onChange={(e) => setEditingSong(prev => ({ ...prev, title: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="Duration" value={editingSong.duration} readOnly className="bg-gray-100" style={inputStyle} />
            {editingSong.duration_seconds > 0 && (
              <EditSongTrim editingSong={editingSong} setEditingSong={setEditingSong} formatSec={formatSec} btnSecondary={btnSecondary} />
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={editingSong.isReleased} onChange={(e) => setEditingSong(prev => ({ ...prev, isReleased: e.target.checked }))} />
              <span style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Mark as released</span>
            </label>
            <div>
              <label className="block font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Notes / Lyrics</label>
              <textarea placeholder="Notes or lyrics..." value={editingSong.notes ?? ''} onChange={(e) => setEditingSong(prev => ({ ...prev, notes: e.target.value }))} rows={4} style={inputStyle} className="resize-y" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleUpdateSong} disabled={savingSong} style={btnPrimary} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed">
              {savingSong ? (<><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />Saving...</>) : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingSong(null)} disabled={savingSong} style={btnSecondary} className="flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Create Album Modal */}
      {showAlbumModal && (
        <Modal title="📚 Create Album 📚" onClose={() => { if (!creatingAlbum) { setShowAlbumModal(false); setNewAlbum({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null }); } }}>
          <CreateEditAlbumForm
            name={newAlbum.name}
            onNameChange={(v) => setNewAlbum(prev => ({ ...prev, name: v }))}
            coverImageUrl={newAlbum.coverImageUrl}
            onCoverChange={handleAlbumCoverChange}
            albumCoverInputRef={albumCoverInputRef}
            selectedSongs={newAlbum.selectedSongs}
            toggleSong={toggleSongInAlbum}
            songs={songs}
          />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleCreateAlbum} disabled={creatingAlbum} style={{ ...btnPrimary, backgroundColor: '#DC3545', borderColor: '#A02030', boxShadow: '4px 4px 0px #A02030' }} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed">
              {creatingAlbum ? (<><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />Creating...</>) : 'Create!'}
            </button>
            <button type="button" onClick={() => { setShowAlbumModal(false); setNewAlbum({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null }); }} disabled={creatingAlbum} style={btnSecondary} className="flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Edit Album Modal */}
      {editingAlbum && (
        <Modal title="📚 Edit Album 📚" onClose={() => { if (!savingAlbum) setEditingAlbum(null); }}>
          <CreateEditAlbumForm
            name={editingAlbum.name}
            onNameChange={(v) => setEditingAlbum(prev => ({ ...prev, name: v }))}
            coverImageUrl={editingAlbum.coverImageUrl}
            onCoverChange={(e) => { const file = e.target.files?.[0]; if (file) setEditingAlbum(prev => ({ ...prev, coverImage: file, coverImageUrl: URL.createObjectURL(file) })); }}
            albumCoverInputRef={albumCoverInputRef}
            selectedSongs={editingAlbum.selectedSongs}
            toggleSong={(id) => setEditingAlbum(prev => ({ ...prev, selectedSongs: prev.selectedSongs.includes(id) ? prev.selectedSongs.filter(i => i !== id) : [...prev.selectedSongs, id] }))}
            songs={songs}
          />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleUpdateAlbum} disabled={savingAlbum} style={{ ...btnPrimary, backgroundColor: '#DC3545', borderColor: '#A02030' }} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed">
              {savingAlbum ? (<><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />Saving...</>) : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingAlbum(null)} disabled={savingAlbum} style={btnSecondary} className="flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal title="Delete?" onClose={() => { if (!deleting) setDeleteTarget(null); }}>
          <p className="text-lg mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Delete &quot;{deleteTarget.name}&quot;? This cannot be undone.</p>
          <div className="flex gap-3">
            <button type="button" onClick={deleteTarget.type === 'song' ? handleDeleteSong : handleDeleteAlbum} disabled={deleting} className="flex-1 py-3 font-bold text-white rounded-xl bg-red-500 border-2 border-red-700 hover:bg-red-600 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed">
              {deleting ? (<><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />Deleting...</>) : 'Delete'}
            </button>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} style={btnSecondary} className="flex-1">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl shadow-xl border-4 border-[#4A5FBF]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 id="modal-title" className="text-2xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#DC3545' }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-[#374151]" aria-label="Close"><X size={24} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const formatSec = (s) => {
  if (s == null || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const TRIM_MAX_SEC = 60;

function UploadSongForm({ newSong, onAudioChange, onTitleChange, onStartChange, onEndChange, onReleasedChange, onNotesChange, audioInputRef }) {
  const totalSec = newSong.durationSeconds ?? 0;
  const start = newSong.startTimeSeconds ?? 0;
  const end = newSong.endTimeSeconds ?? Math.min(60, totalSec);
  const previewRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  const handlePreview = useCallback(() => {
    if (!newSong.audioUrl || previewRef.current) return;
    const audio = new Audio(newSong.audioUrl);
    previewRef.current = audio;
    audio.currentTime = start;
    audio.ontimeupdate = () => {
      if (audio.currentTime >= end - 0.1) {
        audio.pause();
        audio.ontimeupdate = null;
        previewRef.current = null;
        setPreviewing(false);
      }
    };
    audio.onended = () => { previewRef.current = null; setPreviewing(false); };
    setPreviewing(true);
    audio.play();
  }, [newSong.audioUrl, start, end]);

  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
      setPreviewing(false);
    }
  }, []);

  useEffect(() => () => stopPreview(), [stopPreview]);

  const startSliderMin = Math.max(0, end - TRIM_MAX_SEC);
  const startSliderMax = Math.max(0, end - 0.5);
  const endSliderMin = start + 0.5;
  const endSliderMax = Math.min(totalSec, start + TRIM_MAX_SEC);

  return (
    <div className="space-y-4">
      <input type="file" ref={audioInputRef} accept="audio/*" onChange={onAudioChange} className="hidden" aria-label="Audio file" />
      <button type="button" onClick={() => audioInputRef.current?.click()} className="w-full px-4 py-3 text-lg font-bold flex items-center justify-center gap-2 rounded-xl border-3 border-dashed border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition cursor-pointer" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
        <Music size={20} /> {newSong.audioFile ? `✓ ${newSong.audioFile.name}` : 'Choose Audio File (MP3, WAV)'}
      </button>
      <input type="text" placeholder="Song title..." value={newSong.title} onChange={(e) => onTitleChange(e.target.value)} style={inputStyle} />
      <input type="text" placeholder="Duration (auto)" value={newSong.duration} readOnly className="bg-gray-100" style={inputStyle} />

      {totalSec > 0 && (
        <div className="p-4 rounded-xl border-2 border-dashed border-[#4A5FBF] space-y-3">
          <p className="font-bold text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Trim: max 1 min • Choose start and end (like Instagram)</p>
          <div>
            <label className="block text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Start: {formatSec(start)}</label>
            <input type="range" min={startSliderMin} max={startSliderMax} step={0.5} value={start} onChange={(e) => onStartChange(Number(e.target.value))} className="w-full h-2 rounded accent-[#4A5FBF] cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>End: {formatSec(end)} (max 1:00)</label>
            <input type="range" min={endSliderMin} max={endSliderMax} step={0.5} value={end} onChange={(e) => onEndChange(Number(e.target.value))} className="w-full h-2 rounded accent-[#4A5FBF] cursor-pointer" />
          </div>
          <button type="button" onClick={previewing ? stopPreview : handlePreview} style={btnSecondary} className="w-full flex items-center justify-center gap-2 cursor-pointer">
            {previewing ? <><Pause size={18} /> Stop preview</> : <><Play size={18} /> Preview trim</>}
          </button>
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-dashed border-[#4A5FBF]">
        <input type="checkbox" checked={newSong.isReleased} onChange={(e) => onReleasedChange(e.target.checked)} className="w-5 h-5" />
        <span style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF', fontWeight: 'bold' }}>✓ Mark as Released</span>
      </label>
      <div>
        <label className="block font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Notes / Lyrics (optional)</label>
        <textarea placeholder="Notes or lyrics..." value={newSong.notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} style={inputStyle} className="resize-y" />
      </div>
    </div>
  );
}

function EditSongTrim({ editingSong, setEditingSong, formatSec, btnSecondary }) {
  const start = editingSong.startTimeSeconds ?? 0;
  const end = editingSong.endTimeSeconds ?? (editingSong.duration_seconds ?? 0);
  const totalSec = editingSong.duration_seconds ?? 0;
  const editPreviewRef = useRef(null);
  const [editPreviewing, setEditPreviewing] = useState(false);

  const handleEditPreview = useCallback(() => {
    if (!editingSong.audioUrl || editPreviewRef.current) return;
    const audio = new Audio(editingSong.audioUrl);
    editPreviewRef.current = audio;
    audio.currentTime = start;
    audio.ontimeupdate = () => {
      if (audio.currentTime >= end - 0.1) {
        audio.pause();
        audio.ontimeupdate = null;
        editPreviewRef.current = null;
        setEditPreviewing(false);
      }
    };
    audio.onended = () => { editPreviewRef.current = null; setEditPreviewing(false); };
    setEditPreviewing(true);
    audio.play();
  }, [editingSong.audioUrl, start, end]);

  const stopEditPreview = useCallback(() => {
    if (editPreviewRef.current) {
      editPreviewRef.current.pause();
      editPreviewRef.current = null;
      setEditPreviewing(false);
    }
  }, []);

  useEffect(() => () => stopEditPreview(), [stopEditPreview]);

  const editStartMin = Math.max(0, end - TRIM_MAX_SEC);
  const editStartMax = Math.max(0, end - 0.5);
  const editEndMin = start + 0.5;
  const editEndMax = Math.min(totalSec, start + TRIM_MAX_SEC);

  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-[#4A5FBF] space-y-3">
      <p className="font-bold text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Trim (max 1 min)</p>
      <div>
        <label className="block text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Start: {formatSec(start)}</label>
        <input type="range" min={editStartMin} max={editStartMax} step={0.5} value={start} onChange={(e) => { const v = Number(e.target.value); setEditingSong(prev => ({ ...prev, startTimeSeconds: v, endTimeSeconds: Math.min(Math.max(prev.endTimeSeconds ?? prev.duration_seconds ?? 0, v + 0.5), v + TRIM_MAX_SEC) })); }} className="w-full h-2 rounded accent-[#4A5FBF] cursor-pointer" />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>End: {formatSec(end)}</label>
        <input type="range" min={editEndMin} max={editEndMax} step={0.5} value={end} onChange={(e) => { const v = Number(e.target.value); setEditingSong(prev => ({ ...prev, endTimeSeconds: v, startTimeSeconds: Math.max(Math.min(prev.startTimeSeconds ?? 0, v - 0.5), v - TRIM_MAX_SEC) })); }} className="w-full h-2 rounded accent-[#4A5FBF] cursor-pointer" />
      </div>
      {editingSong.audioUrl && (
        <button type="button" onClick={editPreviewing ? stopEditPreview : handleEditPreview} style={btnSecondary} className="w-full flex items-center justify-center gap-2 cursor-pointer">
          {editPreviewing ? <><Pause size={18} /> Stop preview</> : <><Play size={18} /> Preview trim</>}
        </button>
      )}
    </div>
  );
}

function CreateEditAlbumForm({ name, onNameChange, coverImageUrl, onCoverChange, albumCoverInputRef, selectedSongs, toggleSong, songs }) {
  return (
    <div className="space-y-4">
      <input type="file" ref={albumCoverInputRef} accept="image/*" onChange={onCoverChange} className="hidden" aria-label="Album cover" />
      <button type="button" onClick={() => albumCoverInputRef.current?.click()} className="w-full aspect-square max-h-48 rounded-xl flex items-center justify-center overflow-hidden border-3 border-dashed border-[#DC3545] transition hover:opacity-90" style={{ backgroundColor: coverImageUrl ? 'transparent' : '#FFE8D6' }}>
        {coverImageUrl ? <img src={coverImageUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-[#DC3545]"><ImageIcon size={40} className="mx-auto mb-2" /><span style={{ fontFamily: 'Comic Sans MS, cursive' }}>Upload cover</span></div>}
      </button>
      <input type="text" placeholder="Album name..." value={name} onChange={(e) => onNameChange(e.target.value)} style={inputStyle} />
      <p className="font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Select songs:</p>
      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
        {songs.map(song => (
          <label key={song.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 border-dashed border-[#4A5FBF] hover:bg-[#FFE8D6]" style={{ backgroundColor: selectedSongs.includes(song.id) ? '#FFE8D6' : 'transparent' }}>
            <input type="checkbox" checked={selectedSongs.includes(song.id)} onChange={() => toggleSong(song.id)} className="w-5 h-5" />
            <span className="font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>♪ {song.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function AlbumTrackList({ albumId, albumSongsOrdered, onReorder, onPlay, onEdit, onDelete, onPlayNext, onAddToQueue }) {
  const [order, setOrder] = useState(() => albumSongsOrdered.map(s => s.id));
  const [dragged, setDragged] = useState(null);

  useEffect(() => {
    setOrder(albumSongsOrdered.map(s => s.id));
  }, [albumId, albumSongsOrdered]);

  const orderedSongs = order.map(id => albumSongsOrdered.find(s => s.id === id)).filter(Boolean);
  if (orderedSongs.length === 0) return <p className="text-gray-600" style={{ fontFamily: 'Comic Sans MS, cursive' }}>No tracks in this album.</p>;

  const handleDragStart = (e, id) => { setDragged(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragged || dragged === targetId) return;
    const from = order.indexOf(dragged);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragged);
    setOrder(next);
    onReorder(next);
    setDragged(null);
  };

  return (
    <ul className="space-y-2" aria-label="Album tracks">
      {orderedSongs.map((song) => (
        <li
          key={song.id}
          draggable
          onDragStart={(e) => handleDragStart(e, song.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, song.id)}
          className={`flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-[#4A5FBF] cursor-grab active:cursor-grabbing ${dragged === song.id ? 'opacity-50' : ''}`}
        >
          <GripVertical size={20} className="text-gray-400 flex-shrink-0" aria-hidden />
          <button type="button" onClick={() => onPlay(song)} className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition hover:scale-105" style={{ border: '2px dashed #DC3545', background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 5px, #FFD4B8 5px, #FFD4B8 10px)' }} aria-label={`Play ${song.title}`}><Play size={20} style={{ color: '#DC3545' }} /></button>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold truncate" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>{song.title}</h5>
            <p className="text-sm text-gray-600">{song.duration}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPlayNext(song)} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" aria-label={`Play ${song.title} next`}><ListOrdered size={16} /></button>
            <button type="button" onClick={() => onAddToQueue(song)} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" aria-label={`Add ${song.title} to queue`}><ListPlus size={16} /></button>
            <button type="button" onClick={() => onEdit(song)} className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition" aria-label={`Edit ${song.title}`}><Pencil size={16} /></button>
            <button type="button" onClick={() => onDelete(song)} className="p-2 rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition" aria-label={`Delete ${song.title}`}><Trash2 size={16} /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}
