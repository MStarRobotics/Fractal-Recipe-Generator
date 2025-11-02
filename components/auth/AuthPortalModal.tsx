import { useEffect, useMemo, useState } from 'react';
import type { UserCredential } from 'firebase/auth';
import { PhoneAuthPanel } from './PhoneAuthExample';
import { EmailLinkAuthPanel } from './EmailLinkAuthExample';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  walletDisplayName: string | null;
  onConnectWallet: () => void | Promise<void>;
  isWalletBusy: boolean;
  authStatus: string | null;
  isMetamaskDetected: boolean;
  membershipStatus?: string | null;
  googleButtonLabel: string;
  onGoogleToggle: () => void | Promise<void>;
  googleAuthStatus: string | null;
  googleUserLabel: string | null;
  linkedGoogleId: string | null;
  onLinkGoogleAccount: () => void | Promise<void>;
  onPhoneAuthSuccess?: (credential: UserCredential) => void;
  onEmailAuthSuccess?: (credential: UserCredential) => void;
}

type AuthTab = 'metamask' | 'phone' | 'email';

interface MetaMaskAuthPanelProps {
  walletAddress: string | null;
  walletDisplayName: string | null;
  onConnectWallet: () => void | Promise<void>;
  isWalletBusy: boolean;
  authStatus: string | null;
  membershipStatus?: string | null;
  isMetamaskDetected: boolean;
  googleButtonLabel: string;
  onGoogleToggle: () => void | Promise<void>;
  googleAuthStatus: string | null;
  googleUserLabel: string | null;
  linkedGoogleId: string | null;
  onLinkGoogleAccount: () => void | Promise<void>;
}

const MetaMaskAuthPanel = ({
  walletAddress,
  walletDisplayName,
  onConnectWallet,
  isWalletBusy,
  authStatus,
  membershipStatus,
  isMetamaskDetected,
  googleButtonLabel,
  onGoogleToggle,
  googleAuthStatus,
  googleUserLabel,
  linkedGoogleId,
  onLinkGoogleAccount,
}: MetaMaskAuthPanelProps) => {
  let walletButtonLabel: string;
  if (walletDisplayName) {
    walletButtonLabel = `CONNECTED: ${walletDisplayName}`;
  } else if (isWalletBusy) {
    walletButtonLabel = 'CONNECTING...';
  } else {
    walletButtonLabel = 'CONNECT METAMASK';
  }

  return (
    <div className='space-y-6'>
      <section className='bg-black/60 border border-green-600 p-4 rounded'>
        <h3 className='text-lg text-yellow-300 mb-3'>MetaMask (SIWE)</h3>
        <p className='pixel-font-small text-xs text-green-300 mb-4'>
          Authenticate with your wallet to anchor recipes on-chain.
        </p>
        <button
          type='button'
          onClick={async () => {
            await onConnectWallet();
          }}
          disabled={isWalletBusy}
          className='arcade-button-small'
        >
          {walletButtonLabel}
        </button>
        {!isMetamaskDetected && (
          <p className='pixel-font-small text-xs text-yellow-300 mt-3'>
            MetaMask extension not detected. Install MetaMask and refresh the page.
          </p>
        )}
        {authStatus && <p className='pixel-font-small text-xs text-green-300 mt-3'>{authStatus}</p>}
        {membershipStatus && (
          <p className='pixel-font-small text-xs text-blue-300 mt-3'>{membershipStatus}</p>
        )}
      </section>

      <section className='bg-black/60 border border-blue-600 p-4 rounded'>
        <h3 className='text-lg text-yellow-300 mb-3'>Google Account</h3>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className='arcade-button-small'
            onClick={async () => {
              await onGoogleToggle();
            }}
          >
            {googleButtonLabel}
          </button>
          <button
            type='button'
            className='arcade-button-small'
            onClick={async () => {
              await onLinkGoogleAccount();
            }}
            disabled={!walletAddress || isWalletBusy}
          >
            LINK GOOGLE ACCOUNT
          </button>
        </div>
        {!walletAddress && (
          <p className='pixel-font-small text-xs text-yellow-300 mt-3'>
            Connect your wallet before linking a Google account.
          </p>
        )}
        {googleAuthStatus && (
          <p className='pixel-font-small text-xs text-blue-300 mt-3'>{googleAuthStatus}</p>
        )}
        {googleUserLabel && (
          <p className='pixel-font-small text-xs text-green-300 mt-3'>
            GOOGLE USER: {googleUserLabel}
          </p>
        )}
        {linkedGoogleId && (
          <p className='pixel-font-small text-xs text-green-300 mt-3'>
            LINKED GOOGLE ID: {linkedGoogleId}
          </p>
        )}
      </section>
    </div>
  );
};

