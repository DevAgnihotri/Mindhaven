import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Music, Upload, Settings, X } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface AudioTrack {
  id: string;
  name: string;
  url: string;
  type: 'nature' | 'ambient' | 'music' | 'custom';
  duration?: number;
}

interface AudioControlsProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

// Using proper file paths for audio files in the public/audio directory
const defaultTracks: AudioTrack[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    url: '/audio/rain.wav',
    type: 'nature'
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    url: '/audio/ocean.wav',
    type: 'nature'
  },
  {
    id: 'forest',
    name: 'Forest Sounds',
    url: '/audio/forest.wav',
    type: 'nature'
  },
  {
    id: 'meditation',
    name: 'Meditation Bells',
    url: '/audio/meditation.wav',
    type: 'ambient'
  },
  {
    id: 'piano',
    name: 'Peaceful Piano',
    url: '/audio/piano.wav',
    type: 'music'
  }
];

export const AudioControls: React.FC<AudioControlsProps> = ({ isVisible, onToggleVisibility }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [customTracks, setCustomTracks] = useLocalStorage<AudioTrack[]>('mindhaven-custom-audio-tracks', []);
  const [audioSettings, setAudioSettings] = useLocalStorage('mindhaven-audio-settings', {
    autoPlay: false,
    crossfade: true,
    loopPlaylist: true,
    preferredVolume: 0.7
  });
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const allTracks = useMemo(() => [...defaultTracks, ...customTracks], [customTracks]);

  useEffect(() => {
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audioElement]);

  useEffect(() => {
    if (currentTrack && !audioElement) {
      const audio = new Audio();
      audio.loop = audioSettings.loopPlaylist;
      audio.volume = isMuted ? 0 : volume;
      
      // Handle audio loading errors gracefully
      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load audio: ${currentTrack.name}`, e);
        setLoadingError(`Unable to load "${currentTrack.name}". Please upload your own audio file or ensure audio files are available.`);
        setIsPlaying(false);
        
        // Don't auto-skip for default tracks since they might not exist
        if (currentTrack.type === 'custom' && audioSettings.loopPlaylist && allTracks.length > 1) {
          const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
          const nextIndex = (currentIndex + 1) % allTracks.length;
          setCurrentTrack(allTracks[nextIndex]);
        }
      });
      
      audio.addEventListener('ended', () => {
        if (audioSettings.loopPlaylist) {
          const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
          const nextIndex = (currentIndex + 1) % allTracks.length;
          setCurrentTrack(allTracks[nextIndex]);
        } else {
          setIsPlaying(false);
        }
      });

      audio.addEventListener('canplaythrough', () => {
        // Audio is ready to play
        setLoadingError(null);
        if (isPlaying) {
          audio.play().catch((error) => {
            console.error('Failed to play audio:', error);
            setLoadingError(`Unable to play "${currentTrack.name}". Please check your audio settings.`);
            setIsPlaying(false);
          });
        }
      });

      audio.addEventListener('loadstart', () => {
        setLoadingError(null);
      });

      // Set the source after all event listeners are attached
      audio.src = currentTrack.url;
      setAudioElement(audio);
    }
  }, [currentTrack, audioSettings.loopPlaylist, allTracks, volume, isMuted, audioElement, isPlaying]);

  const togglePlayPause = () => {
    if (!audioElement || !currentTrack) {
      // Start with first track if none selected
      setCurrentTrack(allTracks[0]);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setLoadingError(`Unable to play "${currentTrack.name}". Please upload your own audio file.`);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const skipTrack = (direction: 'next' | 'prev') => {
    if (!currentTrack) return;
    
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % allTracks.length;
    } else {
      nextIndex = currentIndex === 0 ? allTracks.length - 1 : currentIndex - 1;
    }
    
    setCurrentTrack(allTracks[nextIndex]);
    setLoadingError(null);
    
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newTrack: AudioTrack = {
      id: Date.now().toString(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      url,
      type: 'custom'
    };

    setCustomTracks(prev => [...prev, newTrack]);
    setLoadingError(null);
  };

  const removeCustomTrack = (trackId: string) => {
    setCustomTracks(prev => prev.filter(t => t.id !== trackId));
    if (currentTrack?.id === trackId) {
      setCurrentTrack(null);
      setIsPlaying(false);
      setLoadingError(null);
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
      }
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        className="fixed bottom-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-full shadow-lg z-40"
        onClick={onToggleVisibility}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Music className="w-6 h-6" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-40 w-80"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Music className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-800">Audio Controls</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleVisibility}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {loadingError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">{loadingError}</div>
          </div>
        )}

        {/* Current Track */}
        <div className="mb-4 text-center">
          <div className="text-sm font-medium text-gray-800">
            {currentTrack ? currentTrack.name : 'No track selected'}
          </div>
          {currentTrack && (
            <div className="text-xs text-gray-500 capitalize">{currentTrack.type}</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={() => skipTrack('prev')}
            className="text-gray-600 hover:text-indigo-600 disabled:opacity-50"
            disabled={allTracks.length <= 1}
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <motion.button
            onClick={togglePlayPause}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-full shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </motion.button>
          
          <button
            onClick={() => skipTrack('next')}
            className="text-gray-600 hover:text-indigo-600 disabled:opacity-50"
            disabled={allTracks.length <= 1}
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-600 hover:text-indigo-600"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-xs text-gray-500 w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Track List */}
        <div className="max-h-40 overflow-y-auto">
          {allTracks.map((track) => (
            <motion.button
              key={track.id}
              onClick={() => {
                setCurrentTrack(track);
                setLoadingError(null);
                if (audioElement) {
                  audioElement.pause();
                  setAudioElement(null);
                }
              }}
              className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${
                currentTrack?.id === track.id
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'hover:bg-gray-100'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{track.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {track.type} {track.type !== 'custom' && '(requires audio file)'}
                  </div>
                </div>
                {track.type === 'custom' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomTrack(track.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Upload Custom Track */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="flex items-center justify-center space-x-2 p-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
            <Upload className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Upload Custom Track</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="mt-4 pt-4 border-t border-gray-200 space-y-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="text-sm font-medium text-gray-700">Audio Settings</div>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-play on load</span>
                <input
                  type="checkbox"
                  checked={audioSettings.autoPlay}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                  className="rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Loop playlist</span>
                <input
                  type="checkbox"
                  checked={audioSettings.loopPlaylist}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, loopPlaylist: e.target.checked }))}
                  className="rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Crossfade tracks</span>
                <input
                  type="checkbox"
                  checked={audioSettings.crossfade}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, crossfade: e.target.checked }))}
                  className="rounded"
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
