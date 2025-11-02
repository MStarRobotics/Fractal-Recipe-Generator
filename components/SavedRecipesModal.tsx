// Modal listing saved recipes with analysis and load/delete actions.
import * as React from 'react';
import type { SavedRecipe } from '../types';
import { analyzeCookbook } from '../services/geminiService';
import { ANALYSIS_MESSAGES } from '../constants';

interface SavedRecipesModalProps {
  recipes: SavedRecipe[];
  onClose: () => void;
  onLoad: (recipe: SavedRecipe) => void;
  onDelete: (dishName: string) => void;
  playSound: () => void;
}

const SavedRecipesModal: React.FC<SavedRecipesModalProps> = ({
  recipes,
  onClose,
  onLoad,
  onDelete,
  playSound,
}) => {
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  const [analysisLoadingMessage, setAnalysisLoadingMessage] = React.useState(ANALYSIS_MESSAGES[0]);

  const handleDeleteClick = (dishName: string) => {
    playSound();
    onDelete(dishName);
    setConfirmDelete(null);
  };

  const handleAnalyzeCookbook = async () => {
    playSound();
    if (recipes.length < 2) return;
    setIsLoadingAnalysis(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeCookbook(recipes);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Cookbook analysis failed:', err);
      setAnalysisResult('ERROR: FAILED TO CONNECT TO CULINARY AI. ANALYSIS ABORTED.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  React.useEffect(() => {
    if (!isLoadingAnalysis) return;

    let messageIndex = 0;
    setAnalysisLoadingMessage(ANALYSIS_MESSAGES[messageIndex]);

    const intervalId = setInterval(() => {
      messageIndex = (messageIndex + 1) % ANALYSIS_MESSAGES.length;
      setAnalysisLoadingMessage(ANALYSIS_MESSAGES[messageIndex]);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isLoadingAnalysis]);

  return (
    <div className='modal-backdrop'>
      <div className='modal-content relative'>
        <button
          onClick={() => {
            playSound();
            onClose();
          }}
          className='arcade-close-button top-2 right-2'
          aria-label='Close cookbook'
        >
          X
        </button>
        <h2 className='text-yellow-400 text-2xl mb-4 text-center'>
          {analysisResult ? 'AI ANALYSIS' : 'COOKBOOK'}
        </h2>

        {(() => {
          if (isLoadingAnalysis) {
            return (
              <div className='text-center py-8'>
                <div className='analysis-loader'></div>
                <p className='pixel-font-small mt-4 text-yellow-400 flex items-end justify-center'>
                  <span>{analysisLoadingMessage}</span>
                  <span className='loading-ellipsis ml-1'>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </p>
              </div>
            );
          }
          if (analysisResult) {
            return (
              <div className='animate-fade-in'>
                <div className='retro-terminal max-h-[50vh] overflow-y-auto mt-0'>
                  <h4>SYSTEM ANALYSIS OF COOKBOOK_V2.0:</h4>
                  <p>
                    {analysisResult.split('\n').map((line, i, arr) => (
                      <span key={`${line}-${i}`}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
                <div className='text-center mt-4'>
                  <button
                    onClick={() => {
                      playSound();
                      setAnalysisResult(null);
                    }}
                    className='arcade-button-small'
                  >
                    BACK TO RECIPES
                  </button>
                </div>
              </div>
            );
          }
          return (
            <>
              <div className='text-center mb-4'>
                <button
                  onClick={handleAnalyzeCookbook}
                  disabled={recipes.length < 2}
                  className='arcade-button-small'
                  title={
                    recipes.length < 2
                      ? 'Save at least 2 recipes to enable AI analysis'
                      : 'Analyze your cooking patterns'
                  }
                >
                  ANALYZE COOKBOOK
                </button>
              </div>
              {recipes.length > 0 ? (
                <ul className='space-y-3 max-h-[50vh] overflow-y-auto pr-2'>
                  {recipes.map(savedItem => {
                    const isOnchain = savedItem.source === 'onchain';
                    const txUrl = savedItem.txHash
                      ? `https://sepolia.basescan.org/tx/${savedItem.txHash}`
                      : null;

                    return (
                      <li
                        key={`${savedItem.recipe.dishName}-${savedItem.txHash ?? savedItem.creator ?? 'local'}`}
                        className='flex justify-between items-center p-2 bg-black/30 border border-green-700'
                      >
                        <div className='flex flex-col items-start'>
                          <span className='pixel-font-small truncate pr-2 max-w-[220px]'>
                            {savedItem.recipe.dishName}
                          </span>
                          {isOnchain && (
                            <div className='flex items-center gap-2 mt-1'>
                              <span className='pixel-font-small text-xs text-green-400'>
                                ONCHAIN
                              </span>
                              {txUrl && (
                                <a
                                  href={txUrl}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='pixel-font-small text-xs text-green-300 underline'
                                >
                                  TX
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className='flex gap-2'>
                          {isOnchain && (
                            <button
                              onClick={() => onLoad(savedItem)}
                              className='arcade-button-small'
                            >
                              LOAD
                            </button>
                          )}
                          {!isOnchain && confirmDelete !== savedItem.recipe.dishName && (
                            <>
                              <button
                                onClick={() => onLoad(savedItem)}
                                className='arcade-button-small'
                              >
                                LOAD
                              </button>
                              <button
                                onClick={() => {
                                  playSound();
                                  setConfirmDelete(savedItem.recipe.dishName);
                                }}
                                className='arcade-button-small bg-red-600 border-red-600 hover:bg-red-400 hover:border-red-400'
                              >
                                DEL
                              </button>
                            </>
                          )}
                          {!isOnchain && confirmDelete === savedItem.recipe.dishName && (
                            <>
                              <span className='pixel-font-small text-yellow-400'>
                                ARE YOU SURE?
                              </span>
                              <button
                                onClick={() => handleDeleteClick(savedItem.recipe.dishName)}
                                className='arcade-button-small bg-red-600 border-red-600 hover:bg-red-400 hover:border-red-400'
                              >
                                YES
                              </button>
                              <button
                                onClick={() => {
                                  playSound();
                                  setConfirmDelete(null);
                                }}
                                className='arcade-button-small'
                              >
                                NO
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className='pixel-font-small text-center py-8'>NO RECIPES SAVED YET.</p>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default SavedRecipesModal;
