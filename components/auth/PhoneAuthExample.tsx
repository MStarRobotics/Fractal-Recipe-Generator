import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { ConfirmationResult, UserCredential } from 'firebase/auth';
import {
  ensurePhoneRecaptcha,
  signInWithPhone,
  confirmPhoneCode,
  clearPhoneRecaptcha,
} from '../../services/firebaseClient';

interface PhoneAuthPanelProps {
  readonly containerId: string;
  readonly onSuccess?: (credential: UserCredential) => void;
  readonly heading?: string;
  readonly className?: string;
}

/**
 * Phone authentication form that can be embedded inside any layout.
 * Provide a unique `containerId` so Firebase can mount the reCAPTCHA widget.
 */
export function PhoneAuthPanel({
  containerId,
  onSuccess,
  heading = 'Phone Authentication',
  className,
}: PhoneAuthPanelProps): JSX.Element {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const phoneLabelId = useMemo(() => `${containerId}-phone-input`, [containerId]);
  const codeInputId = useMemo(() => `${containerId}-code-input`, [containerId]);
  const cardClasses = className
    ? `max-w-md mx-auto p-6 bg-white rounded-lg shadow ${className}`
    : 'max-w-md mx-auto p-6 bg-white rounded-lg shadow';

  useEffect(
    () => () => {
      clearPhoneRecaptcha(containerId);
    },
    [containerId]
  );

  const handlePhoneNumberChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(event.target.value);
  }, []);

  const handleVerificationCodeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(event.target.value);
  }, []);

  const resetState = useCallback(() => {
    setConfirmation(null);
    setVerificationCode('');
    setStatus(null);
    setError(null);
    clearPhoneRecaptcha(containerId);
  }, [containerId]);

  const handleSendCode = useCallback(async () => {
    setError(null);
    setStatus('Initializing reCAPTCHA...');
    setIsSendingCode(true);

    try {
      const verifier = ensurePhoneRecaptcha(containerId, 'normal');
      await verifier.render();

      setStatus('Requesting SMS code...');

      const confirmationResult = await signInWithPhone(phoneNumber, verifier);
      setConfirmation(confirmationResult);
      setStatus('SMS code sent! Check your phone.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send SMS';
      setError(message);
      setStatus(null);
    } finally {
      setIsSendingCode(false);
    }
  }, [containerId, phoneNumber]);

  const handleVerifyCode = useCallback(async () => {
    if (!confirmation) {
      setError('No confirmation result. Please request a code first.');
      return;
    }

    setError(null);
    setStatus('Verifying code...');
    setIsVerifyingCode(true);

    try {
      const result = await confirmPhoneCode(confirmation, verificationCode);
      const descriptor = result.user.phoneNumber ?? result.user.uid;
      setStatus(`Signed in as ${descriptor}`);
      onSuccess?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
      setStatus(null);
    } finally {
      setIsVerifyingCode(false);
    }
  }, [confirmation, onSuccess, verificationCode]);

  const isCodeReady = verificationCode.trim().length === 6;
  const isPhoneReady = phoneNumber.trim().length > 0;

  return (
    <div className={cardClasses}>
      <h2 className='text-2xl font-bold mb-4'>{heading}</h2>

      {confirmation ? (
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium mb-1' htmlFor={codeInputId}>
              Verification Code (from SMS)
            </label>
            <input
              id={codeInputId}
              type='text'
              value={verificationCode}
              onChange={handleVerificationCodeChange}
              placeholder='123456'
              maxLength={6}
              className='w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <button
            type='button'
            onClick={handleVerifyCode}
            disabled={!isCodeReady || isVerifyingCode}
            className='w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50'
          >
            {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
          </button>

          <button
            type='button'
            onClick={resetState}
            className='w-full text-sm text-gray-600 hover:text-gray-800'
          >
            Use a different phone number
          </button>
        </div>
      ) : (
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium mb-1' htmlFor={phoneLabelId}>
              Phone Number (international format)
            </label>
            <input
              id={phoneLabelId}
              type='tel'
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder='+1 234 567 8900'
              className='w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Example: +1 650-555-3434 (use test numbers for development)
            </p>
          </div>

          <div id={containerId} className='flex justify-center'></div>

          <button
            type='button'
            onClick={handleSendCode}
            disabled={!isPhoneReady || isSendingCode}
            className='w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50'
          >
            {isSendingCode ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      )}

      {status && <div className='mt-4 p-3 bg-blue-50 text-blue-700 rounded'>{status}</div>}

      {error && <div className='mt-4 p-3 bg-red-50 text-red-700 rounded'>{error}</div>}
    </div>
  );
}

/**
 * Backwards-compatible example export used in documentation snippets.
 */
export function PhoneAuthExample(): JSX.Element {
  const containerId = useMemo(
    () => `phone-auth-example-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return <PhoneAuthPanel containerId={containerId} />;
}
