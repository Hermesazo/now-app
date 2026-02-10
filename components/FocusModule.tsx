import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task } from '../types';

// Expanded Mock Data for 5 Projects
const MOCK_TASKS: Task[] = [
  // Project 1: Marketing AI
  { id: 'm1', title: 'Optimizar el prompt del generador de copies', project: 'Marketing AI', durationMinutes: 25, isCore: true, difficulty: 'Medium' },
  { id: 'm2', title: 'Revisar métricas de la campaña Q3', project: 'Marketing AI', durationMinutes: 15, isCore: false, difficulty: 'Low' },
  { id: 'm3', title: 'Redactar email de lanzamiento', project: 'Marketing AI', durationMinutes: 20, isCore: true, difficulty: 'High' },
  
  // Project 2: Product Design
  { id: 'p1', title: 'Diseñar wireframes del dashboard', project: 'Product Design', durationMinutes: 45, isCore: true, difficulty: 'High' },
  { id: 'p2', title: 'Actualizar sistema de iconos', project: 'Product Design', durationMinutes: 30, isCore: false, difficulty: 'Low' },
  { id: 'p3', title: 'Investigación de usuarios', project: 'Product Design', durationMinutes: 60, isCore: true, difficulty: 'Medium' },

  // Project 3: DevOps
  { id: 'd1', title: 'Setup del repositorio monorepo', project: 'DevOps', durationMinutes: 15, isCore: false, difficulty: 'Low' },
  { id: 'd2', title: 'Configurar CI/CD pipeline', project: 'DevOps', durationMinutes: 40, isCore: true, difficulty: 'High' },
  { id: 'd3', title: 'Revisar logs de producción', project: 'DevOps', durationMinutes: 10, isCore: false, difficulty: 'Medium' },

  // Project 4: Growth Hacking
  { id: 'g1', title: 'Analizar embudos de conversión', project: 'Growth Hacking', durationMinutes: 35, isCore: true, difficulty: 'High' },
  { id: 'g2', title: 'Configurar A/B test en landing', project: 'Growth Hacking', durationMinutes: 25, isCore: true, difficulty: 'Medium' },
  
  // Project 5: Legal & Admin
  { id: 'l1', title: 'Revisar contrato de proveedores', project: 'Legal & Admin', durationMinutes: 20, isCore: false, difficulty: 'High' },
  { id: 'l2', title: 'Pago de impuestos mensuales', project: 'Legal & Admin', durationMinutes: 15, isCore: true, difficulty: 'Medium' },
  { id: 'l3', title: 'Actualizar póliza de privacidad', project: 'Legal & Admin', durationMinutes: 10, isCore: false, difficulty: 'Low' },
];

