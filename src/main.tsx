import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { QueryProvider } from './shared/api/queryClient';
import { router } from './shared/router/router';
import './index.css';

const ErrorFallback = ({ error }: FallbackProps) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE] p-6 text-center" dir="rtl">
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-[#D9A2B0]/30">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[#173B3F] mb-4">متاسفیم، مشکلی پیش آمده است</h2>
      <p className="text-gray-600 mb-6">یک خطای غیرمنتظره رخ داد. لطفاً صفحه را رفرش کنید یا بعداً تلاش نمایید.</p>
      <button 
        onClick={() => window.location.reload()}
        className="w-full bg-[#173B3F] text-white py-3 rounded-xl font-bold hover:bg-[#1a464a] transition-colors"
      >
        تلاش مجدد
      </button>
      {process.env.NODE_ENV !== 'production' && (
        <pre className="mt-6 p-4 bg-gray-100 rounded text-left text-xs overflow-auto max-h-40">
          {(error as any).message}
        </pre>
      )}
    </div>
  </div>
);

// Suppress benign Vite HMR WebSocket connection warnings in AI Studio preview iframe
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('createWebSocketModuleRunnerTransport')) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    const filename = String(event.filename || '');
    if (msg.includes('WebSocket') || filename.includes('@vite/client') || msg.includes('createWebSocketModuleRunnerTransport')) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);

// PWA: register the service worker so both the customer and salon panels are
// installable ("Install app" on Android, "Add to Home Screen" on iOS) and the
// app shell still loads offline. Dev mode is excluded — Vite HMR and the SW
// cache would otherwise fight each other on every reload.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] service worker registration failed:', err);
    });
  });
}
