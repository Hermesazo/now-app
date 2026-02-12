import React, { useState } from 'react';
import NavBar from './components/NavBar';
import InputModule from './components/InputModule';
import FocusModule from './components/FocusModule';
import ProjectsModule from './components/ProjectsModule';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';
import { ViewState, ProjectAction } from './types';

const App: React.FC = () => {
  const { user, loading, signIn, signUp, signOut, isAuthenticated } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>('input');
  const [previousView, setPreviousView] = useState<ViewState | null>(null);

  // State to pass instructions to ProjectsModule
  const [pendingProjectAction, setPendingProjectAction] = useState<ProjectAction | null>(null);

  const handleSignIn = async (credentials: { email: string; password: string }) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signIn(credentials);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (credentials: { email: string; password: string }) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signUp(credentials);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error al crear cuenta.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInputComplete = () => {
    setPreviousView('input');
    setCurrentView('projects');
  };

  const handleStartWork = () => {
    setPreviousView('projects');
    setCurrentView('focus');
  };

  const handleBackToInput = () => {
    setCurrentView('input');
    setPreviousView(null);
  };

  const handleNavigateToProjects = (action?: ProjectAction) => {
    if (action) {
      setPendingProjectAction(action);
    }
    setPreviousView('focus');
    setCurrentView('projects');
  };

  const handleViewChange = (view: ViewState) => {
    setPreviousView(currentView);
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'input':
        return <InputModule onProcessComplete={handleInputComplete} />;
      case 'focus':
        return <FocusModule onNavigateToProjects={handleNavigateToProjects} />;
      case 'projects':
        return (
          <ProjectsModule 
            onStartWork={handleStartWork} 
            showBackButton={previousView === 'input'}
            onBack={handleBackToInput}
            initialAction={pendingProjectAction}
            onActionHandled={() => setPendingProjectAction(null)}
          />
        );
      default:
        return <InputModule onProcessComplete={handleInputComplete} />;
    }
  };

  // Auth gate: show login when not authenticated (inline styles as fallback if Tailwind fails)
  if (loading) {
    return (
      <div className="relative w-full h-screen bg-background flex items-center justify-center font-sans" style={{ backgroundColor: '#050a0a', minHeight: '100vh' }}>
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10" style={{ color: '#ffffff' }}>
          <span className="material-symbols-outlined text-primary text-4xl animate-pulse" style={{ color: '#13ecc8' }}>progress_activity</span>
          <p className="text-white/60 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="relative w-full min-h-screen bg-background flex flex-col font-sans" style={{ backgroundColor: '#050a0a', minHeight: '100vh' }}>
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>
        <LoginScreen
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          error={authError}
          loading={authLoading}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden flex flex-col font-sans">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Streak Badge + Sign out (Top Right) */}
      <div className="absolute top-10 right-6 z-50 flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surfaceHighlight/80 backdrop-blur-md border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-700">
          <span className="material-symbols-outlined text-secondary text-[18px]">local_fire_department</span>
          <span className="text-xs font-bold text-white font-mono">12</span>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          Salir
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full max-w-md mx-auto h-full">
        {renderView()}
      </main>

      {/* Navigation */}
      <NavBar currentView={currentView} onChangeView={handleViewChange} />
    </div>
  );
};

export default App;