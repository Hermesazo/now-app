import React, { useState, useEffect, useRef } from 'react';
import { analyzeTranscript, AnalysisResult } from '../lib/groq';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface InputModuleProps {
  onProcessComplete?: () => void;
}

const InputModule: React.FC<InputModuleProps> = ({ onProcessComplete }) => {
  const [processingState, setProcessingState] = useState<'idle' | 'recording' | 'paused' | 'synthesizing' | 'reviewing_transcript' | 'reviewing_analysis' | 'typing'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');

  // Audio Analysis Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

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
    stopPlayback();
    setAudioUrl(null);
    setTranscript('');
    setAnalysisResult(null);
    setKeyboardText('');
    audioChunksRef.current = [];
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setProcessingState('idle');
  };

  const handleKeyboardSubmit = () => {
    if (keyboardText.trim()) {
      setTranscript(keyboardText);
      setProcessingState('synthesizing');
    }
  };

  const handleFinish = () => {
    stopPlayback();
    setProcessingState('synthesizing');
  };

  const stopPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
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

        // MediaRecorder setup - one instance for the whole session
        const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
            // Create the URL whenever new data is available
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          }
        };
        recorder.onstop = () => {
          // The URL is already created in ondataavailable, so no need to recreate here
          // This onstop is primarily for when the recording session truly ends (e.g., on retake or finish)
          // If we want to ensure the final blob is created, we could do it here,
          // but for continuous preview, ondataavailable is better.
        };
        mediaRecorderRef.current = recorder;
        recorder.start(1000); // Collect data every 1s

        // Web Speech API Setup
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'es-ES'; // Set to Spanish as requested

          recognition.onresult = (event: any) => {
            let currentTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
          };

          recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
          };

          recognitionRef.current = recognition;
          recognition.start();
        }

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };

    if (processingState === 'recording') {
      stopPlayback();
      if (!audioContextRef.current) {
        initAudio();
      } else {
        // Resume if existing
        audioContextRef.current.resume();

        // Resume MediaRecorder and SpeechRecognition if they were paused
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }

        animateWaves();
      }
    } else if (processingState === 'paused') {
      if (audioContextRef.current) audioContextRef.current.suspend();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        // Force a data request when pausing so the preview is up to date
        mediaRecorderRef.current.requestData();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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

  const { user } = useAuth();

  // Handle synthesizing flow transitions
  useEffect(() => {
    if (processingState === 'synthesizing') {
      const processAI = async () => {
        try {
          if (!transcript || !user) {
            console.warn("Missing transcript or user for AI analysis");
            setProcessingState('reviewing_transcript');
            return;
          }

          const result: AnalysisResult = await analyzeTranscript(transcript);
          console.log("Análisis de Groq recibido:", result);
          setAnalysisResult(result);

          // 1. Save Projects and get their IDs
          const projectMap = new Map<string, string>();

          for (const p of result.projects) {
            const { data, error } = await supabase
              .from('projects')
              .insert({
                user_id: user.id,
                name: p.name,
                description: p.description,
                status: p.status
              })
              .select()
              .single();

            if (error) console.error("Error saving project:", error);
            if (data) projectMap.set(p.name, data.id);
          }

          // 2. Save Tasks
          for (const t of result.tasks) {
            const projectId = t.project_name ? projectMap.get(t.project_name) : null;
            const { error } = await supabase
              .from('tasks')
              .insert({
                user_id: user.id,
                project_id: projectId,
                title: t.title,
                description: t.description,
                priority: t.priority,
                status: 'todo'
              });

            if (error) console.error("Error saving task:", error);
          }

          // 3. Save Transcript and Insights History
          await supabase.from('transcripts').insert({
            user_id: user.id,
            raw_text: transcript,
            processed: true
          });

          await supabase.from('session_history').insert({
            user_id: user.id,
            action: 'voice_recording_processed',
            metadata: { insights: result.insights }
          });

        } catch (error) {
          console.error("AI Processing failed:", error);
        } finally {
          // Go directly to idle and signal completion
          setProcessingState('idle');
          if (onProcessComplete) {
            onProcessComplete();
          }
        }
      };

      processAI();
    }

    // Transcript and Analysis review timers removed as per user request
  }, [processingState, onProcessComplete, transcript, user]);

  if (processingState === 'typing') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full px-8 animate-in fade-in duration-700">
        <div className="absolute top-10 left-0 w-full flex justify-center z-20">
          <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">ENTRADA DE TEXTO</h1>
        </div>

        <div className="w-full max-w-lg space-y-6">
          <textarea
            autoFocus
            value={keyboardText}
            onChange={(e) => setKeyboardText(e.target.value)}
            placeholder="Escribe tus ideas, metas o proyectos aquí..."
            className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-lg focus:outline-none focus:border-primary/50 transition-colors resize-none backdrop-blur-xl"
          />

          <div className="flex gap-4">
            <button
              onClick={() => setProcessingState('idle')}
              className="flex-1 py-4 rounded-full bg-white/5 text-white/50 font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleKeyboardSubmit}
              disabled={!keyboardText.trim()}
              className="flex-[2] py-4 rounded-full bg-primary text-background font-extrabold uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-[0_0_20px_rgba(19,236,200,0.3)]"
            >
              Procesar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="h-full bg-primary animate-[filling_3s_ease-in-out_forwards]"></div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes filling {
                from { width: 0%; }
                to { width: 100%; }
            }
        `}} />

        <p className="mt-8 text-white/50 text-center max-w-xs leading-relaxed">
          Estoy preparando un plan de acción para ayudarte a avanzar.
        </p>
      </div>
    );
  }

  // Review screens removed to skip directly to completion

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

        {/* Playback Button (Bottom Centered) */}
        <div className={`absolute -bottom-20 left-1/2 -translate-x-1/2 transition-all duration-500 z-30 ${isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button
            onClick={togglePlayback}
            disabled={!audioUrl}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md disabled:opacity-30 ripple"
          >
            <span className="material-symbols-outlined text-[20px]">{isPlaying ? 'stop' : 'play_arrow'}</span>
            <span className="text-[11px] uppercase font-extrabold tracking-[0.15em]">{isPlaying ? 'Stop' : 'Listen Back'}</span>
          </button>
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
        <button
          onClick={() => setProcessingState('typing')}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">keyboard</span>
          <span className="text-sm font-semibold tracking-wide uppercase">Usar teclado</span>
        </button>

        {/* Ambient Dots Removed */}
      </div>

      {/* Recording Status / Timer */}
      <div className={`absolute bottom-36 transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-secondary animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
          <span className="text-xs font-mono text-white/60 tracking-widest">
            {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'REC 00:14'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InputModule;