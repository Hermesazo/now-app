import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, ProjectAction } from '../types';

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

type InternalView = 'selection' | 'project-grid' | 'task-selection' | 'focus-session';

interface FocusModuleProps {
    onNavigateToProjects?: (action?: ProjectAction) => void;
}

const FocusModule: React.FC<FocusModuleProps> = ({ onNavigateToProjects }) => {
  // Navigation State - UPDATED DEFAULT to bypass selection
  const [internalView, setInternalView] = useState<InternalView>('focus-session');
  
  // Focus Session State - UPDATED DEFAULT to 'Hoy'
  const [selectedProject, setSelectedProject] = useState<string>('Hoy');
  const [projectsState, setProjectsState] = useState<Record<string, Task[]>>({});
  const [initialCounts, setInitialCounts] = useState<Record<string, number>>({});
  
  // Task Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Animation & Gesture States
  const [showConfetti, setShowConfetti] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<'left' | 'right' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartX = useRef<number>(0);

  // --- Initialization Helper ---
  const initializeProjects = (customTasks?: Task[]) => {
    const grouped: Record<string, Task[]> = {};
    const counts: Record<string, number> = {};
    
    // If we have custom "Hoy" tasks, handle them first
    if (customTasks && customTasks.length > 0) {
        grouped['Hoy'] = customTasks;
        counts['Hoy'] = customTasks.length;
    }

    // Initialize standard projects from MOCK_TASKS
    const uniqueProjects = Array.from(new Set(MOCK_TASKS.map(t => t.project)));
    uniqueProjects.forEach(p => {
        const tasks = MOCK_TASKS.filter(t => t.project === p);
        grouped[p] = tasks;
        counts[p] = tasks.length;
    });

    setProjectsState(grouped);
    setInitialCounts(counts);
  };

  // --- Initial Data Load (Standard) ---
  useEffect(() => {
    // Only initialize defaults if we are not already in a session setup
    if (Object.keys(projectsState).length === 0) {
       initializeProjects();
    }
  }, []);

  // --- Derived Values for Focus Session ---
  const projects = useMemo(() => {
      // Ensure 'Hoy' is ALWAYS first
      const keys = Object.keys(projectsState).filter(k => k !== 'Hoy');
      return ['Hoy', ...keys];
  }, [projectsState]);

  const currentProjectTasks = projectsState[selectedProject] || [];
  const totalInitialTasks = initialCounts[selectedProject] || 0;
  
  // Logic for empty Hoy state
  const isHoyEmpty = selectedProject === 'Hoy' && currentProjectTasks.length === 0 && totalInitialTasks === 0;
  
  // Completed logic (distinct from empty initially)
  const isProjectCompleted = !isHoyEmpty && currentProjectTasks.length === 0 && totalInitialTasks > 0;
  
  const completedCount = isHoyEmpty ? 0 : totalInitialTasks - currentProjectTasks.length;
  const progressPercentage = totalInitialTasks > 0 ? (completedCount / totalInitialTasks) * 100 : 0;
  
  const visibleTasks = currentProjectTasks.slice(0, 3);

  // --- Navigation Handlers ---

  const handleSelectProjectMode = () => {
    setInternalView('project-grid');
  };

  const handleSelectTaskMode = () => {
    setInternalView('task-selection');
  };

  const handleProjectClick = (projectName: string) => {
    setSelectedProject(projectName);
    setInternalView('focus-session');
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
        newSet.delete(taskId);
    } else {
        newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const handleStartCustomSession = () => {
    if (selectedTaskIds.size === 0) return;

    // Filter tasks
    const tasksForToday = MOCK_TASKS.filter(t => selectedTaskIds.has(t.id));
    
    // Re-initialize state with "Hoy" project
    initializeProjects(tasksForToday);
    setSelectedProject('Hoy');
    setInternalView('focus-session');
  };

  const handleProjectSuccessAction = (action?: ProjectAction) => {
      if (onNavigateToProjects) {
          onNavigateToProjects(action);
      } else {
          // Fallback if prop not provided
          setInternalView('project-grid');
      }
  };

  const handleNewProjectClick = () => {
      if (onNavigateToProjects) {
          onNavigateToProjects({ type: 'createProject' });
      }
  };

  // --- Confetti Effect (3 Seconds Timer) ---
  useEffect(() => {
    if (internalView !== 'focus-session') return;
    
    // Only trigger if completed
    if (isProjectCompleted) {
        setShowConfetti(true);
        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [isProjectCompleted, internalView]);

  // --- Canvas Animation ---
  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return;

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
        life: 100 // Visual life, not strict time
      });
    }

    const animate = () => {
      if (!showConfetti) return; // Stop if state changed
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
    };
    animate();
  }, [showConfetti]);

  // --- Focus Session Actions ---

  const completeTask = () => {
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
    if (currentProjectTasks.length <= 1) return;
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
    if (isProjectCompleted || isHoyEmpty || animatingOut) return;
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

  // --- RENDERERS ---

  if (internalView === 'selection') {
    return (
        <div className="flex flex-col h-full w-full px-6 pt-10 pb-28 animate-in fade-in duration-500">
            <h1 className="text-center text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-10">NOW</h1>
            <h2 className="text-2xl font-bold text-white text-center mb-10">¿En qué quieres trabajar?</h2>
            
            <div className="flex flex-col gap-6 flex-1 justify-center max-w-sm mx-auto w-full">
                <button 
                    onClick={handleSelectTaskMode}
                    className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-primary text-[32px]">checklist</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Tareas específicas</h3>
                        <p className="text-sm text-white/50 leading-relaxed">Elige manualmente qué tareas de varios proyectos atacar hoy.</p>
                    </div>
                </button>

                <button 
                    onClick={handleSelectProjectMode}
                    className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-secondary text-[32px]">folder_open</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Un proyecto</h3>
                        <p className="text-sm text-white/50 leading-relaxed">Enfócate en completar un proyecto específico de principio a fin.</p>
                    </div>
                </button>
            </div>
        </div>
    );
  }

  if (internalView === 'project-grid') {
      const uniqueProjects = Array.from(new Set(MOCK_TASKS.map(t => t.project)));
      
      return (
        <div className="flex flex-col h-full w-full px-6 pt-10 pb-28 animate-in slide-in-from-right duration-500">
             <div className="flex items-center justify-between mb-8">
                <button onClick={() => setInternalView('selection')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">PROYECTOS</h1>
                <div className="w-10"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pb-10">
                {uniqueProjects.map((proj, idx) => {
                    const count = MOCK_TASKS.filter(t => t.project === proj).length;
                    return (
                        <button 
                            key={proj}
                            onClick={() => handleProjectClick(proj)}
                            className="aspect-square rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between hover:bg-white/10 hover:border-primary/40 transition-all text-left group"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px]">folder</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-md leading-tight mb-1">{proj}</h3>
                                <p className="text-xs text-white/40">{count} tareas</p>
                            </div>
                        </button>
                    )
                })}
             </div>
        </div>
      )
  }

  if (internalView === 'task-selection') {
      const uniqueProjects = Array.from(new Set(MOCK_TASKS.map(t => t.project)));

      return (
          <div className="flex flex-col h-full w-full bg-background relative animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="px-6 pt-10 pb-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-20 flex flex-col items-center">
                <div className="absolute left-6 top-10">
                    <button onClick={() => setInternalView('selection')} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>
                <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-4">NOW</h1>
                <h2 className="text-xl font-bold text-white leading-tight mb-2 text-center px-4">
                    Selecciona las tareas que quieres trabajar
                </h2>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32 no-scrollbar">
                {uniqueProjects.map((proj, idx) => {
                    const tasks = MOCK_TASKS.filter(t => t.project === proj);
                    return (
                        <section key={proj} className="space-y-3">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,200,0.5)]"></div>
                                <h3 className="text-lg font-bold text-white/90">{proj}</h3>
                             </div>
                             <div className="space-y-2 pl-2">
                                 {tasks.map(task => {
                                     const isSelected = selectedTaskIds.has(task.id);
                                     return (
                                        <div 
                                            key={task.id}
                                            onClick={() => toggleTaskSelection(task.id)}
                                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none
                                                ${isSelected ? 'bg-primary/10 border-primary/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}
                                            `}
                                        >
                                            {/* Circular Checkbox */}
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors
                                                ${isSelected ? 'bg-primary border-primary' : 'border-white/20 bg-transparent'}
                                            `}>
                                                {isSelected && <span className="material-symbols-outlined text-background text-[16px] font-bold">check</span>}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[40px]">
                                                <p className={`text-sm font-medium leading-snug ${isSelected ? 'text-white' : 'text-white/70'}`}>{task.title}</p>
                                                {/* Meta data removed as per request */}
                                            </div>
                                        </div>
                                     )
                                 })}
                             </div>
                        </section>
                    )
                })}
            </div>

            {/* Floating Action Button */}
            <div className="absolute bottom-28 left-0 right-0 px-6 flex justify-center z-30">
                <button 
                    onClick={handleStartCustomSession}
                    disabled={selectedTaskIds.size === 0}
                    className={`w-full max-w-sm py-4 rounded-full font-extrabold text-lg flex items-center justify-center gap-2 shadow-xl transition-all
                        ${selectedTaskIds.size > 0 
                            ? 'bg-primary text-background shadow-[0_0_20px_rgba(19,236,200,0.3)] active:scale-[0.98]' 
                            : 'bg-white/10 text-white/20 cursor-not-allowed'}
                    `}
                >
                    SIGUIENTE
                    <span className="material-symbols-outlined font-bold">arrow_forward</span>
                </button>
            </div>
          </div>
      )
  }

  // --- FOCUS SESSION RENDER (Original) ---
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden font-sans animate-in zoom-in-95 duration-500">
        
        {/* Canvas Layer */}
        <canvas ref={canvasRef} className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-300 ${showConfetti ? 'opacity-100' : 'opacity-0'}`} />

        {/* Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-transparent pointer-events-none"></div>

        {/* Header Title with Back Button for Internal Nav */}
        <div className="relative z-10 px-6 pt-10 pb-0 flex items-center justify-between">
            <button onClick={() => setInternalView('selection')} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">NOW</h1>
            <div className="w-8"></div>
        </div>

        {/* Project Chips Carousel - Increased Padding-Left */}
        <div className="relative z-10 w-full pt-6 pb-4">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pl-8 pr-6 mask-linear-right snap-x items-center">
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
                
                {/* New Project Chip */}
                <button 
                    onClick={handleNewProjectClick}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-primary hover:bg-white/10 hover:border-primary/30 transition-all flex-shrink-0 snap-start flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Nuevo proyecto
                </button>

                {/* Spacer to allow scrolling the last item clearly into view */}
                <div className="w-4 flex-shrink-0"></div>
            </div>
        </div>
            
        {/* Progress Section */}
        {!isHoyEmpty && (
            <div className="relative z-10 px-8 mt-2 mb-16 animate-in fade-in duration-500">
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
        )}

        {/* Main Card Stack Area */}
        <div className="relative flex-1 px-6 flex flex-col items-center justify-center -mt-8 min-h-[300px]">
            
            <div className="relative w-full max-w-sm h-[320px] flex items-center justify-center">
                
                {/* Empty Hoy State (Initial, before completion) */}
                {isHoyEmpty && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-start text-center animate-in zoom-in-95 fade-in duration-700">
                         <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-white/30 text-4xl">calendar_today</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Sin tareas para hoy</h2>
                        <p className="text-white/50 text-sm mb-8 px-4 leading-relaxed">
                            No has seleccionado tareas específicas para tu sesión de hoy.
                        </p>
                        <button 
                            onClick={() => setInternalView('task-selection')}
                            className="px-8 py-3 rounded-full bg-primary text-background font-bold text-sm shadow-[0_0_20px_rgba(19,236,200,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Seleccionar Tareas
                        </button>
                    </div>
                )}

                {/* Completed State (Transparent & Centered) */}
                {isProjectCompleted && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-start text-center animate-in zoom-in-95 fade-in duration-700">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-2 animate-pulse">
                            <span className="material-symbols-outlined text-primary text-5xl">celebration</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">¡Felicidades!</h2>
                        
                        <p className="text-white/50 text-lg mb-8">
                             {selectedProject === 'Hoy' ? 'Has completado todas las tareas de hoy.' : `Has completado ${selectedProject}`}
                        </p>

                        {/* Custom Actions based on context */}
                        {selectedProject === 'Hoy' ? (
                             <button 
                                onClick={() => setInternalView('task-selection')}
                                className="px-6 py-3 rounded-full bg-primary text-background font-bold text-sm shadow-[0_0_20px_rgba(19,236,200,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Agregar más tareas al día
                            </button>
                        ) : (
                            // Changed to 2 buttons flex row
                            <div className="flex items-center gap-3 w-full justify-center">
                                <button 
                                    onClick={() => handleProjectSuccessAction()}
                                    className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm hover:text-white hover:bg-white/10 transition-all flex-1 max-w-[140px]"
                                >
                                    Ver proyectos
                                </button>
                                <button 
                                    onClick={() => handleProjectSuccessAction({ type: 'createTask', projectName: selectedProject })}
                                    className="px-5 py-3 rounded-full bg-primary text-background font-bold text-sm shadow-[0_0_20px_rgba(19,236,200,0.2)] hover:scale-105 active:scale-95 transition-all flex-1 max-w-[140px] flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Nueva tarea
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Cards */}
                {!isProjectCompleted && !isHoyEmpty && visibleTasks.slice().reverse().map((task, index) => {
                    const realIndex = visibleTasks.length - 1 - index; // 0 = Front
                    const isFront = realIndex === 0;
                    
                    // Visual Stacking Math
                    const scale = 1 - (realIndex * 0.05); 
                    const translateY = realIndex * 15; 
                    const opacity = 1 - (realIndex * 0.3); 
                    
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
                    const shadowStyle = isFront 
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                        : '0 10px 30px -10px rgba(19, 236, 200, 0.05)';

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
                            className={`glass-card absolute top-0 w-full px-6 py-6 rounded-[2rem] flex flex-col justify-center min-h-[240px] origin-bottom
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
                            <div className="flex flex-col w-full mb-6 mt-4 pointer-events-none select-none">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${isFront ? 'bg-primary animate-pulse' : 'bg-white/10'}`}></div>
                                        <span className="text-xs font-bold tracking-widest uppercase text-white/50">
                                            {isFront ? 'Tarea Actual' : 'Siguiente'}
                                        </span>
                                    </div>

                                    {/* Project Title Row Aligned for Hoy */}
                                    {selectedProject === 'Hoy' && (
                                        <>
                                            <span className="text-white/20 text-xs">•</span>
                                            <span className="text-[14px] text-primary font-medium tracking-wide animate-in fade-in truncate">
                                                {task.project}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <h2 className={`text-2xl md:text-3xl font-bold leading-tight text-white tracking-tight mb-2 pointer-events-none select-none ${!isFront && 'opacity-30 blur-[1px]'}`}>
                                {task.title}
                            </h2>
                        </div>
                    );
                })}
            </div>
            
            {/* Gesture Hint (Only if tasks exist) */}
            {!isProjectCompleted && !isHoyEmpty && !isDragging && (
                <div className="absolute bottom-24 opacity-20 text-xs font-mono text-white animate-pulse pointer-events-none select-none">
                    &lt; Desliza &gt;
                </div>
            )}
        </div>

        {/* Action Buttons - Simplified for drag context, acting as accessible alternatives */}
        {!isProjectCompleted && !isHoyEmpty && (
            <div className="relative z-20 px-6 pb-40 pt-2 flex flex-row gap-4 items-center w-full max-w-md mx-auto">
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