import React, { useState } from 'react';
import NavBar from './components/NavBar';
import InputModule from './components/InputModule';
import FocusModule from './components/FocusModule';
import ProjectsModule from './components/ProjectsModule';
import { ViewState, ProjectAction } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('input');
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  
  // State to pass instructions to ProjectsModule
  const [pendingProjectAction, setPendingProjectAction] = useState<ProjectAction | null>(null);

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

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden flex flex-col font-sans">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Streak Badge (Absolute Position, Top Right) */}
      <div className="absolute top-10 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surfaceHighlight/80 backdrop-blur-md border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-700">
        <span className="material-symbols-outlined text-secondary text-[18px]">local_fire_department</span>
        <span className="text-xs font-bold text-white font-mono">12</span>
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