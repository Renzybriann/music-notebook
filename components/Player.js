'use client';

import React, { useState } from 'react';
import { Play, Pause, Repeat, SkipBack, SkipForward, Shuffle, Music, Volume2, List, X } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function Player() {
  const {
    currentSong,
    queue,
    isPlaying,
    isLooping,
    isShuffled,
    progress,
    duration,
    volume,
    togglePlayPause,
    playNext,
    playPrev,
    play,
    setIsLooping,
    setIsShuffled,
    seek,
    setVolume,
    removeFromQueue,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSong) return null;

  const queueAfterCurrent = queue.length
    ? queue.slice(queue.findIndex(s => s.id === currentSong.id) + 1)
    : [];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white p-4 md:p-5"
      style={{
        borderTop: '4px solid #4A5FBF',
        boxShadow: '0 -8px 20px rgba(0,0,0,0.1)',
      }}
      role="region"
      aria-label="Music player"
    >
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Progress bar */}
        {(() => {
          const min = currentSong?.startTimeSeconds ?? 0;
          const max = currentSong?.endTimeSeconds ?? (duration || 100);
          const displayMax = max || 100;
          return (
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>
              <span className="w-10 tabular-nums">{formatTime(progress)}</span>
              <input
                type="range"
                min={min}
                max={displayMax}
                value={Math.min(Math.max(progress, min), displayMax)}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 h-2 rounded accent-[#4A5FBF] cursor-pointer"
                aria-label="Seek"
              />
              <span className="w-10 tabular-nums text-right">{formatTime(displayMax)}</span>
            </div>
          );
        })()}

        <div className="flex items-center gap-4 md:gap-6 flex-wrap">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              border: '3px dashed #DC3545',
              background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 5px, #FFD4B8 5px, #FFD4B8 10px)',
            }}
          >
            <Music size={28} style={{ color: '#DC3545' }} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg md:text-xl truncate" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>
              ♪ {currentSong.title}
            </h4>
            <p className="text-sm md:text-base text-gray-600 truncate" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              {currentSong.artist || 'My song'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShuffled(!isShuffled)}
              className="p-2 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-#4A5FBF cursor-pointer"
              style={{
                backgroundColor: isShuffled ? '#DC3545' : 'transparent',
                color: isShuffled ? 'white' : '#4A5FBF',
                border: `2px solid ${isShuffled ? '#A02030' : '#4A5FBF'}`,
              }}
              aria-pressed={isShuffled}
              aria-label={isShuffled ? 'Disable shuffle' : 'Enable shuffle'}
            >
              <Shuffle size={20} />
            </button>
            <button
              type="button"
              onClick={playPrev}
              className="p-2 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-#4A5FBF cursor-pointer"
              style={{ color: '#4A5FBF', border: '2px solid #4A5FBF' }}
              aria-label="Previous track"
            >
              <SkipBack size={24} />
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              className="p-3 md:p-4 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-#4A5FBF cursor-pointer"
              style={{
                backgroundColor: '#4A5FBF',
                color: 'white',
                border: '3px solid #2C3E8F',
                boxShadow: '4px 4px 0px #2C3E8F',
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <button
              type="button"
              onClick={playNext}
              className="p-2 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-#4A5FBF cursor-pointer"
              style={{ color: '#4A5FBF', border: '2px solid #4A5FBF' }}
              aria-label="Next track"
            >
              <SkipForward size={24} />
            </button>
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className="p-2 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-#4A5FBF cursor-pointer"
              style={{
                backgroundColor: isLooping ? '#DC3545' : 'transparent',
                color: isLooping ? 'white' : '#4A5FBF',
                border: `2px solid ${isLooping ? '#A02030' : '#4A5FBF'}`,
              }}
              aria-pressed={isLooping}
              aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
            >
              <Repeat size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Volume">
            <Volume2 size={20} style={{ color: '#4A5FBF' }} aria-hidden />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 md:w-24 h-2 rounded accent-[#4A5FBF] cursor-pointer"
              aria-label="Volume"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className="p-2 rounded-lg border-2 border-[#4A5FBF] text-[#4A5FBF] hover:bg-[#4A5FBF] hover:text-white transition cursor-pointer flex items-center gap-1"
            aria-label={showQueue ? 'Hide queue' : 'Show queue'}
            title="Queue"
          >
            <List size={20} />
            {queueAfterCurrent.length > 0 && (
              <span className="text-xs font-bold">{queueAfterCurrent.length}</span>
            )}
          </button>
        </div>
      </div>

      {showQueue && (
        <div className="mt-4 p-4 bg-[#FFF8F0] rounded-xl border-2 border-[#4A5FBF] max-h-48 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}>Up Next</span>
            <button type="button" onClick={() => setShowQueue(false)} className="p-1 cursor-pointer" aria-label="Close queue"><X size={18} /></button>
          </div>
          <ul className="space-y-1">
            {queueAfterCurrent.length === 0 ? (
              <li className="text-sm text-gray-500" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Nothing queued</li>
            ) : (
              queueAfterCurrent.map(song => (
                <li key={song.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-white/50">
                  <button
                    type="button"
                    onClick={() => play(song, queue)}
                    className="flex-1 text-left truncate cursor-pointer"
                    style={{ fontFamily: 'Comic Sans MS, cursive', color: '#4A5FBF' }}
                  >
                    ♪ {song.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(song.id)}
                    className="p-1 text-gray-500 hover:text-red-500 cursor-pointer shrink-0"
                    aria-label={`Remove ${song.title} from queue`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
