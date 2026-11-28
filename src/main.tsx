import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { removeLegacyCredentials } from './infrastructure/profileStorage';
import './index.css';

// The offline demo does not import the authenticated client or initiate API requests.
const accountMode = window.location.pathname === '/account';
const Entry = accountMode
  ? lazy(() => import('./modules/account/LocalAccountApp'))
  : lazy(() => import('./App'));
if (!accountMode) removeLegacyCredentials();
createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<p role="status">Carregando…</p>}><Entry /></Suspense></StrictMode>,
);
