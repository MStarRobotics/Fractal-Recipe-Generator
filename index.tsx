// Bootstraps the React tree and wraps the app with shared providers.
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { AppProviders } from './AppProviders';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
