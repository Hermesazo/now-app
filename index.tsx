import React from 'react';
import ReactDOM from 'react-dom/client';

function showBootstrapError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : '';
  document.body.style.backgroundColor = '#050a0a';
  document.body.style.color = '#ffffff';
  document.body.style.padding = '24px';
  document.body.style.fontFamily = 'sans-serif';
  document.body.innerHTML = `
    <h1 style="color:#f87171">Error al cargar la app</h1>
    <pre style="color:rgba(255,255,255,0.9);background:rgba(0,0,0,0.3);padding:16px;border-radius:8px;overflow:auto">${msg}</pre>
    <pre style="color:rgba(255,255,255,0.6);font-size:11px;white-space:pre-wrap">${stack}</pre>
  `;
}

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    showBootstrapError(new Error("Could not find root element to mount to"));
    return;
  }
  try {
    const [{ default: App }, { default: ErrorBoundary }] = await Promise.all([
      import('./App'),
      import('./components/ErrorBoundary'),
    ]);
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (e) {
    showBootstrapError(e);
  }
}

bootstrap();