export const AuthPortalModal = ({
  isOpen,
  onClose,
  walletAddress,
  walletDisplayName,
  onConnectWallet,
  isWalletBusy,
  authStatus,
  isMetamaskDetected,
  membershipStatus,
  googleButtonLabel,
  onGoogleToggle,
  googleAuthStatus,
  googleUserLabel,
  linkedGoogleId,
  onLinkGoogleAccount,
  onPhoneAuthSuccess,
  onEmailAuthSuccess,
}: AuthPortalModalProps): JSX.Element | null => {
  const [activeTab, setActiveTab] = useState<AuthTab>('metamask');
  const phoneRecaptchaId = useMemo(
    () => `auth-portal-phone-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab('metamask');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    onClose();
    setActiveTab('metamask');
  };

  const handlePhoneSuccess = (credential: UserCredential) => {
    onPhoneAuthSuccess?.(credential);
    setActiveTab('metamask');
  };

  const handleEmailSuccess = (credential: UserCredential) => {
    onEmailAuthSuccess?.(credential);
    setActiveTab('metamask');
  };

  const tabButtons: Array<{ id: AuthTab; label: string }> = [
    { id: 'metamask', label: 'MetaMask' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email Link' },
  ];

  return (
    <div className='modal-backdrop'>
      <div className='modal-content max-w-4xl w-full text-left'>
        <button
          type='button'
          className='arcade-close-button'
          aria-label='Close authentication portal'
          onClick={handleClose}
        >
          X
        </button>
        <h2 className='text-yellow-400 text-2xl text-center mb-6'>AUTHENTICATION PORTAL</h2>

        <div className='flex justify-center gap-3 flex-wrap mb-6'>
          {tabButtons.map(tab => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={`arcade-button-small ${activeTab === tab.id ? 'animate-selected' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='bg-black/75 border border-green-700 p-6 rounded min-h-[320px]'>
          {activeTab === 'metamask' && (
            <MetaMaskAuthPanel
              walletAddress={walletAddress}
              walletDisplayName={walletDisplayName}
              onConnectWallet={onConnectWallet}
              isWalletBusy={isWalletBusy}
              authStatus={authStatus}
              membershipStatus={membershipStatus}
              isMetamaskDetected={isMetamaskDetected}
              googleButtonLabel={googleButtonLabel}
              onGoogleToggle={onGoogleToggle}
              googleAuthStatus={googleAuthStatus}
              googleUserLabel={googleUserLabel}
              linkedGoogleId={linkedGoogleId}
              onLinkGoogleAccount={onLinkGoogleAccount}
            />
          )}

          {activeTab === 'phone' && (
            <PhoneAuthPanel
              containerId={phoneRecaptchaId}
              heading='Phone Authentication'
              onSuccess={handlePhoneSuccess}
            />
          )}

          {activeTab === 'email' && (
            <EmailLinkAuthPanel heading='Passwordless Email Link' onSuccess={handleEmailSuccess} />
          )}
        </div>
      </div>
    </div>
  );
};
