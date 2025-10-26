// Modal component that renders generated recipes and media workflows.
import * as React from 'react';
import { Recipe } from '../types';
import { generateRecipeVideo, transcribeAudio } from '../services/geminiService';
import { VIDEO_GENERATION_MESSAGES, THEMATIC_BACKGROUNDS } from '../constants';

// Aistudio types may not be globally available, so we declare them locally.
// Fix: Define AIStudio interface globally to resolve type conflicts as indicated by the error.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface RecipeResultProps {
  recipe: Recipe;
  imageUrl: string;
  onClose: () => void;
  onSave: () => void;
  isSaved: boolean;
  playSound: (soundId?: string) => void;
}

const base64ToBlob = (base64: string, contentType = '', sliceSize = 512): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};


  const [videoGenerationStep, setVideoGenerationStep] = React.useState<'idle' | 'generating'>('idle');
  const [videoLoadingMessage, setVideoLoadingMessage] = React.useState(VIDEO_GENERATION_MESSAGES[0]);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [copyStatus, setCopyStatus] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = React.useState(false);

  const [uploadedImage, setUploadedImage] = React.useState<{ url: string; base64: string } | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = React.useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [transcribedText, setTranscribedText] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const [selectedTheme, setSelectedTheme] = React.useState<string>('None');
  const uploadedImageUrl = uploadedImage?.url ?? null;
  const safeImageSrc = React.useMemo(
    () => getSafeImageSrc(uploadedImageUrl ?? imageUrl),
    [uploadedImageUrl, imageUrl]
  );


  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.7);
  const [showControls, setShowControls] = React.useState(false);

  const instructionsContainerRef = React.useRef<HTMLOListElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const DRAFT_KEY = `fractalRecipeDraft_${recipe.dishName}`;

  // Dedicated effect for animating instructions on scroll.
  React.useEffect(() => {
    const scrollRoot = scrollContainerRef.current;
    // Query for elements inside the effect, as refs might not be ready on initial render.
    const instructionElements = instructionsContainerRef.current?.querySelectorAll('.instruction-step');

    if (!scrollRoot || !instructionElements || instructionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: scrollRoot,
        rootMargin: '0px',
        threshold: 0.1, // Animate when 10% of the item is visible
      }
    );

  instructionElements.forEach((instruction: Element) => observer.observe(instruction));

    // Cleanup function to unobserve elements when the component/recipe changes.
    return () => {
  instructionElements.forEach((instruction: Element) => observer.unobserve(instruction));
    };
  }, [recipe]); // This effect only depends on the recipe changing.

  // Effect for loading drafts and handling media recorder cleanup
  React.useEffect(() => {
    const transcribeLoadedAudio = async (blob: Blob) => {
        setIsTranscribing(true);
        setTranscribedText(null);
        try {
            const text = await transcribeAudio(blob);
            setTranscribedText(text || "COULD NOT TRANSCRIBE. TRY AGAIN.");
        } catch (e) {
            console.error("Failed to transcribe loaded audio:", e);
            setTranscribedText("TRANSCRIPTION FAILED.");
        } finally {
            setIsTranscribing(false);
        }
    };

    // Load video creation draft from localStorage
    const loadDraft = () => {
      const draftJson = localStorage.getItem(DRAFT_KEY);
      if (draftJson) {
        try {
          const draft = JSON.parse(draftJson);
          if (draft.imageBase64) {
            const imageBlob = base64ToBlob(draft.imageBase64, 'image/jpeg');
            const imageUrl = URL.createObjectURL(imageBlob);
            setUploadedImage({ url: imageUrl, base64: draft.imageBase64 });
          }
          if (draft.audioBase64) {
            const audioBlob = base64ToBlob(draft.audioBase64, 'audio/webm');
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(audioUrl);
            transcribeLoadedAudio(audioBlob);
          }
        } catch (e) {
          console.error("Failed to load video draft:", e);
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    };
    loadDraft();

    return () => {
      // Stop any active recording when the component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [DRAFT_KEY]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      playSound('upload-sound');
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1] || '';
        setUploadedImage({
          url: URL.createObjectURL(file),
          base64: base64String
        });
         // Save image to draft
        try {
            const existingDraftJson = localStorage.getItem(DRAFT_KEY);
            const draft = existingDraftJson ? JSON.parse(existingDraftJson) : {};
            draft.imageBase64 = base64String;
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch(e) {
            console.error("Failed to save image draft", e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartRecording = async () => {
    playSound('record-start-sound');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        const localAudioChunks: Blob[] = [];
  mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          localAudioChunks.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(localAudioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);

          // Transcribe audio right away
          setIsTranscribing(true);
          setTranscribedText(null);
          try {
            const transcription = await transcribeAudio(audioBlob);
            setTranscribedText(transcription || "COULD NOT TRANSCRIBE. TRY AGAIN.");
          } catch (err) {
            console.error("Transcription failed", err);
            setTranscribedText("TRANSCRIPTION FAILED.");
          } finally {
            setIsTranscribing(false);
          }

          // Save audio draft to localStorage
          const reader = new FileReader();
          reader.onloadend = () => {
            const audioBase64 = reader.result?.toString().split(',')[1] || '';
            if (audioBase64) {
              try {
                const existingDraftJson = localStorage.getItem(DRAFT_KEY);
                const draft = existingDraftJson ? JSON.parse(existingDraftJson) : {};
                draft.audioBase64 = audioBase64;
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
              } catch (e) {
                console.error("Failed to save audio draft:", e);
              }
            }
          };
          reader.readAsDataURL(audioBlob);
        };
        
        // Clear previous audio from draft only after successfully getting the stream
        try {
          const existingDraftJson = localStorage.getItem(DRAFT_KEY);
          if (existingDraftJson) {
              const draft = JSON.parse(existingDraftJson);
              delete draft.audioBase64;
              localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          }
        } catch(e) {
          console.error("Failed to clear audio draft", e);
        }
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordedAudioUrl(null);
        setTranscribedText(null);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setVideoError("FAILED TO ACCESS MICROPHONE.");
      }
    }
  };

  const handleStopRecording = () => {
    playSound('record-stop-sound');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
  mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setIsRecording(false);
    }
  };

  const handleGenerateVideo = async () => {
    // Check for API key (required for Veo models)
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Assume key selection is successful and proceed.
      }
    }

    playSound('generate-sound');
    setVideoGenerationStep('generating');
    setVideoError(null);
    setVideoUrl(null);

    let messageInterval: number | undefined;

    try {
      setVideoLoadingMessage(VIDEO_GENERATION_MESSAGES[0]);

      messageInterval = window.setInterval(() => {
        setVideoLoadingMessage((prev: string) => {
          const currentIndex = VIDEO_GENERATION_MESSAGES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % VIDEO_GENERATION_MESSAGES.length;
          return VIDEO_GENERATION_MESSAGES[nextIndex];
        });
      }, 3000);

      const generatedUrl = await generateRecipeVideo(recipe, transcribedText, uploadedImage?.base64 || null, selectedTheme);
      setVideoUrl(generatedUrl);
      localStorage.removeItem(DRAFT_KEY); // Clear draft on success
      setTranscribedText(null);
    } catch (err) {
      // Robustly get the error message, checking for non-Error objects.
      const rawMessage = err instanceof Error ? err.message : JSON.stringify(err);

      if (rawMessage.includes("API KEY ERROR") && window.aistudio?.openSelectKey) {
        setVideoError("API KEY INVALID. PLEASE SELECT A NEW KEY.");
        // We don't want to re-trigger the dialog here as the service already threw the error.
        // The user can click the button again after selecting a key.
      } else {
        const displayMessage = err instanceof Error ? err.message : 'An unknown video error occurred.';
        setVideoError(displayMessage);
      }
    } finally {
      if (messageInterval) clearInterval(messageInterval);
      setVideoGenerationStep('idle');
    }
  };

  const getShareableUrl = React.useCallback(() => {
    const recipeToShare = { recipe, imageUrl };
    const data = JSON.stringify(recipeToShare);
    const encodedData = btoa(data);
    return `${window.location.origin}${window.location.pathname}?recipe=${encodedData}`;
  }, [recipe, imageUrl]);

  const handleShare = (platform: 'twitter' | 'facebook' | 'copy') => {
    playSound();
    const url = getShareableUrl();
    const text = `Check out this recipe for "${recipe.dishName}" I generated with the Fractal Recipe Generator! #AI #Gemini`;

    if (platform === 'twitter') {
      const shareUrl = new URL('https://twitter.com/intent/tweet');
      shareUrl.searchParams.set('url', url);
      shareUrl.searchParams.set('text', text);
      window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    if (platform === 'facebook') {
      const shareUrl = new URL('https://www.facebook.com/sharer/sharer.php');
      shareUrl.searchParams.set('u', url);
      window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    if (platform === 'copy') {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopyStatus('LINK COPIED!');
          setTimeout(() => setCopyStatus(''), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy link: ', err);
          setCopyStatus('COPY FAILED');
          setTimeout(() => setCopyStatus(''), 2000);
        });
    }
  };
  
  const handleSave = () => {
    if (isSaved || isSaving) return;
    playSound();
    setIsSaving(true);
    onSave();
    setShowSaveConfirmation(true);
    setTimeout(() => setIsSaving(false), 800); // Animation duration
    setTimeout(() => setShowSaveConfirmation(false), 2500); // Hide message after 2.5s
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      if (audioRef.current && recordedAudioUrl) {
        audioRef.current.play();
      }
    } else {
      videoRef.current.pause();
      if (audioRef.current && recordedAudioUrl) {
        audioRef.current.pause();
      }
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (audioRef.current) audioRef.current.volume = newVolume;
  };
  
  React.useEffect(() => {
    const videoElement = videoRef.current;
    const audioElement = audioRef.current;
    if (videoElement && videoUrl) {
      const syncPlayState = () => setIsPlaying(!videoElement.paused);
      
      videoElement.addEventListener('play', syncPlayState);
      videoElement.addEventListener('pause', syncPlayState);

      videoElement.volume = volume;
      if (audioElement && recordedAudioUrl) {
        audioElement.volume = volume;
      }

      return () => {
        videoElement.removeEventListener('play', syncPlayState);
        videoElement.removeEventListener('pause', syncPlayState);
      };
    }
  }, [videoUrl, recordedAudioUrl, volume]);

  if (videoGenerationStep !== 'idle') {
    return (
      <div className="modal-backdrop">
        <div className="modal-content text-center items-center flex flex-col justify-center">
            {videoGenerationStep === 'generating' && (
              <>
                <div className="video-loader"></div>
                <h3 className="pixel-font-medium text-yellow-400 flex items-end text-center">
                  <span>{videoLoadingMessage}</span>
                   <span className="loading-ellipsis ml-1">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                   </span>
                </h3>
                <div className="progress-bar-container">
                  <div className="progress-bar-inner"></div>
                </div>
              </>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content recipe-result-modal">
        <button 
          onClick={() => { playSound(); onClose(); }} 
          className="arcade-close-button top-2 right-2 z-20"
          aria-label="Close recipe"
        >
          X
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
          {/* Left Column: Image and Video */}
          <div className="flex flex-col items-center space-y-4">
            {videoUrl ? (
                <div 
                  className="w-full aspect-square video-container"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => setShowControls(false)}
                >
                    <video ref={videoRef} src={videoUrl} loop className="w-full h-full object-contain" aria-label="Generated recipe video" />
                    <audio ref={audioRef} src={recordedAudioUrl || ''} loop />
                     <div className={`video-controls-overlay ${showControls || !isPlaying ? 'visible' : ''}`} onClick={togglePlayPause}>
                        <button className="video-control-button text-4xl">{isPlaying ? '❚❚' : '►'}</button>
                <input
                           type="range" min="0" max="1" step="0.05"
                           value={volume}
                           onChange={handleVolumeChange}
                           onClick={(event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                           className="volume-slider"
                  aria-label="Video and audio volume"
                        />
                     </div>
                </div>
            ) : (
                <>

                   <div className="w-full p-3 border-2 border-dashed border-green-800 bg-black/30 space-y-3">
                      <h4 className="pixel-font-small text-center text-yellow-400">CREATE VIDEO TRAILER</h4>
                      <div className="flex items-center gap-2">
                         <label htmlFor="image-upload" className="arcade-button-small cursor-pointer w-1/2 text-center">{uploadedImage ? 'IMAGE OK!' : 'ADD PHOTO'}</label>
                         <input id="image-upload" type="file" accept="image/jpeg, image/png" onChange={handleImageUpload} className="hidden" />
                         <p className="pixel-font-small text-xs text-gray-400">Add a custom title image.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <button onClick={handleStopRecording} className="arcade-button-small bg-red-600 border-red-500 w-1/2 animate-pulse">STOP</button>
                        ) : (
                          <button onClick={handleStartRecording} className="arcade-button-small w-1/2">{recordedAudioUrl ? 'AUDIO OK!' : 'REC VOICEOVER'}</button>
                        )}
                         <p className="pixel-font-small text-xs text-gray-400">Record a narration.</p>
                      </div>
                      {recordedAudioUrl && !isRecording && <audio src={recordedAudioUrl} controls className="w-full h-8" />}
                      {isTranscribing && <p className="pixel-font-small text-yellow-400 animate-pulse text-center mt-2">TRANSCRIBING AUDIO...</p>}
                      {transcribedText && !isTranscribing && (
                        <div className="w-full p-2 mt-2 border border-dashed border-green-700 bg-black/50">
                            <p className="pixel-font-small text-xs text-green-300 italic">"{transcribedText}"</p>
                        </div>
                      )}
                      <div>
                        <p className="pixel-font-small text-xs text-left text-yellow-400 mb-2">SELECT VIDEO THEME:</p>
                        <div className="theme-selector-grid">
                          {Object.entries(THEMATIC_BACKGROUNDS).map(([name, url]) => (
                            <div
                              key={name}
                              title={name}
                              className={`theme-item ${url === '' ? 'none-theme' : ''} ${selectedTheme === name ? 'selected' : ''}`}
                              onClick={() => {
                                playSound();
                                setSelectedTheme(name);
                              }}
                            >
                              <div className="theme-item-preview">
                                {url ? (
                                  <img src={sanitizeUrl(url)} alt={`${name} preview`} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined">block</span>
                                )}
                              </div>
                              <div className="theme-item-name">{name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                </>
            )}
            {videoError && <p className="text-red-500 pixel-font-small animate-shake text-center">{videoError}</p>}
             <div className="flex flex-col items-center gap-3 mt-4 w-full">
                <div className="flex flex-wrap gap-2 justify-center">
                  <div className="share-indicator-container">
                    <button
                      onClick={handleSave}
                      disabled={isSaved || isSaving}
                      className={`arcade-button-small ${isSaving ? 'saved-animation' : ''}`}
                    >
                      {isSaved ? 'SAVED!' : 'SAVE TO COOKBOOK'}
                    </button>
                    {showSaveConfirmation && (
                      <span className="share-indicator-text">
                        SAVED TO COOKBOOK!
                      </span>
                    )}
                  </div>
                  {!videoUrl && (
                    <button onClick={handleGenerateVideo} className="arcade-button-small" disabled={isTranscribing}>
                      GENERATE VIDEO
                    </button>
                  )}
                </div>

                 {!videoUrl && (
                  <p className="pixel-font-small text-xs text-gray-500 mt-2 text-center w-full max-w-xs">
                    Video generation uses the Veo API and may incur costs. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-green-400 underline hover:text-yellow-400">Learn more</a>.
                  </p>
                )}

                <div className="flex items-center gap-2 border-t-2 border-dashed border-green-800 pt-3 w-full justify-center">
                    <span className="pixel-font-small text-gray-400">SHARE ON:</span>
                    <button title="Share on X" onClick={() => handleShare('twitter')} className="arcade-button-small !p-2 !text-base">X</button>
                    <button title="Share on Facebook" onClick={() => handleShare('facebook')} className="arcade-button-small !p-2 !text-base">F</button>
                    <div className="share-indicator-container">
                        <button title="Copy Link" onClick={() => handleShare('copy')} className="arcade-button-small !p-2 flex items-center justify-center">
                            <span className="material-symbols-outlined !text-base leading-none">link</span>
                        </button>
                         {copyStatus && (
                            <span className="share-indicator-text">
                              {copyStatus}
                            </span>
                          )}
                    </div>
                </div>
            </div>
          </div>
          
          <div ref={scrollContainerRef} className="recipe-details-scroll text-left">
              <h2 className="pixel-font-medium text-yellow-400 text-center mb-2">{recipe.dishName}</h2>
              <p className="pixel-font-small text-gray-300 mb-4 text-center italic">"{recipe.description}"</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center mb-4 pixel-font-small border-y-2 border-dashed border-green-700 py-2">
                <div><span className="text-green-400 block text-xs">TIME</span> {recipe.timeNeeded}</div>
                <div><span className="text-green-400 block text-xs">COST</span> {recipe.estimatedCost}</div>
                <div><span className="text-green-400 block text-xs">DIFFICULTY</span> {recipe.difficulty}</div>
                <div><span className="text-green-400 block text-xs">SERVINGS</span> {recipe.servings}</div>
              </div>

              <h3 className="pixel-font-small text-green-400 underline mb-2">INGREDIENTS:</h3>
              <ul className="list-disc list-inside mb-4 pixel-font-small">
                  {recipe.ingredients.map((ing, i) => (
                      <li key={i}><span className="font-bold">{ing.quantity}</span> {ing.name}</li>
                  ))}
              </ul>
              
              <h3 className="pixel-font-small text-green-400 underline mb-2">INSTRUCTIONS:</h3>
              <ol ref={instructionsContainerRef} className="list-decimal list-inside space-y-2 mb-4 pixel-font-small">
                  {recipe.instructions.map((step, i) => (
                    <li 
                      key={i} 
                      className={`instruction-step delay-step-${i % 24}`}
                    >
                      {step}
                    </li>
                  ))}
              </ol>

              {recipe.analysis && (
                <div className="retro-terminal">
                  <h4>CHEF'S ANALYSIS:</h4>
                  <p>"{recipe.analysis}"</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeResult;

// Simple URL sanitization to avoid dangerous protocols
function sanitizeUrl(raw: string): string {
  try {
    // Allow blob, data (images), http, https
    if (raw.startsWith('blob:') || raw.startsWith('data:image/')) return raw;
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {
    // fallthrough
  }
  return '';
}

function getSafeImageSrc(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const safe = sanitizeUrl(raw);
  if (!safe) return undefined;
  // Whitelist data:image/*, blob:, http(s)
  if (safe.startsWith('data:image/') || safe.startsWith('blob:') || safe.startsWith('http')) return safe;
  return undefined;
}
