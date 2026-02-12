import React, { useState, useCallback } from 'react';
import type { AuthCredentials } from '../hooks/useAuth';

/**
 * LoginScreen renders a simple login/signup form matching the app dark theme.
 * Uses glass-card style, primary accent, and NOW branding.
 *
 * @param onSignIn - Called with email and password for login.
 * @param onSignUp - Called with email and password for registration.
 * @param error - Optional error message to display.
 * @param loading - Whether auth action is in progress.
 */
interface LoginScreenProps {
  onSignIn: (credentials: AuthCredentials) => Promise<void>;
  onSignUp: (credentials: AuthCredentials) => Promise<void>;
  error: string | null;
  loading: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  onSignUp,
  error,
  loading,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      if (!trimmedEmail || !trimmedPassword) {
        setLocalError('Email y contraseña son obligatorios.');
        return;
      }
      try {
        if (isSignUp) {
          await onSignUp({ email: trimmedEmail, password: trimmedPassword });
        } else {
          await onSignIn({ email: trimmedEmail, password: trimmedPassword });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al iniciar sesión.';
        setLocalError(message);
      }
    },
    [email, password, isSignUp, onSignIn, onSignUp]
  );

  const displayError = localError ?? error;

  const inputStyle: React.CSSProperties = {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full px-6 font-sans" style={{ color: '#ffffff', minHeight: '100vh' }}>
      {/* NOW Title - same as main app */}
      <div className="absolute top-10 left-0 w-full flex justify-center z-20">
        <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold animate-in fade-in slide-in-from-top-4 duration-700" style={{ color: '#13ecc8' }}>
          NOW
        </h1>
      </div>

      <div className="w-full max-w-sm space-y-6 animate-in fade-in duration-500" style={{ color: '#ffffff' }}>
        <h2 className="text-2xl font-bold text-white text-center" style={{ color: '#ffffff' }}>
          {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              style={inputStyle}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {displayError && (
            <p className="text-sm text-red-400 text-center" role="alert" style={{ color: '#f87171' }}>
              {displayError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-primary text-background font-bold text-sm shadow-[0_0_20px_rgba(19,236,200,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#13ecc8', color: '#050a0a' }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Espera...
              </>
            ) : isSignUp ? (
              'Crear cuenta'
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp((v) => !v);
            setLocalError(null);
          }}
          disabled={loading}
          className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {isSignUp ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear cuenta'}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
