'use client';

import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef(null);

  const play = useCallback((song, list = []) => {
    setCurrentSong(song);
    setQueue(list.length ? list : (song ? [song] : []));
    setIsPlaying(true);
    // Actual <audio> src / play() runs in PlayerAudio useLayoutEffect so the ref and
    // metadata are always in sync (avoids silent failures when ref or load state races).
  }, []);

  const playNext = useCallback(() => {
    if (!currentSong || !queue.length) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    let nextIdx = idx < 0 ? 0 : idx + 1;
    if (isShuffled && queue.length > 1) {
      nextIdx = Math.floor(Math.random() * queue.length);
      if (queue[nextIdx]?.id === currentSong.id && queue.length > 1)
        nextIdx = (nextIdx + 1) % queue.length;
    }
    const next = queue[nextIdx];
    if (next) play(next, queue);
    else setIsPlaying(false);
  }, [currentSong, queue, isShuffled, play]);

  const playPrev = useCallback(() => {
    if (!audioRef.current || !currentSong) return;
    const trimStart = currentSong.startTimeSeconds ?? 0;
    if (audioRef.current.currentTime > trimStart + 2) {
      try {
        audioRef.current.currentTime = trimStart;
      } catch (_) {
        /* ignore */
      }
      return;
    }
    if (!queue.length) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    const prevIdx = idx <= 0 ? queue.length - 1 : idx - 1;
    const prev = queue[prevIdx];
    if (prev) play(prev, queue);
  }, [currentSong, queue, play]);

  const togglePlayPause = useCallback(() => {
    if (!currentSong?.audioUrl) return;
    setIsPlaying((p) => !p);
  }, [currentSong?.audioUrl]);

  const addToQueue = useCallback((song) => {
    if (!currentSong && queue.length === 0) {
      play(song, [song]);
      return;
    }
    setQueue(prev => {
      if (prev.some(s => s.id === song.id)) return prev;
      return [...prev, song];
    });
  }, [currentSong, queue.length, play]);

  const addToQueueNext = useCallback((song) => {
    if (!currentSong && queue.length === 0) {
      play(song, [song]);
      return;
    }
    setQueue(prev => {
      const rest = prev.filter(s => s.id !== song.id);
      const idx = currentSong ? rest.findIndex(s => s.id === currentSong.id) : -1;
      const at = idx < 0 ? 0 : idx + 1;
      return [...rest.slice(0, at), song, ...rest.slice(at)];
    });
  }, [currentSong, queue.length, play]);

  const removeFromQueue = useCallback((songId) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  }, []);

  const seek = useCallback((value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setProgress(value);
    }
  }, []);

  const setVol = useCallback((v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const value = {
    audioRef,
    currentSong,
    queue,
    isPlaying,
    isLooping,
    isShuffled,
    progress,
    duration,
    volume,
    setCurrentSong,
    setQueue,
    setIsPlaying,
    setIsLooping,
    setIsShuffled,
    setProgress,
    setDuration,
    setVolume,
    play,
    playNext,
    playPrev,
    togglePlayPause,
    addToQueue,
    addToQueueNext,
    removeFromQueue,
    seek,
    setVolume: setVol,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerAudio />
    </PlayerContext.Provider>
  );
}

function PlayerAudio() {
  const { audioRef, currentSong, isPlaying, isLooping, playNext, setProgress, setDuration, volume } = usePlayer();
  const lastTrackKeyRef = useRef('');
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [audioRef, isLooping]);

  React.useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [audioRef, volume]);

  useLayoutEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!currentSong?.audioUrl) {
      el.pause();
      el.removeAttribute('src');
      lastTrackKeyRef.current = '';
      return;
    }

    const key = `${currentSong.id}|${currentSong.audioUrl}`;
    const needReload = lastTrackKeyRef.current !== key;
    lastTrackKeyRef.current = key;

    const applyStartAndMaybePlay = () => {
      const song = currentSongRef.current;
      const start = song?.startTimeSeconds ?? 0;
      const d = el.duration;
      setDuration(Number.isFinite(d) ? d : 0);
      try {
        el.currentTime = start;
      } catch (_) {
        /* seek before buffer ready */
      }
      if (isPlayingRef.current) {
        void el.play().catch((e) => console.warn('[Player] play() failed', e?.message));
      } else {
        el.pause();
      }
    };

    if (needReload) {
      el.src = currentSong.audioUrl;
      const onMeta = () => applyStartAndMaybePlay();
      el.addEventListener('loadedmetadata', onMeta, { once: true });
      el.load();
      return () => {
        el.removeEventListener('loadedmetadata', onMeta);
      };
    }
    if (isPlaying) {
      void el.play().catch((e) => console.warn('[Player] play() failed', e?.message));
    } else {
      el.pause();
    }
  }, [audioRef, currentSong?.id, currentSong?.audioUrl, currentSong?.startTimeSeconds, isPlaying, setDuration]);

  const handleTimeUpdate = React.useCallback(() => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setProgress(t);
    const end = currentSong?.endTimeSeconds;
    const endOk = end != null && Number.isFinite(end) && end > 0.25;
    if (endOk && t >= end - 0.1) {
      audioRef.current.pause();
      if (!isLooping) playNext();
    }
  }, [currentSong?.endTimeSeconds, isLooping, playNext, setProgress]);

  const handleCanPlay = React.useCallback(() => {
    if (!audioRef.current || currentSong?.startTimeSeconds == null) return;
    try {
      audioRef.current.currentTime = currentSong.startTimeSeconds;
    } catch (_) {
      /* ignore */
    }
  }, [currentSong?.id, currentSong?.startTimeSeconds]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={() => {
        const el = audioRef.current;
        if (!el) return;
        const d = el.duration;
        setDuration(Number.isFinite(d) ? d : 0);
      }}
      onCanPlay={handleCanPlay}
      onEnded={() => {
        if (!isLooping) playNext();
      }}
    />
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