const FocusModule: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('Marketing AI');
  
  // State: Map of Project Name -> Array of Tasks (Persists progress when switching tabs)
  const [projectsState, setProjectsState] = useState<Record<string, Task[]>>({});
  
  // State: Initial counts per project (for progress bar)
  const [initialCounts, setInitialCounts] = useState<Record<string, number>>({});

  // Animation & Gesture States
  const [showConfetti, setShowConfetti] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<'left' | 'right' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartX = useRef<number>(0);

  // Initialize Data Once
  useEffect(() => {
    // Group tasks by project
    const grouped: Record<string, Task[]> = {};
    const counts: Record<string, number> = {};
    
    // Get unique projects from mock to ensure order
    const uniqueProjects = Array.from(new Set(MOCK_TASKS.map(t => t.project)));
    
    uniqueProjects.forEach(p => {
        const tasks = MOCK_TASKS.filter(t => t.project === p);
        grouped[p] = tasks;
        counts[p] = tasks.length;
    });

    setProjectsState(grouped);
    setInitialCounts(counts);
  }, []);

  // Derived Values
  const projects = useMemo(() => Object.keys(projectsState), [projectsState]);
  const currentProjectTasks = projectsState[selectedProject] || [];
  
  const totalInitialTasks = initialCounts[selectedProject] || 0;
  const completedCount = totalInitialTasks - currentProjectTasks.length;
  const progressPercentage = totalInitialTasks > 0 ? (completedCount / totalInitialTasks) * 100 : 0;
  
  // Stack Logic
  const visibleTasks = currentProjectTasks.slice(0, 3);
  const currentTask = visibleTasks[0];
  const isProjectCompleted = currentProjectTasks.length === 0;

  // --- Confetti Logic ---
  useEffect(() => {
    // Check if we need to show confetti (either triggered manually or by completion)
    if ((!showConfetti && !isProjectCompleted) || !canvasRef.current) return;
    
    // If project is completed, ensure confetti runs
    if (isProjectCompleted && !showConfetti) {
        setShowConfetti(true);
        return; 
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#13ecc8', '#fbbf24', '#ffffff'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach(p => {
        if (p.life > 0) {
          active = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.4;
          p.life--;
          p.size *= 0.95;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 100;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (active) requestAnimationFrame(animate);
      else {
          // Only stop if not permanent state (like completion screen)
          // But even for completion, we stop the animation loop, just keep the state
          setShowConfetti(false);
      }
    };
    animate();
  }, [showConfetti, isProjectCompleted]);

  // --- Actions ---

  const completeTask = () => {
    setShowConfetti(true);
    setAnimatingOut('right'); // Animation direction

    setTimeout(() => {
        setProjectsState(prev => ({
            ...prev,
            [selectedProject]: prev[selectedProject].slice(1) // Remove first
        }));
        setAnimatingOut(null);
        setDragX(0);
    }, 250);
  };

  const skipTask = () => {
    if (currentProjectTasks.length <= 1) return; // Can't skip if only 1
    
    setAnimatingOut('left');

    setTimeout(() => {
        setProjectsState(prev => {
            const tasks = [...prev[selectedProject]];
            const first = tasks.shift();
            if (first) tasks.push(first);
            return {
                ...prev,
                [selectedProject]: tasks
            };
        });
        setAnimatingOut(null);
        setDragX(0);
    }, 250);
  };

  // --- Gesture Handlers ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isProjectCompleted || animatingOut) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    dragStartX.current = clientX;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const delta = clientX - dragStartX.current;
    setDragX(delta);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    const threshold = 100;

    if (dragX > threshold) {
        completeTask();
    } else if (dragX < -threshold) {
        skipTask();
    } else {
        setDragX(0); // Snap back
    }
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
        case 'Low': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-400' };
        case 'Medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: 'text-yellow-400' };
        case 'High': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-400' };
        default: return { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: 'text-primary' };
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden font-sans">
        
        {/* Canvas Layer */}
        <canvas ref={canvasRef} className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-300 ${showConfetti ? 'opacity-100' : 'opacity-0'}`} />

        {/* Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-transparent pointer-events-none"></div>

        {/* Header Title */}
        <div className="relative z-10 px-6 pt-10 pb-0 flex flex-col items-center justify-center">
            <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold animate-in fade-in slide-in-from-top-4 duration-700">NOW</h1>
        </div>

        {/* Project Chips Carousel */}
        <div className="relative z-10 w-full pt-6 pb-4">
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 mask-linear-right snap-x">
                {projects.map((project) => (
                    <button 
                        key={project}
                        onClick={() => setSelectedProject(project)}
                        className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold border transition-all duration-300 flex-shrink-0 snap-start
                        ${project === selectedProject 
                            ? 'bg-primary/10 border-primary/50 text-primary shadow-[0_0_15px_rgba(19,236,200,0.15)]' 
                            : 'bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                        }`}
                    >
                        {project}
                    </button>
                ))}
                {/* Spacer to allow scrolling the last item clearly into view */}
                <div className="w-4 flex-shrink-0"></div>
            </div>
        </div>
            
        {/* Progress Section */}
        <div className="relative z-10 px-8 mt-2 mb-4">
             <div className="flex justify-between items-end mb-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{selectedProject}</h3>
                <span className="text-sm font-mono font-medium text-primary/80">
                    {completedCount}/{totalInitialTasks}
                </span>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary shadow-[0_0_10px_#13ecc8] transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
             </div>
        </div>

        {/* Main Card Stack Area */}
        <div className="relative flex-1 px-6 flex flex-col items-center justify-center -mt-8 min-h-[350px]">
            
            <div className="relative w-full max-w-sm h-[320px] flex items-center justify-center">
                
                {/* Completed State (Transparent & Centered) */}
                {isProjectCompleted && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-700">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                            <span className="material-symbols-outlined text-primary text-5xl">celebration</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">¡Todo listo!</h2>
                        <p className="text-white/50 text-lg">Has completado<br/>{selectedProject}</p>
                    </div>
                )}

                {/* Cards */}
                {!isProjectCompleted && visibleTasks.slice().reverse().map((task, index) => {
                    const realIndex = visibleTasks.length - 1 - index; // 0 = Front
                    const isFront = realIndex === 0;
                    
                    // Visual Stacking Math
                    const scale = 1 - (realIndex * 0.05); 
                    const translateY = realIndex * 15; 
                    const opacity = 1 - (realIndex * 0.3); 
                    
                    const diffStyle = getDifficultyStyles(task.difficulty);

                    // Dynamic Styles based on Drag/Anim
                    let transform = `translateY(${translateY}px) scale(${scale})`;
                    let cardOpacity = opacity;

                    if (isFront) {
                        // Dragging logic
                        const rotate = dragX * 0.05;
                        if (animatingOut === 'right') {
                             transform = `translateX(120%) rotate(20deg)`;
                             cardOpacity = 0;
                        } else if (animatingOut === 'left') {
                             transform = `translateX(-120%) rotate(-20deg)`;
                             cardOpacity = 0;
                        } else {
                             transform = `translate(${dragX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`;
                        }
                    }

                    // Background Glow Intensity (Reduced by 50% requested)
                    // Regular glow was `shadow-2xl`. We use custom box-shadow for reduced effect.
                    const shadowStyle = isFront 
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' // Standard sharp shadow for front
                        : '0 10px 30px -10px rgba(19, 236, 200, 0.05)'; // Very faint glow for back

                    return (
                        <div 
                            key={task.id}
                            onMouseDown={isFront ? handlePointerDown : undefined}
                            onMouseMove={isFront ? handlePointerMove : undefined}
                            onMouseUp={isFront ? handlePointerUp : undefined}
                            onMouseLeave={isFront ? handlePointerUp : undefined}
                            onTouchStart={isFront ? handlePointerDown : undefined}
                            onTouchMove={isFront ? handlePointerMove : undefined}
                            onTouchEnd={isFront ? handlePointerUp : undefined}
                            className={`glass-card absolute top-0 w-full px-8 py-4 rounded-[2.5rem] flex flex-col justify-center min-h-[300px] origin-bottom
                                ${isFront ? 'z-30 cursor-grab active:cursor-grabbing border-white/20' : 'z-0 border-white/5 bg-surfaceHighlight/30'}
                            `}
                            style={{
                                transform,
                                opacity: cardOpacity,
                                zIndex: 30 - realIndex,
                                transition: isDragging && isFront ? 'none' : 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                boxShadow: shadowStyle
                            }}
                        >
                            {/* Card Content */}
                            <div className="flex justify-between items-start mb-8 mt-2 pointer-events-none select-none">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isFront ? 'bg-primary animate-pulse' : 'bg-white/10'}`}></div>
                                    <span className="text-sm font-bold tracking-widest uppercase text-white/50">
                                        {isFront ? 'Tarea Actual' : 'Siguiente'}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${diffStyle.bg} ${diffStyle.border}`}>
                                    <span className={`material-symbols-outlined text-[16px] ${diffStyle.icon}`} style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                                    <span className={`text-sm font-bold uppercase tracking-wider ${diffStyle.text}`}>{task.difficulty}</span>
                                </div>
                            </div>

                            <h2 className={`text-3xl md:text-4xl font-bold leading-tight text-white tracking-tight mb-4 pointer-events-none select-none ${!isFront && 'opacity-30 blur-[1px]'}`}>
                                {task.title}
                            </h2>
                        </div>
                    );
                })}
            </div>
            
            {/* Gesture Hint (Only if tasks exist) */}
            {!isProjectCompleted && !isDragging && (
                <div className="absolute bottom-24 opacity-20 text-xs font-mono text-white animate-pulse pointer-events-none select-none">
                    &lt; Desliza &gt;
                </div>
            )}
        </div>

        {/* Action Buttons - Simplified for drag context, acting as accessible alternatives */}
        {!isProjectCompleted && (
            <div className="relative z-20 px-6 pb-28 pt-2 flex flex-row gap-4 items-center w-full max-w-md mx-auto">
                <button 
                    onClick={skipTask}
                    className="flex-1 py-4 rounded-full bg-white/5 border border-white/10 text-white/50 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">fast_forward</span>
                    No ahora
                </button>
                <button 
                    onClick={completeTask}
                    className="flex-1 py-4 rounded-full bg-primary/20 border border-primary/50 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/30 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">check</span>
                    Hecho
                </button>
            </div>
        )}
    </div>
  );
};

export default FocusModule;