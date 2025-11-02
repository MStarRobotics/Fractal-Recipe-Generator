import React, { useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import {
  ensurePhoneRecaptcha,
  signInWithPhone,
  confirmPhoneCode,
} from '../../services/firebaseClient';

interface PhoneAuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (phoneNumber: string) => void;
}

export function PhoneAuthModal({ isOpen, onClose, onSuccess }: Readonly<PhoneAuthModalProps>) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const handleSendCode = async () => {
    setError('');
    setIsLoading(true);

    try {
      const verifier = ensurePhoneRecaptcha('recaptcha-container', 'invisible');
      const confirmationResult = await signInWithPhone(phoneNumber, verifier);
      setConfirmation(confirmationResult);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmation) return;

    setError('');
    setIsLoading(true);

    try {
      await confirmPhoneCode(confirmation, verificationCode);
      onSuccess(phoneNumber);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setVerificationCode('');
    setStep('phone');
    setError('');
    setConfirmation(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='phone-auth-title'
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm'
      onClick={handleClose}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div
        role='document'
        className='relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all'
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          e.stopPropagation();
        }}
      >
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <h2 id='phone-auth-title' className='text-2xl font-bold text-gray-900'>
            Phone Authentication
          </h2>
          <button
            onClick={handleClose}
            aria-label='Close dialog'
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <div className='p-6'>
          <div className='space-y-4'>
            <div id='recaptcha-container'></div>

            {step === 'phone' ? (
              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='phone-input'
                    className='block text-sm font-medium text-gray-700 mb-2'
                  >
                    Phone Number
                  </label>
                  <input
                    id='phone-input'
                    type='tel'
                    value={phoneNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPhoneNumber(e.target.value)
                    }
                    placeholder='+1234567890'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={handleSendCode}
                  disabled={!phoneNumber || isLoading}
                  className='w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50'
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            ) : (
              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='code-input'
                    className='block text-sm font-medium text-gray-700 mb-2'
                  >
                    Verification Code
                  </label>
                  <input
                    id='code-input'
                    type='text'
                    value={verificationCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVerificationCode(e.target.value)
                    }
                    placeholder='123456'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={handleVerifyCode}
                  disabled={!verificationCode || isLoading}
                  className='w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50'
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            )}

            {error && <div className='p-3 bg-red-50 text-red-700 rounded-lg text-sm'>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
