import React, { useState, useEffect, useRef } from 'react';

interface InputModuleProps {
  onProcessComplete?: () => void;
}

const InputModule: React.FC<InputModuleProps> = ({ onProcessComplete }) => {
  const [processingState, setProcessingState] = useState<'idle' | 'recording' | 'paused' | 'synthesizing'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Audio Analysis Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  
  // Visual Elements Refs for Direct DOM Manipulation (Performance)
  const wave1Ref = useRef<HTMLDivElement>(null);
  const wave2Ref = useRef<HTMLDivElement>(null);
  const wave3Ref = useRef<HTMLDivElement>(null);

  const handleMainAction = () => {
    if (processingState === 'idle') {
      setProcessingState('recording');
    } else if (processingState === 'recording') {
      setProcessingState('paused');
    } else if (processingState === 'paused') {
      setProcessingState('recording');
    }
  };

  const handleRetake = () => {
    setProcessingState('idle');
  };

  const handleFinish = () => {
    setProcessingState('synthesizing');
  };

  // Audio Processing Logic
  useEffect(() => {
    const initAudio = async () => {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(audioStream);
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5; // Smoother response
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);

        animateWaves();
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    };

    const stopAudio = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      // Reset waves visually
      [wave1Ref, wave2Ref, wave3Ref].forEach(ref => {
        if (ref.current) ref.current.style.transform = 'scale(1)';
      });

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    if (processingState === 'recording') {
      if (!audioContextRef.current) {
        initAudio();
      } else {
        // Resume if existing
        audioContextRef.current.resume();
        animateWaves();
      }
    } else if (processingState === 'paused') {
      if (audioContextRef.current) audioContextRef.current.suspend();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Reset waves visually when paused
      [wave1Ref, wave2Ref, wave3Ref].forEach(ref => {
         if (ref.current) ref.current.style.transform = 'scale(1)';
      });
    } else {
      stopAudio();
    }

    return () => {
      if (processingState === 'idle' || processingState === 'synthesizing') {
        stopAudio();
      }
    };
  }, [processingState]); // Dependency on state to trigger transitions

  const animateWaves = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    // Focus on lower frequencies for voice (first half of bins approx)
    const voiceBins = Math.floor(bufferLength * 0.5);
    for (let i = 0; i < voiceBins; i++) {
      sum += dataArray[i];
    }
    const average = sum / voiceBins;
    const volume = average / 255; // Normalized 0-1

    // Update refs directly
    if (wave1Ref.current) {
      // Inner wave: fast reaction
      const scale = 1 + (volume * 0.6); 
      wave1Ref.current.style.transform = `scale(${scale})`;
      wave1Ref.current.style.opacity = `${0.2 + volume * 0.5}`;
    }
    if (wave2Ref.current) {
      // Middle wave: slightly delayed feeling (handled by CSS transition usually, but here direct)
      // We make it bigger but slightly less responsive to small noise
      const scale = 1 + (Math.max(0, volume - 0.1) * 1.2);
      wave2Ref.current.style.transform = `scale(${scale})`;
      wave2Ref.current.style.opacity = `${0.1 + volume * 0.3}`;
    }
    if (wave3Ref.current) {
      // Outer wave: big expansion on loud sounds
      const scale = 1 + (Math.max(0, volume - 0.2) * 1.8);
      wave3Ref.current.style.transform = `scale(${scale})`;
      wave3Ref.current.style.opacity = `${0.05 + volume * 0.2}`;
    }

    rafRef.current = requestAnimationFrame(animateWaves);
  };

  // Simulate synthesizing reset and navigation
  useEffect(() => {
    if (processingState === 'synthesizing') {
      const timer = setTimeout(() => {
        setProcessingState('idle');
        if (onProcessComplete) {
          onProcessComplete();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [processingState, onProcessComplete]);

  if (processingState === 'synthesizing') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full px-6 animate-in fade-in duration-700">
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
            {/* Neural Network Decoration */}
             <div className="absolute inset-0 animate-pulse-slow opacity-30">
                <svg viewBox="0 0 200 200" className="w-full h-full stroke-primary fill-none stroke-[0.5]">
                    <circle cx="100" cy="100" r="80" strokeDasharray="4 4" />
                    <circle cx="100" cy="100" r="40" />
                    <line x1="100" y1="20" x2="100" y2="180" />
                    <line x1="20" y1="100" x2="180" y2="100" />
                    <line x1="43" y1="43" x2="157" y2="157" />
                    <line x1="157" y1="43" x2="43" y2="157" />
                </svg>
             </div>
             
             {/* Center Glow */}
             <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_40px_10px_rgba(19,236,200,0.6)] animate-ping"></div>
        </div>

        <h2 className="text-xl font-medium text-white/90 mb-6">Sintetizando ideas...</h2>
        
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-1/2 animate-[translateX_1s_ease-in-out_infinite]"></div>
        </div>
        
        <p className="mt-8 text-white/50 text-center max-w-xs leading-relaxed">
            Estoy preparando un plan de acción para ayudarte a avanzar.
        </p>
      </div>
    );
  }

  const isRecording = processingState === 'recording';
  const isPaused = processingState === 'paused';
  const isActive = isRecording || isPaused;

  return (
    <div className="flex flex-col items-center justify-between h-full w-full px-6 pt-12 pb-32 relative">
      
      {/* NOW Title */}
      <div className="absolute top-10 left-0 w-full flex justify-center z-20">
            <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold animate-in fade-in slide-in-from-top-4 duration-700">NOW</h1>
      </div>

      <div className="mt-8 text-center space-y-3 relative w-full flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white transition-all duration-300">
          {isRecording ? 'Te escucho...' : isPaused ? 'Pausado' : '¿En qué estás ahora?'}
        </h1>
        
        {/* Helper Text Layer */}
        <div className="relative h-6 w-full">
            <p className={`absolute top-0 left-0 w-full text-center text-white/50 font-medium transition-all duration-300 ${isActive ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                Dímelo como si se lo contaras a alguien.
            </p>
            <p className={`absolute top-0 left-0 w-full text-center text-primary font-bold tracking-widest uppercase text-sm transition-all duration-300 ${isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                Toca para reanudar
            </p>
        </div>
      </div>

      <div className="relative group flex items-center justify-center w-full max-w-xs h-64">
        
        {/* Retake Button (Left) */}
        <div className={`absolute left-0 transition-all duration-500 z-30 ${isPaused ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
             <button 
                onClick={handleRetake}
                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors active:scale-95 backdrop-blur-sm"
             >
                <span className="material-symbols-outlined text-[24px]">refresh</span>
             </button>
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-white/30 tracking-wider">Retake</span>
        </div>

        {/* Finish Button (Right) */}
        <div className={`absolute right-0 transition-all duration-500 z-30 ${isPaused ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'}`}>
             <button 
                onClick={handleFinish}
                className="w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_20px_rgba(19,236,200,0.3)] hover:scale-105 transition-transform active:scale-95"
             >
                <span className="material-symbols-outlined text-[28px] font-bold">check</span>
             </button>
             <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-white/30 tracking-wider">Done</span>
        </div>

        {/* Dynamic Wave Layers */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {/* Wave 3 (Outer) */}
            <div 
                ref={wave3Ref}
                className="absolute w-28 h-28 rounded-full bg-primary/20 blur-[40px] transition-transform duration-75 will-change-transform"
                style={{ opacity: 0 }}
            ></div>
            {/* Wave 2 (Middle) */}
            <div 
                ref={wave2Ref}
                className="absolute w-28 h-28 rounded-full bg-primary/30 blur-[20px] transition-transform duration-75 will-change-transform"
                style={{ opacity: 0 }}
            ></div>
            {/* Wave 1 (Inner) */}
            <div 
                ref={wave1Ref}
                className="absolute w-28 h-28 rounded-full bg-primary/40 blur-[10px] transition-transform duration-75 will-change-transform"
                style={{ opacity: 0 }}
            ></div>
        </div>

        {/* Static/State Ambient Glow (Fallback/Base) */}
        <div className={`absolute inset-0 rounded-full bg-primary/5 blur-[60px] transition-all duration-700 pointer-events-none z-0
            ${isActive ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`}>
        </div>
        
        {/* Main Mic Button */}
        <button 
            onClick={handleMainAction}
            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 z-20
            ${isActive ? 'bg-primary/20 scale-100' : 'bg-primary hover:scale-105 shadow-[0_0_50px_rgba(19,236,200,0.4)]'}
            ${isPaused ? 'border-2 border-primary/50 bg-transparent' : ''}
            `}
        >
             {isRecording ? (
                 <div className="flex gap-1 h-8 items-center">
                    <span className="material-symbols-outlined text-[40px] text-primary animate-pulse">pause</span>
                 </div>
             ) : (
                <span className={`material-symbols-outlined text-[48px] font-normal transition-colors duration-300 ${isPaused ? 'text-primary' : 'text-background'}`}>
                    mic
                </span>
             )}
        </button>
      </div>

      <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${isActive ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
          <span className="material-symbols-outlined text-[20px]">keyboard</span>
          <span className="text-sm font-semibold tracking-wide uppercase">Escribir en su lugar</span>
        </button>

        {/* Ambient Dots */}
        <div className="flex gap-2 opacity-30">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
        </div>
      </div>

      {/* Recording Status / Timer */}
      <div className={`absolute bottom-36 transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-secondary animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="text-xs font-mono text-white/60 tracking-widest">
                    {isPaused ? 'PAUSED' : 'REC 00:14'}
                </span>
            </div>
      </div>
    </div>
  );
};

export default InputModule;