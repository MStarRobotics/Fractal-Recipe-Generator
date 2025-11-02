# Firebase Phone & Email Link Authentication - Integration Guide

## Overview

This project now supports **Phone (SMS OTP)** and **Email Link (passwordless)** authentication via Firebase Authentication Web Modular API (v9+).

---

## 🔧 Setup Instructions

### 1. Enable Authentication Methods in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project
2. Navigate to **Authentication → Sign-in method**
3. Enable the following providers:

#### Phone Authentication

- Click **Phone** → Enable
- Firebase will auto-configure reCAPTCHA (no manual setup needed)
- **Optional:** Add test phone numbers for development
  - Example: `+1 650-555-3434` with verification code `654321`
  - These bypass SMS and don't count toward quotas

#### Email Link (Passwordless)

- Click **Email/Password** → Enable
- Check **Email link (passwordless sign-in)** → Enable

### 2. Configure Authorized Domains

1. Go to **Authentication → Settings → Authorized domains**
2. Add your production domain (e.g., `yourdomain.com`)
3. **Note:** `localhost` is NOT enabled by default after April 2025. Add manually if testing locally.

### 3. Environment Variables

Your `.env` file should already have Firebase client config. Verify these keys exist:

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEFG
```

---

## � Auth Portal Component

The `components/auth/AuthPortalModal.tsx` component surfaces MetaMask, phone, and email link sign-in flows inside a single popup. It wires together `PhoneAuthPanel` and `EmailLinkAuthPanel`, manages Firebase reCAPTCHA lifecycle automatically, and can be triggered from anywhere in the UI to provide a consistent authentication experience.

---

## �📱 Phone Authentication

### Phone Authentication Flow

```typescript
import { ensurePhoneRecaptcha, signInWithPhone, confirmPhoneCode } from './services/firebaseClient';

// 1. Create reCAPTCHA verifier (renders widget in container)
const verifier = ensurePhoneRecaptcha('recaptcha-container', 'normal');

// 2. Request SMS code
const confirmation = await signInWithPhone('+1234567890', verifier);

// 3. User enters code from SMS
const userCode = getUserInput(); // e.g., "123456"

// 4. Verify and sign in
const result = await confirmPhoneCode(confirmation, userCode);
console.log('Signed in:', result.user.phoneNumber);
```

### Phone Example Component

```tsx
import { PhoneAuthExample } from './components/auth/PhoneAuthExample';

function App() {
  return <PhoneAuthExample />;
}
```

Under the hood, this wraps the reusable `PhoneAuthPanel`. When embedding the form inside your own modal, pass a unique `containerId` and optional callbacks:

```tsx
import { PhoneAuthPanel } from './components/auth/PhoneAuthExample';

export function PhoneAuthModal() {
  return <PhoneAuthPanel containerId='phone-auth-modal' heading='Verify your phone' />;
}
```

### Testing with Fictional Phone Numbers

In Firebase Console → Phone numbers for testing:

- Phone: `+1 650-555-3434`
- Code: `654321`

These numbers:

- Don't send real SMS
- Don't consume quotas
- Work in development/CI environments

### reCAPTCHA Modes

#### Normal (Visible Widget - Recommended)

```typescript
const verifier = ensurePhoneRecaptcha('recaptcha-container', 'normal');
```

- User sees and solves CAPTCHA
- Better UX and security balance

#### Invisible

```typescript
const verifier = ensurePhoneRecaptcha('recaptcha-container', 'invisible');
```

- Auto-resolves for legitimate users
- May still show CAPTCHA for suspicious activity

### Error Handling

```typescript
try {
  const confirmation = await signInWithPhone(phoneNumber, verifier);
  // ...
} catch (error) {
  if (error.code === 'auth/invalid-phone-number') {
    // Show: "Invalid phone number format"
  } else if (error.code === 'auth/quota-exceeded') {
    // Show: "Too many requests. Try again later."
  } else if (error.code === 'auth/captcha-check-failed') {
    // Show: "reCAPTCHA verification failed"
    // Reset and try again:
    window.location.reload(); // or recreate verifier
  }
}
```

---

## 📧 Email Link (Passwordless) Authentication

### Email Link Flow

#### Sending the Link

```typescript
import { sendEmailSignInLink } from './services/firebaseClient';

const actionCodeSettings = {
  url: window.location.origin + '/auth/complete', // Must be in authorized domains
  handleCodeInApp: true,
  // Optional: deep linking for mobile apps
  // iOS: { bundleId: 'com.example.app' },
  // android: { packageName: 'com.example.app', installApp: true },
};

await sendEmailSignInLink('user@example.com', actionCodeSettings);
// Email is automatically saved to localStorage
```

#### Completing Sign-In (On Link Click)

```typescript
import { isEmailSignInLink, completeEmailSignIn } from './services/firebaseClient';

// Check if current URL is a sign-in link
if (isEmailSignInLink()) {
  try {
    // Email is retrieved from localStorage (same device)
    // Or prompt user if opened on different device
    const result = await completeEmailSignIn();
    console.log('Signed in:', result.user.email);
  } catch (error) {
    if (error.message.includes('Email address is required')) {
      // Prompt user to enter email (cross-device scenario)
      const email = prompt('Enter your email:');
      await completeEmailSignIn(email);
    }
  }
}
```

### Email Example Component

```tsx
import { EmailLinkAuthExample } from './components/auth/EmailLinkAuthExample';

