// Core application component that manages recipe synthesis, wallet flow, and membership gating.
import * as React from 'react';
import FractalCube from './components/FractalCube';
import RecipeResult from './components/RecipeResult';
import SavedRecipesModal from './components/SavedRecipesModal';
import { formatEther, type Address } from 'viem';
import { RecipeFormData, SavedRecipe, LoadingState } from './types';
import { generateRecipe, generateImageForRecipe } from './services/geminiService';
import { LANGUAGES, COOKING_TIMES, DISH_TYPES, RECIPE_GENERATION_MESSAGES, IMAGE_GENERATION_MESSAGES, THEMATIC_BACKGROUNDS } from './constants';
import { connectWallet, recordRecipeOnchain, fetchOnchainCookbook, resolveBasename, fetchMembershipPrice, checkLifetimeMembership, purchaseLifetimeMembership, DEFAULT_MEMBERSHIP_PRICE_WEI } from './services/baseRegistry';

const detectScript = (text: string): 'Latin' | 'Devanagari' | 'Bengali' | 'Mixed' | 'Neutral' | 'Unknown' => {
  // Clean text of characters that are common across many scripts
  const cleanedText = text.replace(/[0-9\s,.'-]/g, '');
  if (!cleanedText.trim()) return 'Neutral'; // Contains only neutral characters

  const hasLatin = /[a-zA-Z\u00C0-\u017F]/.test(cleanedText); // Latin + Latin-1 Supplement
  const hasDevanagari = /[\u0900-\u097F]/.test(cleanedText);
  const hasBengali = /[\u0980-\u09FF]/.test(cleanedText);

  const scriptsFound = [hasLatin, hasDevanagari, hasBengali].filter(Boolean).length;

  if (scriptsFound > 1) return 'Mixed';
  if (hasLatin) return 'Latin';
  if (hasDevanagari) return 'Devanagari';
  if (hasBengali) return 'Bengali';
  
  // If we reach here, it means cleanedText is not empty but contains none of the scripts we check for.
  // This indicates an unsupported, non-neutral script.
  return 'Unknown';
};


const LANGUAGE_TO_SCRIPT: { [key: string]: 'Latin' | 'Devanagari' | 'Bengali' } = {
  'English': 'Latin',
  'Spanish': 'Latin',
  'French': 'Latin',
  'Hindi': 'Devanagari',
  'Bengali': 'Bengali',
};

const SOUND_SOURCES: Record<string, string> = {
  'click-sound': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/sounds/click.wav',
  'generate-sound': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/sounds/generate.wav',
  'upload-sound': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/sounds/upload.wav',
  'record-start-sound': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/sounds/record-start.wav',
  'record-stop-sound': 'https://storage.googleapis.com/generative-ai-cookbook/creative-code-collections/fractal-recipe/sounds/record-stop.wav',
};

// Create audio elements once, outside the component, to be reused.
const SOUNDS: Record<string, HTMLAudioElement> = Object.entries(SOUND_SOURCES)
  .reduce((acc, [key, src]) => {
    const audio = new Audio(src);
    audio.volume = 0.7;
    acc[key] = audio;
    return acc;
  }, {} as Record<string, HTMLAudioElement>);

const shortenAddress = (address: Address) => `${address.slice(0, 6)}...${address.slice(-4)}`;


const App: React.FC = () => {
  const [loadingState, setLoadingState] = React.useState<LoadingState>('idle');
  const [loadingMessage, setLoadingMessage] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [recipeResult, setRecipeResult] = React.useState<SavedRecipe | null>(null);
  const [formData, setFormData] = React.useState<RecipeFormData>({
    ingredients: [],
    cookingTime: COOKING_TIMES[0],
    dishType: DISH_TYPES[0],
    language: LANGUAGES[0],
  });
  const [languageWarning, setLanguageWarning] = React.useState('');
  const [savedRecipes, setSavedRecipes] = React.useState<SavedRecipe[]>([]);
  const [showSavedModal, setShowSavedModal] = React.useState(false);
  const [isRandomRotation, setIsRandomRotation] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<Address | null>(null);
  const [walletName, setWalletName] = React.useState<string | null>(null);
  const [onchainStatus, setOnchainStatus] = React.useState<string | null>(null);
  const [onchainError, setOnchainError] = React.useState<string | null>(null);
  const [onchainRecipes, setOnchainRecipes] = React.useState<SavedRecipe[]>([]);
  const [isLifetimeMember, setIsLifetimeMember] = React.useState<boolean | null>(null);
  const [membershipPriceWei, setMembershipPriceWei] = React.useState<bigint | null>(null);
  const [isMembershipLoading, setIsMembershipLoading] = React.useState(false);
  const [isPurchasingMembership, setIsPurchasingMembership] = React.useState(false);
  const [membershipStatus, setMembershipStatus] = React.useState<string | null>(null);
  const [membershipError, setMembershipError] = React.useState<string | null>(null);
  const [membershipTxHash, setMembershipTxHash] = React.useState<string | null>(null);

  const refreshMembershipStatus = React.useCallback(async (address: Address): Promise<boolean> => {
    setIsMembershipLoading(true);
    setMembershipError(null);
    try {
      const active = await checkLifetimeMembership(address);
      setIsLifetimeMember(active);
      setMembershipStatus(active ? 'LIFETIME ACCESS ACTIVE' : 'LIFETIME MEMBERSHIP REQUIRED');
      return active;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify membership.';
      setMembershipError(message);
      setTimeout(() => setMembershipError(null), 6000);
      return false;
    } finally {
      setIsMembershipLoading(false);
    }
  }, []);

  const connectWalletFlow = React.useCallback(async (): Promise<Address> => {
    setOnchainError(null);
    setOnchainStatus('CONNECTING TO BASE SEPOLIA...');
    setIsWalletBusy(true);
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setOnchainStatus(`CONNECTED: ${shortenAddress(address)}`);
      setMembershipStatus('CHECKING MEMBERSHIP...');
      return address;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wallet connection failed.';
      setOnchainError(message);
      setTimeout(() => setOnchainError(null), 6000);
      setOnchainStatus(null);
      throw err;
    } finally {
      setIsWalletBusy(false);
    }
  }, []);

  const ensureWalletConnection = React.useCallback(async (): Promise<Address> => {
    if (walletAddress) {
      if (isLifetimeMember === null) {
        refreshMembershipStatus(walletAddress).catch(() => undefined);
      }
      return walletAddress;
    }
    return connectWalletFlow();
  }, [walletAddress, connectWalletFlow, refreshMembershipStatus, isLifetimeMember]);
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null);
  const [isWalletBusy, setIsWalletBusy] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedRecipes = JSON.parse(localStorage.getItem('fractalRecipes') || '[]');
      const normalizedRecipes: SavedRecipe[] = Array.isArray(storedRecipes)
        ? storedRecipes.map((entry: SavedRecipe) => ({
            ...entry,
            source: entry.source ?? 'local',
          }))
        : [];
      setSavedRecipes(normalizedRecipes);
    } catch (e) {
      console.error("Failed to load recipes from storage", e);
      setSavedRecipes([]);
    }

    const storedTxHash = localStorage.getItem('fractalLastTx');
    if (storedTxHash) {
      setLastTxHash(storedTxHash);
    }

    // Check for shared recipe in URL on initial load
    const urlParams = new URLSearchParams(globalThis.location?.search ?? '');
    const sharedRecipeData = urlParams.get('recipe');
    if (sharedRecipeData) {
      try {
        const decodedData = atob(sharedRecipeData);
        const sharedRecipe: SavedRecipe = JSON.parse(decodedData);
        setRecipeResult({ ...sharedRecipe, source: sharedRecipe.source ?? 'local' });
        // Clean the URL to avoid re-showing on refresh
        globalThis.history?.replaceState({}, '', globalThis.location?.pathname ?? '/');
      } catch (e) {
        console.error("Failed to parse shared recipe data:", e);
        setError("COULD NOT LOAD SHARED RECIPE. DATA IS CORRUPT.");
        setTimeout(() => setError(null), 4000);
      }
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    fetchMembershipPrice()
      .then((price) => {
        if (!cancelled) {
          setMembershipPriceWei(price ?? DEFAULT_MEMBERSHIP_PRICE_WEI);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMembershipPriceWei(DEFAULT_MEMBERSHIP_PRICE_WEI);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadOnchainCookbook = React.useCallback(async () => {
    try {
      const remoteEntries = await fetchOnchainCookbook();
      setOnchainRecipes(remoteEntries);
      setOnchainError(null);
    } catch (err) {
      console.error('Failed to fetch onchain cookbook', err);
      setOnchainError('FAILED TO SYNC ONCHAIN COOKBOOK');
    }
  }, []);

  React.useEffect(() => {
    loadOnchainCookbook();
  }, [loadOnchainCookbook]);

  React.useEffect(() => {
    if (!lastTxHash) {
      return;
    }
    localStorage.setItem('fractalLastTx', lastTxHash);
    loadOnchainCookbook();
  }, [lastTxHash, loadOnchainCookbook]);

  React.useEffect(() => {
    if (!walletAddress) {
      setWalletName(null);
      return;
    }

    let isCancelled = false;

    resolveBasename(walletAddress)
      .then((name) => {
        if (!isCancelled) {
          setWalletName(name);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setWalletName(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [walletAddress]);

  React.useEffect(() => {
    if (!walletAddress) {
      setIsLifetimeMember(null);
      setMembershipStatus(null);
      setMembershipTxHash(null);
      return;
    }

    refreshMembershipStatus(walletAddress).catch(() => undefined);
  }, [walletAddress, refreshMembershipStatus]);

  React.useEffect(() => {
    const globalWindow = typeof globalThis === 'object'
      ? (globalThis as Window & { ethereum?: { on?: (...args: unknown[]) => void; removeListener?: (...args: unknown[]) => void } })
      : undefined;

    const provider = globalWindow?.ethereum;
    if (!provider?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        setWalletAddress(null);
        setWalletName(null);
        setOnchainStatus(null);
        setIsLifetimeMember(null);
        setMembershipStatus(null);
        setMembershipTxHash(null);
        return;
      }
      setWalletAddress(accounts[0] as Address);
      setOnchainStatus(`CONNECTED: ${shortenAddress(accounts[0] as Address)}`);
      setMembershipStatus('CHECKING MEMBERSHIP...');
    };

    provider.on('accountsChanged', handleAccountsChanged);
    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, []);

  React.useEffect(() => {
    if (!onchainStatus) {
      return;
    }
    const timeout = setTimeout(() => setOnchainStatus(null), 6000);
    return () => clearTimeout(timeout);
  }, [onchainStatus]);

  const playSound = React.useCallback((soundId: string = 'click-sound') => {
    const audio = SOUNDS[soundId];
    if (!audio) {
      console.warn(`Sound with id "${soundId}" not found.`);
      return;
    }
    
    // By setting currentTime to 0, we can replay the sound even if it's already playing.
    audio.currentTime = 0;
    audio.play().catch(err => {
      // The error might still happen in some edge cases, but this approach is generally more stable for rapid UI sounds.
      console.error(`Error playing sound (${soundId}): ${err.message}`);
    });
  }, []);

  const handlePurchaseMembership = React.useCallback(async () => {
    let activeAddress: Address;
    try {
      activeAddress = await ensureWalletConnection();
    } catch {
      return;
    }

    setMembershipError(null);
    setMembershipStatus('PREPARING MEMBERSHIP TX...');
    setIsPurchasingMembership(true);
    playSound('upload-sound');

    try {
      const priceToPay = membershipPriceWei ?? DEFAULT_MEMBERSHIP_PRICE_WEI;
      const txHash = await purchaseLifetimeMembership(activeAddress, priceToPay);
      setMembershipTxHash(txHash);
      setMembershipStatus('LIFETIME MEMBERSHIP ACTIVATED');
      setIsLifetimeMember(true);
      await refreshMembershipStatus(activeAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Membership purchase failed.';
      setMembershipError(message);
      setTimeout(() => setMembershipError(null), 6000);
      setMembershipStatus(null);
    } finally {
      setIsPurchasingMembership(false);
    }
  }, [ensureWalletConnection, membershipPriceWei, playSound, refreshMembershipStatus]);

  const handleAddIngredient = (ingredient: string) => {
    const selectedScript = LANGUAGE_TO_SCRIPT[formData.language];
    const detectedScript = detectScript(ingredient);
    
    // Allow neutral inputs (e.g., "100%") to pass validation.
    if (detectedScript === 'Neutral') {
      // The ingredient will be added at the end of the function.
    } 
    // If a script is detected, it MUST match the selected language's script.
    // Explicitly block 'Mixed' or 'Unknown' scripts to ensure prompt clarity.
    else if (detectedScript !== selectedScript) {
        let warningMessage: string;
        if (detectedScript === 'Mixed') {
            warningMessage = 'MIXED SCRIPT DETECTED! Please use a single language.';
        } else if (detectedScript === 'Unknown') {
            warningMessage = `UNSUPPORTED CHARS! Please use ${formData.language}.`;
        } else {
            // e.g., "Devanagari script detected. Please use English."
            warningMessage = `${detectedScript} script detected. System is set to ${formData.language}.`;
        }
        
        setLanguageWarning(warningMessage);
        setTimeout(() => setLanguageWarning(''), 5000);
        playSound();
        return; // Block adding the ingredient.
    }
    
    // If all checks passed, clear any previous warning and add the ingredient.
    setLanguageWarning('');
    setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, ingredient] }));
  };
  
  const handleDeleteIngredient = (index: number) => {
    setFormData(prev => ({...prev, ingredients: prev.ingredients.filter((_, i) => i !== index)}));
  };

  const handleGenerateRecipe = async () => {
    if (formData.ingredients.length === 0) {
      setError("MUST ADD AT LEAST ONE INGREDIENT TO GROW A RECIPE!");
      setTimeout(() => setError(null), 3000);
      playSound();
      return;
    }

    setError(null);
    setRecipeResult(null);
    setOnchainStatus(null);

    let activeAddress: Address;
    try {
      activeAddress = await ensureWalletConnection();
    } catch (walletErr) {
      console.error('Wallet connection failed', walletErr);
      return;
    }

    const hasMembership = isLifetimeMember === true
      ? true
      : await refreshMembershipStatus(activeAddress);

    if (!hasMembership) {
      setError('LIFETIME MEMBERSHIP REQUIRED. JOIN THE FRACTAL KITCHEN TO CONTINUE.');
      setTimeout(() => setError(null), 5000);
      playSound();
      return;
    }

    setLoadingState('recipe');

    try {
      const recipe = await generateRecipe(formData);
      
      // Add a transition step for better user feedback
      setLoadingState('transition');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      setLoadingState('image'); // Switch to image generation state
      const imageUrl = await generateImageForRecipe(recipe);

      const resultPayload: SavedRecipe = { recipe, imageUrl, source: 'local' };
      setRecipeResult(resultPayload);

      setOnchainStatus('AWAITING WALLET SIGNATURE...');
      setIsWalletBusy(true);
      try {
        const txHash = await recordRecipeOnchain(activeAddress, resultPayload);
        setLastTxHash(txHash);
        setOnchainStatus('RECIPE ANCHORED ON BASE SEPOLIA');
      } catch (chainErr) {
        console.error('Failed to record recipe onchain', chainErr);
        const message = chainErr instanceof Error ? chainErr.message : 'Failed to record recipe onchain.';
        setOnchainError(message);
        setTimeout(() => setOnchainError(null), 6000);
        setOnchainStatus(null);
      } finally {
        setIsWalletBusy(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingState('idle');
    }
  };
  
  React.useEffect(() => {
    if (loadingState === 'idle') return;

    if (loadingState === 'transition') {
      setLoadingMessage('RECIPE COMPILED! GENERATING VISUALS...');
      // No interval, just a static message.
      return;
    }

    const messages = loadingState === 'recipe' 
      ? RECIPE_GENERATION_MESSAGES 
      : IMAGE_GENERATION_MESSAGES;
    
    let currentMessageIndex = 0;
    setLoadingMessage(messages[0]);
    
    const messageInterval = globalThis.setInterval?.(() => {
      currentMessageIndex = (currentMessageIndex + 1) % messages.length;
      setLoadingMessage(messages[currentMessageIndex]);
    }, 2500);

    return () => {
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [loadingState]);


  const handleCloseResult = () => {
    setRecipeResult(null);
  };

  const handleSaveRecipe = (recipeToSave: SavedRecipe) => {
    const nextRecipe: SavedRecipe = { ...recipeToSave, source: 'local' };
    const isAlreadySaved = savedRecipes.some(r => r.recipe.dishName === nextRecipe.recipe.dishName);
    if (!isAlreadySaved) {
      const updatedRecipes = [...savedRecipes, nextRecipe];
      setSavedRecipes(updatedRecipes);
      localStorage.setItem('fractalRecipes', JSON.stringify(updatedRecipes));
    }
    playSound();
  };

  const handleDeleteRecipe = (dishName: string) => {
    const updatedRecipes = savedRecipes.filter(r => r.recipe.dishName !== dishName);
    setSavedRecipes(updatedRecipes);
    localStorage.setItem('fractalRecipes', JSON.stringify(updatedRecipes));
    playSound();
  };

  const handleLoadRecipe = (recipeToLoad: SavedRecipe) => {
    setRecipeResult({ ...recipeToLoad, source: recipeToLoad.source ?? 'local' });
    setShowSavedModal(false);
    playSound();
  };

  const handleToggleRotation = () => {
    playSound();
    setIsRandomRotation(prev => !prev);
  };

  const membershipPriceDisplay = React.useMemo(() => {
    const price = membershipPriceWei ?? DEFAULT_MEMBERSHIP_PRICE_WEI;
    const formatted = formatEther(price);
    const numeric = Number.parseFloat(formatted);
    if (Number.isFinite(numeric)) {
      const decimals = numeric >= 1 ? 2 : 3;
      return Number(numeric.toFixed(decimals)).toString();
    }
    return formatted;
  }, [membershipPriceWei]);

  const membershipMessage = React.useMemo(() => {
    if (isMembershipLoading) {
      return 'VERIFYING MEMBERSHIP...';
    }
    if (membershipStatus) {
      return membershipStatus;
    }
    if (walletAddress) {
      return 'Members can anchor recipes forever.';
    }
    return 'Connect a wallet to become a lifetime member.';
  }, [isMembershipLoading, membershipStatus, walletAddress]);

  const membershipButtonLabel = React.useMemo(() => {
    if (isLifetimeMember) {
      return 'MEMBER ACTIVE';
    }
    if (isPurchasingMembership) {
      return 'PROCESSING...';
    }
    return `JOIN FOR ${membershipPriceDisplay} ETH`;
  }, [isLifetimeMember, isPurchasingMembership, membershipPriceDisplay]);

  const disableMembershipButton = isLifetimeMember === true || isPurchasingMembership || isMembershipLoading || isWalletBusy;

  const cookbookEntries = React.useMemo(
    () => [...onchainRecipes, ...savedRecipes],
    [onchainRecipes, savedRecipes]
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative text-center">
      <div className="absolute inset-0 bg-black/70 z-0"></div>
       <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
        <button onClick={() => { playSound(); setShowSavedModal(true); }} className="arcade-button-small">COOKBOOK</button>
        <button
          onClick={() => { playSound(); connectWalletFlow().catch(() => undefined); }}
          className="arcade-button-small"
          disabled={isWalletBusy}
        >
          {walletAddress ? (walletName ?? shortenAddress(walletAddress)) : 'CONNECT WALLET'}
        </button>
        {lastTxHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-font-small text-xs text-green-400 underline"
          >
            VIEW TX
          </a>
        )}
        {onchainError && (
          <span className="pixel-font-small text-xs text-red-400 text-right max-w-[200px] leading-tight">
            {onchainError}
          </span>
        )}
      </div>
       <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-4">
        <div onClick={handleToggleRotation} className={`arcade-toggle-switch ${isRandomRotation ? 'toggled' : ''}`}>
           <span className="pixel-font-small text-xs">RANDOMIZER</span>
           <div className="switch-track">
              <div className="switch-handle"></div>
           </div>
        </div>
        <div>
          <label htmlFor="language-select" className="pixel-font-small text-xs text-green-400 block mb-1 text-left">LANGUAGE</label>
          <select 
            id="language-select"
            value={formData.language} 
            onChange={(e) => {
              playSound();
              setFormData(p => ({...p, language: e.target.value as typeof LANGUAGES[number] }));
            }}
            className="arcade-select"
          >
            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </select>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-30 w-72 max-w-[90vw] text-left border border-green-500/60 bg-black/70 px-4 py-3 rounded-sm shadow-md">
        <h2 className="pixel-font-small text-green-300 text-lg">LIFETIME MEMBERSHIP</h2>
        <p className="pixel-font-small text-green-400 mt-2 leading-tight">
          Unlock permanent synth access for {membershipPriceDisplay} ETH on Base.
        </p>
        <ul className="pixel-font-small text-green-500 text-xs mt-3 space-y-1">
          <li>- Unlimited onchain cookbook slots</li>
          <li>- Retro-futuristic drops for members</li>
          <li>- Support the Fractal kitchen crew</li>
        </ul>
        <button
          onClick={handlePurchaseMembership}
          disabled={disableMembershipButton}
          className={`arcade-button-small mt-4 w-full ${disableMembershipButton ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {membershipButtonLabel}
        </button>
        <p className="pixel-font-small text-green-300 mt-3 leading-tight">{membershipMessage}</p>
        {membershipError && (
          <p className="pixel-font-small text-red-400 mt-2 leading-tight">{membershipError}</p>
        )}
        {membershipTxHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${membershipTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-font-small text-green-400 underline mt-2 inline-block"
          >
            VIEW MEMBERSHIP TX
          </a>
        )}
      </div>

      <div className="z-10 w-full">
        <header className="text-center mb-8">
          <h1 className="pixel-font-big">FRACTAL RECIPE</h1>
          <p className="pixel-font-small text-green-400 mt-2">EXPLORE INFINITE CULINARY BRANCHES</p>
        </header>

        <main className="flex justify-center items-center relative" style={{ height: '50vh' }}>
          <div className="cube-container">
            <FractalCube 
              formData={formData}
              setFormData={setFormData}
              onAddIngredient={handleAddIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              languageWarning={languageWarning}
              playSound={playSound}
              isRandomRotation={isRandomRotation}
            />
          </div>
        </main>
        
        <footer className="text-center mt-8 relative z-20">
          <div className={`transition-opacity duration-300 ${loadingState !== 'idle' ? 'opacity-50' : 'opacity-100'} ${error ? 'has-error' : ''}`}>
             <button
                onClick={() => { playSound('generate-sound'); handleGenerateRecipe(); }}
                disabled={loadingState !== 'idle'}
                className={`arcade-button ${loadingState !== 'idle' ? 'loading' : ''}`}
             >
              {loadingState !== 'idle' ? 'GENERATING...' : 'SYNTHESIZE RECIPE'}
            </button>
          </div>
          {onchainStatus && (
            <p className="pixel-font-small text-green-400 mt-3">{onchainStatus}</p>
          )}
        </footer>
      </div>

      {loadingState !== 'idle' && (
        <>
          <div 
            className="loading-background-container visible" 
            style={{ backgroundImage: `url('${THEMATIC_BACKGROUNDS['Cosmic Kitchen']}')` }}
          ></div>
          <div className="scanline-overlay"></div>
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
            {(loadingState === 'recipe' || loadingState === 'transition') && <div className="recipe-loader"></div>}
            {loadingState === 'image' && <div className="analysis-loader"></div>}
            <div className="pixel-font-medium text-yellow-400 flex items-end text-center h-8">
              <span className="loading-message-text">{loadingMessage}</span>
              {loadingState !== 'transition' && (
                <span className="loading-ellipsis ml-1">
                   <span>.</span>
                   <span>.</span>
                   <span>.</span>
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="error-notification-box">
          <span className="material-symbols-outlined text-yellow-400 icon-pixel text-4xl">error</span>
          <p className="pixel-font-small">{error}</p>
        </div>
      )}

      {recipeResult && (
        <RecipeResult
          recipe={recipeResult.recipe}
          imageUrl={recipeResult.imageUrl}
          onClose={handleCloseResult}
          onSave={() => handleSaveRecipe(recipeResult)}
          isSaved={savedRecipes.some(r => r.recipe.dishName === recipeResult.recipe.dishName)}
          playSound={playSound}
        />
      )}
      {showSavedModal && (
        <SavedRecipesModal
          recipes={cookbookEntries}
          onClose={() => { playSound(); setShowSavedModal(false); }}
          onLoad={handleLoadRecipe}
          onDelete={handleDeleteRecipe}
          playSound={playSound}
        />
      )}
    </div>
  );
};

export default App;
