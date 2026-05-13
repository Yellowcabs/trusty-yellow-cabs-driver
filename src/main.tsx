import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Disable service worker in Capacitor APK
const isCapacitor =
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:';

if ('serviceWorker' in navigator && !isCapacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// Global error logging
if (typeof window !== 'undefined') {
  window.onerror = function (
    message,
    source,
    lineno,
    colno,
    error
  ) {
    console.error('[Global Error]', {
      message,
      source,
      lineno,
      colno,
      error,
    });

    return false;
  };

  window.onunhandledrejection = function (event) {
    console.error('[Global Promise Rejection]', event.reason);
  };
}

const root = document.getElementById('root');

if (root) {
  const reactRoot = createRoot(root);

  reactRoot.render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );

  // Remove loading screen safely
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById(
        'app-loading-screen'
      );

      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        loader.style.transition =
          'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

        setTimeout(() => {
          loader.remove();
        }, 600);
      }
    }, 800);
  });
}