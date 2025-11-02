// Interactive cube UI that collects form inputs and ingredient selections.
import * as React from 'react';
import { RecipeFormData } from '../types';
import { COOKING_TIMES, DISH_TYPES, COMMON_INGREDIENTS } from '../constants';

// Internal components for cube faces
interface OptionSelectorProps {
  label: string;
  options: readonly string[];
  selectedValue: string;
  onChange: (value: string) => void;
  playSound: () => void;
}
const OptionSelector: React.FC<OptionSelectorProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  playSound,
}) => (
  <>
    <span className='pixel-font-small text-green-400'>{label}</span>
    <div className='flex flex-wrap justify-center items-center gap-2 mt-2'>
      {options.map(option => (
        <button
          key={option}
          onClick={() => {
            onChange(option);
            playSound();
          }}
          className={`arcade-option-button pixel-font-small px-2 py-1 border ${
            selectedValue === option
              ? 'bg-green-500 text-black border-green-500 animate-selected'
              : 'text-green-500 border-transparent'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  </>
);

interface BranchCubeProps {
  ingredient: string;
  index: number;
  onDelete: (index: number) => void;
  playSound: () => void;
  isDuplicate: boolean;
}

const BRANCH_VARIANTS = [
  { wrapperClass: 'branch-variant-a', rotationClass: 'branch-rotation-slow' },
  { wrapperClass: 'branch-variant-b', rotationClass: 'branch-rotation-medium' },
  { wrapperClass: 'branch-variant-c', rotationClass: 'branch-rotation-fast' },
  { wrapperClass: 'branch-variant-d', rotationClass: 'branch-rotation-medium' },
  { wrapperClass: 'branch-variant-e', rotationClass: 'branch-rotation-slow' },
  { wrapperClass: 'branch-variant-f', rotationClass: 'branch-rotation-fast' },
  { wrapperClass: 'branch-variant-g', rotationClass: 'branch-rotation-medium' },
  { wrapperClass: 'branch-variant-h', rotationClass: 'branch-rotation-slow' },
] as const;

const BranchCube: React.FC<BranchCubeProps> = ({
  ingredient,
  index,
  onDelete,
  playSound,
  isDuplicate,
}) => {
  const [isMounted, setIsMounted] = React.useState(false);
  const variant = React.useMemo(
    () => BRANCH_VARIANTS[Math.floor(Math.random() * BRANCH_VARIANTS.length)],
    []
  );

  React.useEffect(() => {
    const timer = globalThis.setTimeout(() => setIsMounted(true), 10);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const wrapperClassName = [
    'fractal-branch absolute branch-generated',
    variant.wrapperClass,
    isMounted ? 'branch-entered' : 'branch-entering',
  ]
    .filter(Boolean)
    .join(' ');

  const cubeClassName = [
    'cube branch-cube',
    variant.rotationClass,
    isDuplicate ? 'animate-glitch-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      <div className={cubeClassName}>
        <div className='cube-face branch-face branch-face-front text-xs'>
          <div className='cube-face-inner branch-face-inner'>{ingredient.toUpperCase()}</div>
        </div>
        <div className='cube-face branch-face branch-face-back text-xs'>
          <div className='cube-face-inner branch-face-inner'>[{index}]</div>
        </div>
        <div className='cube-face branch-face branch-face-right text-xs'>
          <div className='cube-face-inner branch-face-inner'>...</div>
        </div>
        <div className='cube-face branch-face branch-face-left text-xs'>
          <div className='cube-face-inner branch-face-inner'>...</div>
        </div>
        <div className='cube-face branch-face branch-face-top text-xs'>
          <div className='cube-face-inner branch-face-inner'>
            <button
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onDelete(index);
                playSound();
              }}
              className='arcade-close-button cube-delete-button'
              aria-label={`Delete ${ingredient}`}
            >
              X
            </button>
          </div>
        </div>
        <div className='cube-face branch-face branch-face-bottom text-xs'>
          <div className='cube-face-inner branch-face-inner branch-recycle-container'>
            <span className='material-symbols-outlined text-green-500 icon-pixel text-6xl animate-spin-slow reverse-spin'>
              recycling
            </span>
            <div className='recycle-letter-cloud'>
              {RECYCLE_CHARACTERS.map((char, idx) => (
                <span
                  key={`${char}-${idx}`}
                  className={`pixel-font-small recycle-letter recycle-letter-${idx}`}
                >
                  <span className='recycle-letter-inner'>{char === ' ' ? '\u00A0' : char}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FractalCubeProps {
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  onAddIngredient: (ingredient: string) => void;
  onDeleteIngredient: (index: number) => void;
  languageWarning: string;
  playSound: () => void;
  isRandomRotation: boolean;
}

const getIconForIngredient = (ingredient: string): string => {
  const lowerIng = ingredient.toLowerCase();
  if (/\b(tomato|onion|carrot|pepper|lettuce|spinach|broccoli|garlic|veg)\b/.test(lowerIng))
    return 'eco';
  if (/\b(chicken|beef|pork|meat|lamb)\b/.test(lowerIng)) return 'kebab_dining';
  if (/\b(fish|shrimp|salmon|tuna|seafood)\b/.test(lowerIng)) return 'set_meal';
  if (/\b(apple|orange|banana|berry|lemon|fruit)\b/.test(lowerIng)) return 'apple';
  if (/\b(cheese|milk|butter|yogurt|cream)\b/.test(lowerIng)) return 'icecream';
  if (/\b(rice|pasta|flour|bread|grain)\b/.test(lowerIng)) return 'grain';
  if (/\b(spice|herb|salt|pepper|cumin|chili)\b/.test(lowerIng)) return 'grass';
  if (/\b(egg)\b/.test(lowerIng)) return 'egg';
  if (/\b(mushroom)\b/.test(lowerIng)) return 'mushroom';
  if (/\b(oil|vinegar)\b/.test(lowerIng)) return 'oil_barrel';
  return 'lunch_dining'; // Default fallback
};

const recycleText = 'RECYCLE SCRAPS';
const RECYCLE_CHARACTERS = recycleText.split('');

const FractalCube: React.FC<FractalCubeProps> = ({
  formData,
  setFormData,
  onAddIngredient,
  onDeleteIngredient,
  languageWarning,
  playSound,
  isRandomRotation,
}) => {
  const [ingredientInput, setIngredientInput] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [duplicateIndex, setDuplicateIndex] = React.useState<number | null>(null);
  const [addSuccess, setAddSuccess] = React.useState(false);
  const [displayIcon, setDisplayIcon] = React.useState('edit_note');
  const [addCounter, setAddCounter] = React.useState(0);
  const [countText, setCountText] = React.useState(
    formData.ingredients.length > 0 ? `${formData.ingredients.length} ITEM(S)` : 'EMPTY'
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cubeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const targetText =
      formData.ingredients.length > 0 ? `${formData.ingredients.length} ITEM(S)` : 'EMPTY';
    let iteration = 0;
    const scrambleDuration = 400; // ms
    const frameRate = 40; // ms per frame

    const scrambleIntervalId = globalThis.setInterval(() => {
      const scrambled = targetText
        .split('')
        .map((_char, index) => {
          if (iteration / (scrambleDuration / frameRate) > index / targetText.length) {
            return targetText[index];
          }
          const chars = '█▓▒░#<>*&%$';
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      setCountText(scrambled);

      if (iteration >= scrambleDuration / frameRate) {
        globalThis.clearInterval(scrambleIntervalId);
        setCountText(targetText);
      }
      iteration += 1;
    }, frameRate);

    return () => globalThis.clearInterval(scrambleIntervalId);
  }, [formData.ingredients.length]);

  React.useEffect(() => {
    if (displayIcon !== 'edit_note') {
      const timer = setTimeout(() => {
        setDisplayIcon('edit_note');
      }, 1500); // Duration the temporary icon is shown
      return () => clearTimeout(timer);
    }
  }, [displayIcon, addCounter]);

  React.useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    let animationFrameId: number;

    if (isRandomRotation) {
      cube.style.animation = 'none'; // Disable CSS animation

      const rotation = { x: 0, y: 0 };
      const velocity = { x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.5) * 0.4 };

      const intervalId = globalThis.setInterval(() => {
        velocity.x = (Math.random() - 0.5) * 0.4; // Slower, more gentle changes
        velocity.y = (Math.random() - 0.5) * 0.4;
      }, 3500);

      const animate = () => {
        rotation.x += velocity.x;
        rotation.y += velocity.y;
        cube.style.transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        globalThis.clearInterval(intervalId);
        cube.style.animation = '';
        cube.style.transform = '';
      };
    }

    // Not random rotation: reset to CSS-driven animation
    cube.style.animation = '';
    cube.style.transform = '';
    return () => {
      cancelAnimationFrame(animationFrameId);
      cube.style.animation = '';
      cube.style.transform = '';
    };
  }, [isRandomRotation]);

  // recycle animation now handled via CSS only

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIngredientInput(value);
    setInputError(null); // Clear error on new input
    setDuplicateIndex(null); // Clear highlight on new input
    setHighlightedIndex(-1); // Reset highlight on change

    if (value.length > 0) {
      const filtered = COMMON_INGREDIENTS.filter(
        ing =>
          ing.toLowerCase().startsWith(value.toLowerCase()) &&
          !formData.ingredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
      ).slice(0, 5); // Show up to 5 suggestions
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (suggestion) {
      setIngredientInput(suggestion);
      setShowSuggestions(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
      playSound();
    }
  };

  const handleAddClick = () => {
    if (isAdding) return;
    playSound();

    const trimmedInput = ingredientInput.trim();
    setInputError(null);
    setDuplicateIndex(null); // Clear previous highlight
    setShowSuggestions(false);

    if (!trimmedInput) return;

    if (trimmedInput.length > 100) {
      setInputError('TOO LONG! (MAX 100)');
      setTimeout(() => setInputError(null), 3000);
      return;
    }

    const isValidChars = /^[\p{L}0-9\s.'-]+$/u.test(trimmedInput);
    if (!isValidChars) {
      setInputError('INVALID CHARS!');
      setTimeout(() => setInputError(null), 3000);
      return;
    }

    const duplicateIdx = formData.ingredients.findIndex(
      ing => ing.toLowerCase() === trimmedInput.toLowerCase()
    );

    if (duplicateIdx !== -1) {
      setInputError('ALREADY ADDED!');
      setDuplicateIndex(duplicateIdx);
      setTimeout(() => {
        setInputError(null);
        setDuplicateIndex(null);
      }, 3000);
      return;
    }

    setIsAdding(true);
    setAddSuccess(true);
    const newIcon = getIconForIngredient(trimmedInput);
    setDisplayIcon(newIcon);
    setAddCounter(c => c + 1); // This ensures re-animation even if icon is the same
    setTimeout(() => setIsAdding(false), 500);
    setTimeout(() => setAddSuccess(false), 500);

    onAddIngredient(trimmedInput);
    setIngredientInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        if (highlightedIndex > -1) {
          e.preventDefault();
          handleSelectSuggestion(highlightedIndex);
        } else {
          handleAddClick();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Enter') {
      handleAddClick();
    }
  };

  return (
    <>
      <div className='cube' ref={cubeRef}>
        {/* Faces */}
        <div
          className={`cube-face front animate-face-pulse ${addSuccess ? 'animate-face-flash' : ''}`}
        >
          <div
            className={`cube-face-inner transition-all duration-300 ${languageWarning ? 'animate-pulse-red' : ''}`}
          >
            <span
              key={`${displayIcon}-${addCounter}`}
              className={`material-symbols-outlined text-green-500 icon-pixel text-4xl ${displayIcon === 'edit_note' ? 'animate-icon-nudge' : 'animate-icon-pop-in'}`}
            >
              {displayIcon}
            </span>
            <span className='pixel-font-small text-green-400'>ADD INGREDIENT</span>
            <div className='relative w-[90%] flex flex-col items-center'>
              <input
                ref={inputRef}
                className={`fractal-input ${inputError ? 'input-error animate-shake' : ''} ${isAdding ? 'is-processing-animation' : ''}`}
                value={ingredientInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (ingredientInput) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Delay to allow click
                placeholder='E.G. SPICE'
                maxLength={100}
                disabled={isAdding}
                autoComplete='off'
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className='suggestions-list'>
                  {suggestions.map((s, index) => (
                    <li key={s}>
                      <button
                        type='button'
                        className={index === highlightedIndex ? 'suggestion-highlighted' : ''}
                        onMouseDown={() => handleSelectSuggestion(index)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {inputError && (
                <p className='absolute -bottom-6 text-yellow-400 pixel-font-small animate-shake'>
                  {inputError}
                </p>
              )}
            </div>
            <button
              onClick={handleAddClick}
              className='fractal-button mt-2'
              disabled={isAdding || !ingredientInput.trim()}
            >
              {isAdding ? '...' : 'ADD'}
            </button>
            {languageWarning && (
              <p className='absolute top-full mt-2 w-full text-center text-yellow-400 pixel-font-small animate-pulse'>
                {languageWarning}
              </p>
            )}
          </div>
        </div>
        <div className='cube-face back animate-face-pulse'>
          <div className='cube-face-inner'>
            <OptionSelector
              label='COOKING TIME'
              options={COOKING_TIMES}
              selectedValue={formData.cookingTime}
              onChange={value =>
                setFormData(p => ({ ...p, cookingTime: value as (typeof COOKING_TIMES)[number] }))
              }
              playSound={playSound}
            />
          </div>
        </div>
        <div className='cube-face right animate-face-pulse'>
          <div className='cube-face-inner'>
            <OptionSelector
              label='DISH TYPE'
              options={DISH_TYPES}
              selectedValue={formData.dishType}
              onChange={value =>
                setFormData(p => ({ ...p, dishType: value as (typeof DISH_TYPES)[number] }))
              }
              playSound={playSound}
            />
          </div>
        </div>
        <div className='cube-face left animate-face-pulse'>
          <div className='cube-face-inner'>
            <span className='pixel-font-small text-green-400'>SYSTEM CORE</span>
            <span className='material-symbols-outlined text-green-500 icon-pixel text-6xl animate-core-pulse'>
              hub
            </span>
          </div>
        </div>
        <div className='cube-face top animate-face-pulse'>
          <div className='cube-face-inner'>
            <span className='pixel-font-small text-green-400'>INGREDIENTS</span>
            <div className='text-xs text-green-300'>{countText}</div>
          </div>
        </div>
        <div className='cube-face bottom animate-face-pulse'>
          <div className='cube-face-inner branch-recycle-container'>
            <span className='material-symbols-outlined text-green-500 icon-pixel text-6xl animate-spin-slow reverse-spin'>
              recycling
            </span>
            <div className='recycle-letter-cloud'>
              {RECYCLE_CHARACTERS.map((char, idx) => (
                <span
                  key={`${char}-${idx}`}
                  className={`pixel-font-small recycle-letter recycle-letter-${idx}`}
                >
                  <span className='recycle-letter-inner'>{char === ' ' ? '\u00A0' : char}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {formData.ingredients.map((ing, i) => (
        <BranchCube
          key={`${ing}-${i}-${formData.ingredients.length}`}
          ingredient={ing}
          index={i}
          onDelete={onDeleteIngredient}
          playSound={playSound}
          isDuplicate={duplicateIndex === i}
        />
      ))}
    </>
  );
};
export default FractalCube;
