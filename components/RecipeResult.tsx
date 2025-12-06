// Modal component that renders generated recipes and media workflows.
import * as React from 'react';
import { Recipe } from '../types';
import { generateRecipeVideo, transcribeAudio } from '../services/contentEngine';
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
  const fragments: BlobPart[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const bytes = new Uint8Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      bytes[i] = slice.codePointAt(i) ?? 0;
    }
    // Use ArrayBuffer slice to ensure proper BlobPart type
    fragments.push(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return new Blob(fragments, { type: contentType });
};

// Sub-component for recording and voiceover controls to reduce main component complexity
const RecordingControls: React.FC<{
  isRecording: boolean;
  recordedAudioUrl: string | null;
  isTranscribing: boolean;
  transcribedText: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
}> = ({ isRecording, recordedAudioUrl, isTranscribing, transcribedText, onStartRecording, onStopRecording }) => (
  <div className="w-full p-3 border-2 border-dashed border-green-800 bg-black/30 space-y-3">
    <h4 className="pixel-font-small text-center text-yellow-400">CREATE VIDEO TRAILER</h4>
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button onClick={onStopRecording} className="arcade-button-small bg-red-600 border-red-500 w-1/2 animate-pulse">STOP</button>
      ) : (
        <button onClick={onStartRecording} className="arcade-button-small w-1/2">{recordedAudioUrl ? 'AUDIO OK!' : 'REC VOICEOVER'}</button>
      )}
      <p className="pixel-font-small text-xs text-gray-400">Record a narration.</p>
    </div>
    {recordedAudioUrl && !isRecording && (
      <audio src={recordedAudioUrl} controls className="w-full h-8">
        <track kind="captions" src="data:text/vtt,WEBVTT" label="No captions" default />
      </audio>
    )}
    {isTranscribing && <p className="pixel-font-small text-yellow-400 animate-pulse text-center mt-2">TRANSCRIBING AUDIO...</p>}
    {transcribedText && !isTranscribing && (
      <div className="w-full p-2 mt-2 border border-dashed border-green-700 bg-black/50">
        <p className="pixel-font-small text-xs text-green-300 italic">"{transcribedText}"</p>
      </div>
    )}
  </div>
);