function App() {
  return <EmailLinkAuthExample />;
}
```

For custom layouts, use the underlying `EmailLinkAuthPanel` component and supply a redirect URL if needed:

```tsx
import { EmailLinkAuthPanel } from './components/auth/EmailLinkAuthExample';

export function EmailPortal() {
  return (
    <EmailLinkAuthPanel
      heading='Passwordless Sign-In'
      redirectUrl='https://example.com/auth/complete'
    />
  );
}
```

### Routing Setup

Your app should handle the `/auth/complete` route (or whichever URL you specify in `actionCodeSettings.url`):

```tsx
// Example with React Router
<Route path='/auth/complete' element={<EmailLinkAuthExample />} />
```

The component will:

1. Detect the sign-in link automatically
2. Complete authentication
3. Redirect to your dashboard/home page

### Cross-Device Support

Email links work across devices! If a user:

- Requests link on desktop
- Opens link on mobile

The flow:

1. Link opens on mobile
2. App detects missing email (not in localStorage)
3. Prompts user to enter email
4. Completes sign-in on mobile device

### Security Notes

- Email links expire after a period (Firebase default)
- User's email is verified automatically upon successful sign-in
- Links can only be used once
- Use HTTPS in production to prevent interception

---

## 🎨 UI Integration Examples

### Minimal Phone Auth Form

```tsx
import { useState } from 'react';
import { ensurePhoneRecaptcha, signInWithPhone, confirmPhoneCode } from './services/firebaseClient';

export function MinimalPhoneAuth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  return (
    <div>
      {!confirmation ? (
        <>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder='+1 234 567 8900'
          />
          <div id='recaptcha-container'></div>
          <button
            onClick={async () => {
              const verifier = ensurePhoneRecaptcha('recaptcha-container');
              const result = await signInWithPhone(phone, verifier);
              setConfirmation(result);
            }}
          >
            Send Code
          </button>
        </>
      ) : (
        <>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder='123456'
            maxLength={6}
          />
          <button
            onClick={async () => {
              await confirmPhoneCode(confirmation, code);
              alert('Signed in!');
            }}
          >
            Verify
          </button>
        </>
      )}
    </div>
  );
}
```

### Minimal Email Link Form

```tsx
import { useState } from 'react';
import { sendEmailSignInLink } from './services/firebaseClient';

export function MinimalEmailLinkAuth() {
  const [email, setEmail] = useState('');

  const handleSend = async () => {
    await sendEmailSignInLink(email, {
      url: window.location.origin + '/finish-signin',
      handleCodeInApp: true,
    });
    alert('Check your email!');
  };

  return (
    <div>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder='you@example.com' />
      <button onClick={handleSend}>Send Magic Link</button>
    </div>
  );
}
```

---

## 🚀 Production Checklist

### Phone Auth

- [ ] Enable Phone provider in Firebase Console
- [ ] Configure authorized domains (production + staging)
- [ ] Remove test phone numbers before production deploy
- [ ] Set up SMS quota monitoring (Firebase Console → Usage)
- [ ] Consider SMS region policies if needed (Settings → SMS)
- [ ] Test with real phone numbers in staging environment
- [ ] Handle quota-exceeded errors gracefully

### Email Link Auth

- [ ] Enable Email/Password + Email Link in Firebase Console
- [ ] Add production domain to authorized domains
- [ ] Configure custom email templates (optional, in Firebase Console → Templates)
- [ ] Set up proper URL routing for `/auth/complete` (or your chosen path)
- [ ] Use HTTPS for all production domains
- [ ] Test cross-device flow
- [ ] Handle expired link errors

### General

- [ ] Monitor Firebase Authentication usage/quotas
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Implement proper loading states
- [ ] Add analytics events for auth flows
- [ ] Document auth flow for team/users

---

## 📚 Reference Documentation

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Email Link Auth Docs](https://firebase.google.com/docs/auth/web/email-link-auth)
- [Firebase Console](https://console.firebase.google.com/)
- [reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/display)

---

## 🐛 Troubleshooting

### Phone Auth Issues

#### reCAPTCHA Not Rendering

- Verify `<div id="recaptcha-container"></div>` exists in DOM
- Check browser console for errors
- Ensure Firebase config is loaded

#### SMS Not Sent

- Check Firebase Console → Authentication → Usage (quota)
- Verify phone number format (+country code)
- Check Firebase Console → Authentication → Settings → SMS for blocked regions

#### auth/quota-exceeded

- Too many SMS sent to same number
- Upgrade billing plan or wait 24 hours
- Use test phone numbers for development

### Email Link Issues

#### Link Not Working

- Check if domain is in authorized domains list
- Verify `handleCodeInApp: true` in ActionCodeSettings
- Ensure URL has proper protocol (https://)

#### Email Address Required

- Link opened on different device (localStorage not available)
- Prompt user to re-enter email
- Pass email to `completeEmailSignIn(email)`

#### Link Expired

- Links expire after period set by Firebase (default: 24 hours)
- User must request new link

---

## 💡 Tips & Best Practices

1. **Combine with other auth methods**: Phone/Email Link work great alongside password, Google, GitHub sign-in
2. **Use loading states**: Auth operations can take 2-5 seconds
3. **Provide clear instructions**: Tell users to check email/SMS
4. **Handle edge cases**: Expired links, wrong codes, network errors
5. **Test on real devices**: SMS delivery varies by carrier/region
6. **Monitor costs**: SMS messages cost money; use test numbers in dev
7. **Accessibility**: Ensure form inputs have proper labels and ARIA attributes

---

Generated: 2025-11-02
