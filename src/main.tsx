import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryProvider } from './shared/api/queryClient';
import { router } from './shared/router/router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </React.StrictMode>
);