// Sub-component for theme selector to reduce main component complexity
const ThemeSelector: React.FC<{
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
  playSound: (id?: string) => void;
}> = ({ selectedTheme, onThemeSelect, playSound }) => (
  <div>
    <p className="pixel-font-small text-xs text-left text-yellow-400 mb-2">SELECT VIDEO THEME:</p>
    <div className="theme-selector-grid">
      {Object.entries(THEMATIC_BACKGROUNDS).map(([name, url]) => (
        <button
          type="button"
          key={name}
          title={name}
          className={`theme-item ${url === '' ? 'none-theme' : ''} ${selectedTheme === name ? 'selected' : ''}`}
          onClick={() => {
            playSound();
            onThemeSelect(name);
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
        </button>
      ))}
    </div>
  </div>
);

// Sub-component for video player with controls
const VideoPlayer: React.FC<{
  videoUrl: string;
  recordedAudioUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  volume: number;
  showControls: boolean;
  onShowControls: (show: boolean) => void;
  onTogglePlayPause: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({
  videoUrl,
  recordedAudioUrl,
  videoRef,
  audioRef,
  isPlaying,
  volume,
  showControls,
  onShowControls,
  onTogglePlayPause,
  onVolumeChange,
}) => (
    <section
      className="w-full aspect-square video-container"
      aria-label="Recipe video player with playback controls"
      onMouseEnter={() => onShowControls(true)}
      onMouseLeave={() => onShowControls(false)}
      onFocus={() => onShowControls(true)}
      onBlur={() => onShowControls(false)}
    >
      <video ref={videoRef} src={videoUrl} loop className="w-full h-full object-contain" aria-label="Generated recipe video">
        <track kind="captions" src="data:text/vtt,WEBVTT" label="No captions" default />
      </video>
      <audio ref={audioRef} src={recordedAudioUrl || ''} loop>
        <track kind="captions" src="data:text/vtt,WEBVTT" label="No captions" default />
      </audio>
      <div className={`video-controls-overlay ${showControls || !isPlaying ? 'visible' : ''}`}>
        <button
          type="button"
          className="video-control-button text-4xl"
          onClick={onTogglePlayPause}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? '❚❚' : '►'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={onVolumeChange}
          onClick={(event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation()}
          className="volume-slider"
          aria-label="Video and audio volume"
        />
      </div>
    </section>
  );

// Sub-component for image preview and video creation controls
const ImagePreview: React.FC<{
  safeImageSrc: string | undefined;
  safeAlt: string;
  previewImgRef: React.RefObject<HTMLImageElement>;
  uploadedImage: { url: string; base64: string } | null;
  isRecording: boolean;
  recordedAudioUrl: string | null;
  isTranscribing: boolean;
  transcribedText: string | null;
  selectedTheme: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onThemeSelect: (theme: string) => void;
  playSound: (id?: string) => void;
}> = ({
  safeImageSrc,
  safeAlt,
  previewImgRef,
  uploadedImage,
  isRecording,
  recordedAudioUrl,
  isTranscribing,
  transcribedText,
  selectedTheme,
  onImageUpload,
  onStartRecording,
  onStopRecording,
  onThemeSelect,
  playSound,
}) => (
    <>
      {safeImageSrc ? (
        <img
          ref={previewImgRef}
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          alt={safeAlt}
          className="w-full aspect-square object-cover recipe-image-retro"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full aspect-square grid place-items-center border border-green-800 bg-black/40 text-green-400">
          NO IMAGE
        </div>
      )}
      <div className="w-full p-3 border-2 border-dashed border-green-800 bg-black/30 space-y-3">
        <h4 className="pixel-font-small text-center text-yellow-400">CREATE VIDEO TRAILER</h4>
        <div className="flex items-center gap-2">
          <label htmlFor="image-upload" className="arcade-button-small cursor-pointer w-1/2 text-center">
            {uploadedImage ? 'IMAGE OK!' : 'ADD PHOTO'}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/jpeg, image/png"
            onChange={onImageUpload}
            className="hidden"
          />
          <p className="pixel-font-small text-xs text-gray-400">Add a custom title image.</p>
        </div>
        <RecordingControls
          isRecording={isRecording}
          recordedAudioUrl={recordedAudioUrl}
          isTranscribing={isTranscribing}
          transcribedText={transcribedText}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
        />
        <ThemeSelector
          selectedTheme={selectedTheme}
          onThemeSelect={onThemeSelect}
          playSound={playSound}
        />
      </div>
    </>
  );

// Sub-component for share and save controls
const ShareControls: React.FC<{
  isSaved: boolean;
  isSaving: boolean;
  showSaveConfirmation: boolean;
  videoUrl: string | null;
  isTranscribing: boolean;
  copyStatus: string;
  onSave: () => void;
  onGenerateVideo: () => void;
  onShare: (platform: 'twitter' | 'facebook' | 'copy') => void;
}> = ({
  isSaved,
  isSaving,
  showSaveConfirmation,
  videoUrl,
  isTranscribing,
  copyStatus,
  onSave,
  onGenerateVideo,
  onShare,
}) => (
    <div className="flex flex-col items-center gap-3 mt-4 w-full">
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="share-indicator-container">
          <button
            onClick={onSave}
            disabled={isSaved || isSaving}
            className={`arcade-button-small ${isSaving ? 'saved-animation' : ''}`}
          >
            {isSaved ? 'SAVED!' : 'SAVE TO COOKBOOK'}
          </button>
          {showSaveConfirmation && (
            <span className="share-indicator-text">SAVED TO COOKBOOK!</span>
          )}
        </div>
        {!videoUrl && (
          <button onClick={onGenerateVideo} className="arcade-button-small" disabled={isTranscribing}>
            GENERATE VIDEO
          </button>
        )}
      </div>

      {!videoUrl && (
        <p className="pixel-font-small text-xs text-gray-500 mt-2 text-center w-full max-w-xs">
          Video generation uses the Veo API and may incur costs.{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 underline hover:text-yellow-400"
          >
            Learn more.
          </a>
        </p>
      )}

      <div className="flex items-center gap-2 border-t-2 border-dashed border-green-800 pt-3 w-full justify-center">
        <span className="pixel-font-small text-gray-400">SHARE ON:</span>
        <button
          title="Share on X"
          onClick={() => onShare('twitter')}
          className="arcade-button-small !p-2 !text-base"
        >
          X
        </button>
        <button
          title="Share on Facebook"
          onClick={() => onShare('facebook')}
          className="arcade-button-small !p-2 !text-base"
        >
          F
        </button>
        <div className="share-indicator-container">
          <button
            title="Copy Link"
            onClick={() => onShare('copy')}
            className="arcade-button-small !p-2 flex items-center justify-center"
          >
            <span className="material-symbols-outlined !text-base leading-none">link</span>
          </button>
          {copyStatus && <span className="share-indicator-text">{copyStatus}</span>}
        </div>
      </div>
    </div>
  );

// Sub-component for recipe details display
const RecipeDetails: React.FC<{
  recipe: Recipe;
  safeDishName: string;
  safeDescription: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  instructionsContainerRef: React.RefObject<HTMLOListElement>;
  escapeText: (text: string) => string;
}> = ({
  recipe,
  safeDishName,
  safeDescription,
  scrollContainerRef,
  instructionsContainerRef,
  escapeText,
}) => (
    <div ref={scrollContainerRef} className="recipe-details-scroll text-left">
      <h2 className="pixel-font-medium text-yellow-400 text-center mb-2">{safeDishName}</h2>
      <p className="pixel-font-small text-gray-300 mb-4 text-center italic">&quot;{safeDescription}&quot;</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center mb-4 pixel-font-small border-y-2 border-dashed border-green-700 py-2">
        <div>
          <span className="text-green-400 block text-xs">TIME</span> {recipe.timeNeeded}
        </div>
        <div>
          <span className="text-green-400 block text-xs">COST</span> {recipe.estimatedCost}
        </div>
        <div>
          <span className="text-green-400 block text-xs">DIFFICULTY</span> {recipe.difficulty}
        </div>
        <div>
          <span className="text-green-400 block text-xs">SERVINGS</span> {recipe.servings}
        </div>
      </div>

      <h3 className="pixel-font-small text-green-400 underline mb-2">INGREDIENTS:</h3>
      <ul className="list-disc list-inside mb-4 pixel-font-small">
        {recipe.ingredients.map((ing) => (
          <li key={`${ing.name}-${ing.quantity}`}>
            <span className="font-bold">{escapeText(ing.quantity)}</span> {escapeText(ing.name)}
          </li>
        ))}
      </ul>

      <h3 className="pixel-font-small text-green-400 underline mb-2">INSTRUCTIONS:</h3>
      <ol
        ref={instructionsContainerRef}
        className="list-decimal list-inside space-y-2 mb-4 pixel-font-small"
      >
        {recipe.instructions.map((step, i) => (
          <li key={`${step}-${step.length}`} className={`instruction-step delay-step-${i % 24}`}>
            {escapeText(step)}
          </li>
        ))}
      </ol>

      {recipe.analysis && (
        <div className="retro-terminal">
          <h4>CHEF&apos;S ANALYSIS:</h4>
          <p>&quot;{escapeText(recipe.analysis)}&quot;</p>
        </div>
      )}
    </div>
  );

// Sub-component for sharing controls to reduce main component complexity


const RecipeResult: React.FC<RecipeResultProps> = ({ recipe, imageUrl, onClose, onSave, isSaved, playSound }: RecipeResultProps) => {
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
  const escapeText = React.useCallback((s: string): string => {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }, []);

  const safeAlt = React.useMemo(() => escapeText(recipe.dishName), [escapeText, recipe.dishName]);
  const safeDishName = React.useMemo(() => escapeText(recipe.dishName), [escapeText, recipe.dishName]);
  const safeDescription = React.useMemo(() => escapeText(recipe.description), [escapeText, recipe.description]);
  // Image preview uses a placeholder src in markup; actual sanitized source is applied imperatively via ref to satisfy security linters.
  const previewImgRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    if (!previewImgRef.current) return;
    previewImgRef.current.src = safeImageSrc ?? '';
  }, [safeImageSrc]);


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
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        }
      },
      {
        root: scrollRoot,
        rootMargin: '0px',
        threshold: 0.1, // Animate when 10% of the item is visible
      }
    );

    for (const instruction of instructionElements as unknown as Element[]) {
      observer.observe(instruction);
    }

    // Cleanup function to unobserve elements when the component/recipe changes.
    return () => {
      for (const instruction of instructionElements as unknown as Element[]) {
        observer.unobserve(instruction);
      }
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
          const draft = JSON.parse(draftJson) as { imageBase64?: string; audioBase64?: string };
          if (draft.imageBase64) {
            const imageBlob = base64ToBlob(draft.imageBase64, 'image/jpeg');
            const imageUrl = URL.createObjectURL(imageBlob);
            setUploadedImage({ url: imageUrl, base64: draft.imageBase64 });
          }
          if (draft.audioBase64) {
            const audioBlob = base64ToBlob(draft.audioBase64, 'audio/webm');
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(audioUrl);
            void transcribeLoadedAudio(audioBlob);
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
        const result = reader.result;
        const base64String = (typeof result === 'string' ? result.split(',')[1] : '') || '';
        setUploadedImage({
          url: URL.createObjectURL(file),
          base64: base64String
        });
        // Save image to draft
        try {
          const existingDraftJson = localStorage.getItem(DRAFT_KEY);
          const draft = existingDraftJson ? JSON.parse(existingDraftJson) as { imageBase64?: string; audioBase64?: string } : {};
          draft.imageBase64 = base64String;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {
          console.error("Failed to save image draft", e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartRecording = async () => {
    playSound('record-start-sound');
    if (globalThis.navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
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
            const result = reader.result;
            const audioBase64 = (typeof result === 'string' ? result.split(',')[1] : '') || '';
            if (audioBase64) {
              try {
                const existingDraftJson = localStorage.getItem(DRAFT_KEY);
                const draft = existingDraftJson ? JSON.parse(existingDraftJson) as { imageBase64?: string; audioBase64?: string } : {};
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
            const draft = JSON.parse(existingDraftJson) as { imageBase64?: string; audioBase64?: string };
            delete draft.audioBase64;
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          }
        } catch (e) {
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
      for (const track of mediaRecorderRef.current.stream.getTracks()) {
        track.stop();
      }
      setIsRecording(false);
    }
  };

  const handleGenerateVideo = async () => {
    // Check for API key (required for Veo models)
    if (globalThis.window?.aistudio?.hasSelectedApiKey) {
      const hasKey = await globalThis.window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await globalThis.window.aistudio.openSelectKey();
        // Assume key selection is successful and proceed.
      }
    }

    playSound('generate-sound');
    setVideoGenerationStep('generating');
    setVideoError(null);
    setVideoUrl(null);

    let messageInterval: ReturnType<typeof globalThis.setInterval> | undefined;

    try {
      setVideoLoadingMessage(VIDEO_GENERATION_MESSAGES[0]);

      messageInterval = globalThis.setInterval(() => {
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

      if (rawMessage.includes("API KEY ERROR") && globalThis.window?.aistudio?.openSelectKey) {
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
    const base = new URL('/', globalThis.location?.origin ?? 'https://example.com');
    base.searchParams.set('recipe', encodedData);
    return base.toString();
  }, [recipe, imageUrl]);

  const handleShare = (platform: 'twitter' | 'facebook' | 'copy') => {
    playSound();
    const url = getShareableUrl();
    const text = `Check out this recipe for "${recipe.dishName}" I generated with the Fractal Recipe Generator! #AI #Gemini`;

    if (platform === 'twitter') {
      if (globalThis.navigator?.share) {
        void globalThis.navigator.share({ url, text }).catch(() => {
          /* noop */
        });
      } else {
        void navigator.clipboard.writeText(`${text} ${url}`).then(() => {
          setCopyStatus('LINK COPIED!');
          setTimeout(() => setCopyStatus(''), 2000);
        });
      }
      return;
    }

    if (platform === 'facebook') {
      if (globalThis.navigator?.share) {
        void globalThis.navigator.share({ url, text }).catch(() => {
          /* noop */
        });
      } else {
        void navigator.clipboard.writeText(url).then(() => {
          setCopyStatus('LINK COPIED!');
          setTimeout(() => setCopyStatus(''), 2000);
        });
      }
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
      void videoRef.current.play();
      if (audioRef.current && recordedAudioUrl) {
        void audioRef.current.play();
      }
    } else {
      videoRef.current.pause();
      if (audioRef.current && recordedAudioUrl) {
        audioRef.current.pause();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
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
              <VideoPlayer
                videoUrl={videoUrl}
                recordedAudioUrl={recordedAudioUrl}
                videoRef={videoRef}
                audioRef={audioRef}
                isPlaying={isPlaying}
                volume={volume}
                showControls={showControls}
                onShowControls={setShowControls}
                onTogglePlayPause={togglePlayPause}
                onVolumeChange={handleVolumeChange}
              />
            ) : (
              <ImagePreview
                safeImageSrc={safeImageSrc}
                safeAlt={safeAlt}
                previewImgRef={previewImgRef}
                uploadedImage={uploadedImage}
                isRecording={isRecording}
                recordedAudioUrl={recordedAudioUrl}
                isTranscribing={isTranscribing}
                transcribedText={transcribedText}
                selectedTheme={selectedTheme}
                onImageUpload={handleImageUpload}
                onStartRecording={() => void handleStartRecording()}
                onStopRecording={handleStopRecording}
                onThemeSelect={setSelectedTheme}
                playSound={playSound}
              />
            )}
            {videoError && <p className="text-red-500 pixel-font-small animate-shake text-center">{videoError}</p>}
            <ShareControls
              isSaved={isSaved}
              isSaving={isSaving}
              showSaveConfirmation={showSaveConfirmation}
              videoUrl={videoUrl}
              isTranscribing={isTranscribing}
              copyStatus={copyStatus}
              onSave={handleSave}
              onGenerateVideo={() => void handleGenerateVideo()}
              onShare={handleShare}
            />
          </div>

          <RecipeDetails
            recipe={recipe}
            safeDishName={safeDishName}
            safeDescription={safeDescription}
            scrollContainerRef={scrollContainerRef}
            instructionsContainerRef={instructionsContainerRef}
            escapeText={escapeText}
          />
        </div>
      </div>
    </div>
  );
};

export default RecipeResult;

// Simple URL sanitization to avoid dangerous protocols
function sanitizeUrl(raw: string): string {
  try {
    // Allow only blob: and data:image/* URLs for rendering in this component
    if (raw.startsWith('blob:') || raw.startsWith('data:image/')) return raw;
  } catch {
    // fallthrough
  }
  return '';
}

function getSafeImageSrc(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const safe = sanitizeUrl(raw);
  if (!safe) return undefined;
  // Whitelist data:image/* and blob:
  if (safe.startsWith('data:image/') || safe.startsWith('blob:')) return safe;
  return undefined;
}
