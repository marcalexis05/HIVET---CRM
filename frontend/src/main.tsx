import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APIProvider } from '@vis.gl/react-google-maps'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/pwaManager'

// Route localhost API calls to Render backend in production
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string') {
      if (input.startsWith('http://localhost:8000')) {
        input = input.replace('http://localhost:8000', 'https://hivet-crm.onrender.com');
      }
    } else if (input instanceof URL) {
      if (input.origin === 'http://localhost:8000') {
        input = new URL(input.pathname + input.search + input.hash, 'https://hivet-crm.onrender.com');
      }
    } else if (input instanceof Request) {
      if (input.url.startsWith('http://localhost:8000')) {
        const newUrl = input.url.replace('http://localhost:8000', 'https://hivet-crm.onrender.com');
        input = new Request(newUrl, input);
      }
    }
    return originalFetch.call(this, input, init);
  };
}

// Initialize PWA Service Worker for Offline Caching and Homescreen Installation
registerServiceWorker()

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <APIProvider apiKey={API_KEY} libraries={['places', 'geocoding', 'marker']}>
      <App />
    </APIProvider>
  </StrictMode>,
)
