'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

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
    if (song?.audioUrl && audioRef.current) {
      audioRef.current.src = song.audioUrl;
      audioRef.current.volume = volume;
      audioRef.current.currentTime = song.startTimeSeconds ?? 0;
      audioRef.current.play();
    }
  }, [volume]);

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
    if (!audioRef.current) return;
    if (audioRef.current.currentTime > 2) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (!currentSong || !queue.length) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    const prevIdx = idx <= 0 ? queue.length - 1 : idx - 1;
    const prev = queue[prevIdx];
    if (prev) play(prev, queue);
  }, [currentSong, queue, play]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

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
  const { audioRef, currentSong, isLooping, playNext, setProgress, setDuration } = usePlayer();

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [audioRef, isLooping]);

  const handleTimeUpdate = React.useCallback(() => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setProgress(t);
    const end = currentSong?.endTimeSeconds;
    if (end != null && t >= end - 0.1) {
      audioRef.current.pause();
      if (!isLooping) playNext();
    }
  }, [currentSong?.endTimeSeconds, isLooping, playNext, setProgress]);

  const handleCanPlay = React.useCallback(() => {
    if (audioRef.current && currentSong?.startTimeSeconds != null) {
      audioRef.current.currentTime = currentSong.startTimeSeconds;
    }
  }, [currentSong?.id, currentSong?.startTimeSeconds]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
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
