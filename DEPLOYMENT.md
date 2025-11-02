# Deployment Guide

This guide provides instructions for deploying the application with enhanced security.

## Hosting

This application is a static site and can be hosted on any static hosting provider, such as GitHub Pages, Netlify, or Vercel.

## Security Headers

For a production environment, it is crucial to set the following HTTP security headers. If your hosting provider does not allow you to set custom headers, you can use a reverse proxy like Cloudflare.

- **Content-Security-Policy (CSP):** The `index.html` file includes a CSP via a `<meta>` tag. However, it is more flexible and secure to set it as an HTTP header. The recommended policy is:
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com;`

- **X-Content-Type-Options:** `nosniff`
  This header prevents the browser from MIME-sniffing the content type of a response.

- **X-Frame-Options:** `DENY`
  This header prevents the page from being loaded in an `<iframe>`, which helps to prevent clickjacking attacks.

- **Strict-Transport-Security (HSTS):** `max-age=31536000; includeSubDomains`
  This header enforces the use of HTTPS, preventing man-in-the-middle attacks.

- **Permissions-Policy:**
  It is recommended to set a `Permissions-Policy` header to restrict the use of sensitive browser features. A restrictive policy would be:
  `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

## Environment Variables

The application uses environment variables for configuration, especially for Firebase. Create a `.env` file in the root of the project with the following variables:

```
# Firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**IMPORTANT:** Never commit your `.env` file to version control. The `.gitignore` file is already configured to ignore it.
