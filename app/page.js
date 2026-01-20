'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Repeat, Upload, Plus, Music, User, Home, Image as ImageIcon } from 'lucide-react';

export default function MusicNotebook() {
  const [currentView, setCurrentView] = useState('home');
  const [songs, setSongs] = useState([
    { id: 1, title: 'Midnight Dreams', artist: 'Luna Rose', duration: '3:45', album: 'Unreleased', isReleased: false, audioUrl: null },
    { id: 2, title: 'Golden Hour', artist: 'Luna Rose', duration: '4:12', album: 'Summer Vibes', isReleased: true, audioUrl: null },
    { id: 3, title: 'Ocean Waves', artist: 'Luna Rose', duration: '3:28', album: 'Unreleased', isReleased: false, audioUrl: null },
  ]);
  const [albums, setAlbums] = useState([
    { id: 1, name: 'Summer Vibes', songs: [2], coverImage: null },
  ]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newSong, setNewSong] = useState({ 
    title: '', 
    duration: '', 
    isReleased: false, 
    audioFile: null,
    audioUrl: null 
  });
  const [newAlbum, setNewAlbum] = useState({ 
    name: '', 
    selectedSongs: [],
    coverImage: null,
    coverImageUrl: null
  });

  const audioRef = useRef(null);
  const audioInputRef = useRef(null);
  const albumCoverInputRef = useRef(null);

  const userProfile = {
    name: 'Luna Rose',
    bio: 'Indie artist creating dreamy soundscapes',
    followers: '12.5K',
    totalSongs: songs.length,
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      const audioUrl = URL.createObjectURL(file);
      setNewSong(prev => ({ 
        ...prev, 
        audioFile: file,
        audioUrl: audioUrl
      }));
      
      // Get duration from audio file
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        setNewSong(prev => ({ 
          ...prev, 
          duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
        }));
      });
    } else {
      alert('Please select a valid audio file (MP3, WAV, etc.)');
    }
  };

  const handleAlbumCoverChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setNewAlbum(prev => ({ 
        ...prev, 
        coverImage: file,
        coverImageUrl: imageUrl
      }));
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleUploadSong = () => {
    if (newSong.title && newSong.audioUrl) {
      const song = {
        id: songs.length + 1,
        title: newSong.title,
        artist: userProfile.name,
        duration: newSong.duration,
        album: 'Unreleased',
        isReleased: newSong.isReleased,
        audioUrl: newSong.audioUrl
      };
      setSongs([...songs, song]);
      setNewSong({ title: '', duration: '', isReleased: false, audioFile: null, audioUrl: null });
      setShowUploadModal(false);
    } else {
      alert('Please fill in all fields and upload an audio file');
    }
  };

  const handleCreateAlbum = () => {
    if (newAlbum.name && newAlbum.selectedSongs.length > 0) {
      const album = {
        id: albums.length + 1,
        name: newAlbum.name,
        songs: newAlbum.selectedSongs,
        coverImage: newAlbum.coverImageUrl
      };
      setAlbums([...albums, album]);
      setNewAlbum({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null });
      setShowAlbumModal(false);
    } else {
      alert('Please enter album name and select at least one song');
    }
  };

  const toggleSongSelection = (songId) => {
    setNewAlbum(prev => ({
      ...prev,
      selectedSongs: prev.selectedSongs.includes(songId)
        ? prev.selectedSongs.filter(id => id !== songId)
        : [...prev.selectedSongs, songId]
    }));
  };

  const playSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    
    if (song.audioUrl && audioRef.current) {
      audioRef.current.src = song.audioUrl;
      audioRef.current.play();
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  return (
    <div className="min-h-screen relative bg-orange-50" style={{
      background: '#FFF8F0',
      backgroundImage: `
        linear-gradient(to bottom, #FFF8F0 0%, #FFE8D6 100%),
        repeating-linear-gradient(
          transparent,
          transparent 31px,
          #E8D4C0 31px,
          #E8D4C0 32px
        )
      `
    }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => !isLooping && setIsPlaying(false)} />

      {/* Decorative stars */}
      <div className="fixed top-10 left-20 text-blue-600 opacity-40 text-2xl">✦</div>
      <div className="fixed top-32 right-32 text-blue-600 opacity-30 text-xl">✧</div>
      <div className="fixed bottom-40 left-40 text-blue-600 opacity-35 text-lg">✦</div>
      <div className="fixed top-1/2 right-20 text-blue-600 opacity-25 text-2xl">✧</div>

      {/* Header */}
      <header className="relative pt-8 pb-6 px-6 border-b-2 border-blue-400" style={{ borderStyle: 'dashed' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-6" style={{
            fontFamily: 'Comic Sans MS, cursive',
            color: '#4A5FBF',
            textShadow: '2px 2px 0px rgba(74, 95, 191, 0.1)',
            transform: 'rotate(-1deg)'
          }}>
            ♪ MUSIC NOTEBOOK ♪
          </h1>
          
          <nav className="flex justify-center gap-8 mt-6">
            <button
              onClick={() => setCurrentView('home')}
              className="relative px-6 py-3 text-lg font-bold transition"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: currentView === 'home' ? '#DC3545' : '#4A5FBF',
                transform: currentView === 'home' ? 'rotate(-1deg)' : 'rotate(1deg)',
                textDecoration: currentView === 'home' ? 'underline wavy' : 'none',
                textDecorationColor: '#DC3545'
              }}
            >
              <Home size={20} className="inline mr-2" />
              Home
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className="relative px-6 py-3 text-lg font-bold transition"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: currentView === 'profile' ? '#DC3545' : '#4A5FBF',
                transform: currentView === 'profile' ? 'rotate(1deg)' : 'rotate(-1deg)',
                textDecoration: currentView === 'profile' ? 'underline wavy' : 'none',
                textDecorationColor: '#DC3545'
              }}
            >
              <User size={20} className="inline mr-2" />
              Profile
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 pb-32">
        {/* Profile View */}
        {currentView === 'profile' && (
          <div className="space-y-8">
            {/* Profile Card */}
            <div className="relative p-8 bg-white rounded-lg" style={{
              border: '3px solid #4A5FBF',
              borderStyle: 'dashed',
              boxShadow: '8px 8px 0px rgba(74, 95, 191, 0.2)',
              transform: 'rotate(-0.5deg)'
            }}>
              <div className="absolute -top-3 -right-3 text-3xl">✧</div>
              <div className="absolute -bottom-3 -left-3 text-2xl text-red-500">♡</div>
              
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center text-6xl relative" style={{
                    background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 10px, #FFD4B8 10px, #FFD4B8 20px)',
                    border: '4px solid #4A5FBF'
                  }}>
                    🎤
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">♪</div>
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-2" style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#DC3545',
                    textShadow: '2px 2px 0px rgba(220, 53, 69, 0.1)'
                  }}>
                    {userProfile.name}
                  </h2>
                  <p className="text-lg mb-4" style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#4A5FBF'
                  }}>
                    ✎ {userProfile.bio}
                  </p>
                  <div className="flex gap-8 text-base">
                    <div style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                      <span className="font-bold text-2xl" style={{ color: '#DC3545' }}>{userProfile.followers}</span>
                      <span style={{ color: '#4A5FBF' }}> Followers</span>
                    </div>
                    <div style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                      <span className="font-bold text-2xl" style={{ color: '#DC3545' }}>{userProfile.totalSongs}</span>
                      <span style={{ color: '#4A5FBF' }}> Songs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-8 py-4 font-bold text-lg text-white relative transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#4A5FBF',
                  border: '3px solid #2C3E8F',
                  borderRadius: '15px',
                  boxShadow: '5px 5px 0px #2C3E8F',
                  transform: 'rotate(-1deg)'
                }}
              >
                <Upload size={20} className="inline mr-2" />
                Upload Song
              </button>
              <button
                onClick={() => setShowAlbumModal(true)}
                className="px-8 py-4 font-bold text-lg text-white relative transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#DC3545',
                  border: '3px solid #A02030',
                  borderRadius: '15px',
                  boxShadow: '5px 5px 0px #A02030',
                  transform: 'rotate(1deg)'
                }}
              >
                <Plus size={20} className="inline mr-2" />
                Create Album
              </button>
            </div>
          </div>
        )}

        {/* Home View */}
        {currentView === 'home' && (
          <div className="space-y-10">
            {/* Albums Section */}
            <section>
              <h3 className="text-3xl font-bold mb-6 flex items-center" style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#4A5FBF',
                transform: 'rotate(-1deg)'
              }}>
                <span className="mr-3">📚</span>
                My Albums
                <span className="ml-3">✦</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {albums.map((album, idx) => (
                  <div 
                    key={album.id} 
                    className="bg-white p-5 cursor-pointer transition hover:scale-105"
                    style={{
                      border: '3px solid #4A5FBF',
                      borderRadius: '12px',
                      boxShadow: '6px 6px 0px rgba(74, 95, 191, 0.3)',
                      transform: `rotate(${idx % 2 === 0 ? '-1deg' : '1deg'})`
                    }}
                  >
                    <div className="w-full aspect-square rounded-lg flex items-center justify-center text-6xl mb-3 overflow-hidden" style={{
                      background: album.coverImage ? 'transparent' : 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 10px, #FFD4B8 10px, #FFD4B8 20px)',
                      border: '2px dashed #DC3545'
                    }}>
                      {album.coverImage ? (
                        <img src={album.coverImage} alt={album.name} className="w-full h-full object-cover" />
                      ) : (
                        '🎵'
                      )}
                    </div>
                    <h4 className="font-bold text-lg" style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      color: '#DC3545'
                    }}>
                      {album.name}
                    </h4>
                    <p className="text-sm" style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      color: '#4A5FBF'
                    }}>
                      ♪ {album.songs.length} songs
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* All Songs Section */}
            <section>
              <h3 className="text-3xl font-bold mb-6 flex items-center" style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#DC3545',
                transform: 'rotate(1deg)'
              }}>
                <span className="mr-3">🎵</span>
                All Songs
                <span className="ml-3">♫</span>
              </h3>
              <div className="space-y-3">
                {songs.map((song, idx) => (
                  <div
                    key={song.id}
                    onClick={() => playSong(song)}
                    className="flex items-center gap-4 p-4 bg-white cursor-pointer transition hover:scale-102"
                    style={{
                      border: '2px solid #4A5FBF',
                      borderRadius: '10px',
                      boxShadow: '4px 4px 0px rgba(74, 95, 191, 0.2)',
                      transform: `rotate(${idx % 2 === 0 ? '0.5deg' : '-0.5deg'})`
                    }}
                  >
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{
                      border: '2px dashed #DC3545',
                      background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 5px, #FFD4B8 5px, #FFD4B8 10px)'
                    }}>
                      <Music size={24} style={{ color: '#DC3545' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg flex items-center gap-2" style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        color: '#4A5FBF'
                      }}>
                        {song.title}
                        {!song.isReleased && (
                          <span className="text-xs px-3 py-1 rounded-full" style={{
                            backgroundColor: '#FFE8D6',
                            color: '#DC3545',
                            border: '2px solid #DC3545'
                          }}>
                            ★ Unreleased
                          </span>
                        )}
                        {song.audioUrl && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-400">
                            ♪ Audio
                          </span>
                        )}
                      </h4>
                      <p className="text-sm" style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        color: '#666'
                      }}>
                        ✎ {song.artist}
                      </p>
                    </div>
                    <span className="text-base font-bold" style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      color: '#4A5FBF'
                    }}>
                      {song.duration}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Music Player */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-5" style={{
          borderTop: '4px solid #4A5FBF',
          boxShadow: '0 -8px 20px rgba(0,0,0,0.1)'
        }}>
          <div className="max-w-5xl mx-auto flex items-center gap-6">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{
              border: '3px dashed #DC3545',
              background: 'repeating-linear-gradient(45deg, #FFE8D6, #FFE8D6 5px, #FFD4B8 5px, #FFD4B8 10px)'
            }}>
              <Music size={28} style={{ color: '#DC3545' }} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-xl" style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#4A5FBF'
              }}>
                ♪ {currentSong.title}
              </h4>
              <p className="text-base" style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#666'
              }}>
                {currentSong.artist}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className="p-3 rounded-full transition hover:scale-110"
                style={{
                  backgroundColor: isLooping ? '#DC3545' : 'transparent',
                  color: isLooping ? 'white' : '#4A5FBF',
                  border: `3px solid ${isLooping ? '#A02030' : '#4A5FBF'}`
                }}
              >
                <Repeat size={24} />
              </button>
              <button
                onClick={togglePlayPause}
                className="p-4 rounded-full transition hover:scale-110"
                style={{
                  backgroundColor: '#4A5FBF',
                  color: 'white',
                  border: '3px solid #2C3E8F',
                  boxShadow: '4px 4px 0px #2C3E8F'
                }}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(74, 95, 191, 0.3)'
        }}>
          <div className="bg-white p-8 max-w-md w-full relative" style={{
            border: '4px solid #4A5FBF',
            borderRadius: '20px',
            boxShadow: '10px 10px 0px rgba(74, 95, 191, 0.3)',
            transform: 'rotate(-1deg)'
          }}>
            <div className="absolute -top-4 -right-4 text-4xl">✧</div>
            <h3 className="text-3xl font-bold mb-6" style={{
              fontFamily: 'Comic Sans MS, cursive',
              color: '#DC3545',
              textAlign: 'center'
            }}>
              ♪ Upload Song ♪
            </h3>
            <div className="space-y-4">
              {/* Audio File Upload */}
              <div>
                <input
                  type="file"
                  ref={audioInputRef}
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full px-4 py-3 text-lg font-bold transition hover:scale-105 flex items-center justify-center gap-2"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    border: '3px dashed #4A5FBF',
                    borderRadius: '10px',
                    backgroundColor: newSong.audioFile ? '#E8FFE8' : 'transparent',
                    color: '#4A5FBF'
                  }}
                >
                  <Music size={20} />
                  {newSong.audioFile ? `✓ ${newSong.audioFile.name}` : 'Choose Audio File (MP3, WAV, etc.)'}
                </button>
              </div>

              <input
                type="text"
                placeholder="Song Title..."
                value={newSong.title}
                onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                className="w-full px-4 py-3 text-lg"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  border: '3px solid #4A5FBF',
                  borderRadius: '10px',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Duration (auto-detected)"
                value={newSong.duration}
                readOnly
                className="w-full px-4 py-3 text-lg bg-gray-50"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  border: '3px solid #4A5FBF',
                  borderRadius: '10px',
                  outline: 'none'
                }}
              />
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{
                border: '2px dashed #4A5FBF'
              }}>
                <input
                  type="checkbox"
                  checked={newSong.isReleased}
                  onChange={(e) => setNewSong({ ...newSong, isReleased: e.target.checked })}
                  className="w-6 h-6"
                />
                <span className="text-lg font-bold" style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#4A5FBF'
                }}>
                  ✓ Mark as Released
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUploadSong}
                className="flex-1 py-3 font-bold text-lg text-white transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#4A5FBF',
                  border: '3px solid #2C3E8F',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px #2C3E8F'
                }}
              >
                Upload!
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setNewSong({ title: '', duration: '', isReleased: false, audioFile: null, audioUrl: null });
                }}
                className="flex-1 py-3 font-bold text-lg transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#E8D4C0',
                  color: '#4A5FBF',
                  border: '3px solid #4A5FBF',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px rgba(74, 95, 191, 0.3)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      {showAlbumModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(220, 53, 69, 0.3)'
        }}>
          <div className="bg-white p-8 max-w-md w-full max-h-[80vh] overflow-y-auto relative" style={{
            border: '4px solid #DC3545',
            borderRadius: '20px',
            boxShadow: '10px 10px 0px rgba(220, 53, 69, 0.3)',
            transform: 'rotate(1deg)'
          }}>
            <div className="absolute -top-4 -left-4 text-4xl">♡</div>
            <h3 className="text-3xl font-bold mb-6" style={{
              fontFamily: 'Comic Sans MS, cursive',
              color: '#DC3545',
              textAlign: 'center'
            }}>
              📚 Create Album 📚
            </h3>

            {/* Album Cover Upload */}
            <div className="mb-4">
              <input
                type="file"
                ref={albumCoverInputRef}
                accept="image/*"
                onChange={handleAlbumCoverChange}
                className="hidden"
              />
              <button
                onClick={() => albumCoverInputRef.current?.click()}
                className="w-full aspect-square rounded-lg flex items-center justify-center text-4xl font-bold transition hover:scale-105 overflow-hidden"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  border: '3px dashed #DC3545',
                  backgroundColor: newAlbum.coverImageUrl ? 'transparent' : '#FFE8D6',
                  color: '#DC3545'
                }}
              >
                {newAlbum.coverImageUrl ? (
                  <img src={newAlbum.coverImageUrl} alt="Album cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImageIcon size={40} className="mx-auto mb-2" />
                    <div className="text-sm">Click to upload cover</div>
                  </div>
                )}
              </button>
            </div>

            <input
              type="text"
              placeholder="Album Name..."
              value={newAlbum.name}
              onChange={(e) => setNewAlbum({ ...newAlbum, name: e.target.value })}
              className="w-full px-4 py-3 text-lg mb-4"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                border: '3px solid #DC3545',
                borderRadius: '10px',
                outline: 'none'
              }}
            />
            <p className="text-base font-bold mb-3" style={{
              fontFamily: 'Comic Sans MS, cursive',
              color: '#4A5FBF'
            }}>
              ✎ Select Songs:
            </p>
            <div className="space-y-2 mb-6">
              {songs.map(song => (
                <label key={song.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition hover:scale-102" style={{
                  border: '2px dashed #4A5FBF',
                  backgroundColor: newAlbum.selectedSongs.includes(song.id) ? '#FFE8D6' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    checked={newAlbum.selectedSongs.includes(song.id)}
                    onChange={() => toggleSongSelection(song.id)}
                    className="w-5 h-5"
                  />
                  <span className="text-base font-bold" style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#4A5FBF'
                  }}>
                    ♪ {song.title}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateAlbum}
                className="flex-1 py-3 font-bold text-lg text-white transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#DC3545',
                  border: '3px solid #A02030',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px #A02030'
                }}
              >
                Create!
              </button>
              <button
                onClick={() => {
                  setShowAlbumModal(false);
                  setNewAlbum({ name: '', selectedSongs: [], coverImage: null, coverImageUrl: null });
                }}
                className="flex-1 py-3 font-bold text-lg transition hover:scale-105"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#E8D4C0',
                  color: '#DC3545',
                  border: '3px solid #DC3545',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px rgba(220, 53, 69, 0.3)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}