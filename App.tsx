import React, { useState } from 'react';
import NavBar from './components/NavBar';
import InputModule from './components/InputModule';
import FocusModule from './components/FocusModule';
import ProjectsModule from './components/ProjectsModule';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('input');
  const [previousView, setPreviousView] = useState<ViewState | null>(null);

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

  const handleViewChange = (view: ViewState) => {
    setPreviousView(currentView);
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'input':
        return <InputModule onProcessComplete={handleInputComplete} />;
      case 'focus':
        return <FocusModule />;
      case 'projects':
        return (
          <ProjectsModule 
            onStartWork={handleStartWork} 
            showBackButton={previousView === 'input'}
            onBack={handleBackToInput}
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