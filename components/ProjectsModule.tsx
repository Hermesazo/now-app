import React, { useState, useEffect, useRef } from 'react';
import { Project, Step } from '../types';

interface ProjectsModuleProps {
  onStartWork?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Canal de productividad',
    colorClass: 'bg-primary',
    steps: [
      { id: 's1', order: 1, title: 'Definir mensaje del video de intro', isDone: false },
      { id: 's2', order: 2, title: 'Elegir formato de grabación', isDone: false },
      { id: 's2b', order: 3, title: 'Crear guión técnico', isDone: false }
    ]
  },
  {
    id: 'p2',
    title: 'Viaje a Japón',
    colorClass: 'bg-primary',
    steps: [
      { id: 's3', order: 1, title: 'Buscar vuelos baratos', isDone: false },
      { id: 's4', order: 2, title: 'Revisar hoteles en Kyoto', isDone: false }
    ]
  },
  {
    id: 'p3',
    title: 'Cena familiar',
    colorClass: 'bg-primary',
    steps: [
      { id: 's5', order: 1, title: 'Llamar a mamá', isDone: false },
      { id: 's6', order: 2, title: 'Reservar mesa para 6 personas', isDone: false }
    ]
  }
];

const ProjectsModule: React.FC<ProjectsModuleProps> = ({ onStartWork, showBackButton, onBack }) => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  
  // Adding Task State
  const [addingTaskToProjectId, setAddingTaskToProjectId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  // Toast / Undo State
  const [toastVisible, setToastVisible] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{ projectId: string; task: Step; index: number } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const totalTasks = projects.reduce((acc, curr) => acc + curr.steps.length, 0);

  // --- Handlers ---

  const handleEditClick = (id: string, currentText: string) => {
    setEditingId(id);
    setTempText(currentText);
  };

  const handleSaveEdit = (projectId: string, taskId?: string) => {
    if (!tempText.trim()) return setEditingId(null);

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        if (!taskId) {
          // Editing Project Title
          return { ...p, title: tempText };
        } else {
          // Editing Task Title
          return {
            ...p,
            steps: p.steps.map(s => s.id === taskId ? { ...s, title: tempText } : s)
          };
        }
      }
      return p;
    }));
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, projectId: string, taskId?: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(projectId, taskId);
    }
  };

  const handleDeleteTask = (projectId: string, taskId: string) => {
    // Find the task to save for undo
    const project = projects.find(p => p.id === projectId);
    const taskIndex = project?.steps.findIndex(s => s.id === taskId);
    const task = project?.steps[taskIndex!];

    if (project && task && taskIndex !== undefined) {
      setLastDeleted({ projectId, task, index: taskIndex });
      
      // Remove task
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, steps: p.steps.filter(s => s.id !== taskId) };
        }
        return p;
      }));

      // Show Toast
      setToastVisible(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastVisible(false);
      }, 4000);
    }
  };

  const handleUndo = () => {
    if (!lastDeleted) return;

    setProjects(prev => prev.map(p => {
      if (p.id === lastDeleted.projectId) {
        const newSteps = [...p.steps];
        newSteps.splice(lastDeleted.index, 0, lastDeleted.task);
        return { ...p, steps: newSteps };
      }
      return p;
    }));

    setToastVisible(false);
    setLastDeleted(null);
  };

  const startAddingTask = (projectId: string) => {
    setAddingTaskToProjectId(projectId);
    setNewTaskText('');
  };

  const submitNewTask = (projectId: string) => {
    if (newTaskText.trim()) {
      const newTask: Step = {
        id: Date.now().toString(),
        order: 99,
        title: newTaskText,
        isDone: false
      };
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, steps: [...p.steps, newTask] };
        }
        return p;
      }));
    }
    setAddingTaskToProjectId(null);
  };

  const handleAddProject = () => {
      const newProject: Project = {
          id: `p-${Date.now()}`,
          title: 'Nuevo Proyecto',
          colorClass: 'bg-primary',
          steps: []
      };
      setProjects(prev => [...prev, newProject]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      
      {/* Header */}
      <div className="px-6 pt-10 pb-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-20 flex flex-col items-center">
        {showBackButton && (
            <button 
                onClick={onBack}
                className="absolute left-6 top-10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
        )}
        
        <h1 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-4 animate-in fade-in slide-in-from-top-4 duration-700">NOW</h1>

        <h2 className="text-xl font-bold text-white leading-tight mb-2 text-center">
            He detectado <span className="text-primary">{projects.length} proyectos</span> y <span className="text-primary">{totalTasks} tareas</span>
        </h2>
        <p className="text-sm text-white/40 flex items-center gap-1.5 text-center">
            <span className="material-symbols-outlined text-[16px]">touch_app</span>
            Edita cualquier texto haciendo tap
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-28 no-scrollbar">
        {projects.map((project, idx) => (
            <section key={project.id} className="space-y-3 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,200,0.5)]"></div>
                    
                    {/* Project Title Editing */}
                    {editingId === project.id ? (
                        <input
                            autoFocus
                            value={tempText}
                            onChange={(e) => setTempText(e.target.value)}
                            onBlur={() => handleSaveEdit(project.id)}
                            onKeyDown={(e) => handleKeyDown(e, project.id)}
                            className="bg-transparent text-lg font-bold text-white/90 focus:outline-none w-full border-b border-primary/50 pb-0.5"
                        />
                    ) : (
                        <h3 
                            onClick={() => handleEditClick(project.id, project.title)}
                            className="text-lg font-bold text-white/90 cursor-text hover:text-primary transition-colors"
                        >
                            {project.title}
                        </h3>
                    )}
                </div>

                <div className="space-y-2 pl-2">
                    {project.steps.map((step, sIdx) => (
                        <div key={step.id} className="group relative flex items-start gap-3 bg-white/[0.02] hover:bg-white/[0.05] py-2 px-3 rounded-lg border border-white/5 transition-all">
                             {/* Number */}
                             <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 mt-0.5">
                                 <span className="text-xs font-bold text-primary/60">{sIdx + 1}</span>
                             </div>
                             
                             {/* Task Title Editing */}
                             <div className="flex flex-col flex-1 min-w-0 py-0.5">
                                {editingId === step.id ? (
                                    <input
                                        autoFocus
                                        value={tempText}
                                        onChange={(e) => setTempText(e.target.value)}
                                        onBlur={() => handleSaveEdit(project.id, step.id)}
                                        onKeyDown={(e) => handleKeyDown(e, project.id, step.id)}
                                        className="bg-transparent text-sm font-medium text-white/90 focus:outline-none w-full p-0"
                                    />
                                ) : (
                                    <p 
                                        onClick={() => handleEditClick(step.id, step.title)}
                                        className="text-sm font-medium text-white/80 break-words leading-snug cursor-text hover:text-white transition-colors"
                                    >
                                        {step.title}
                                    </p>
                                )}
                             </div>
                             
                             {/* Delete Action */}
                             <button 
                                onClick={() => handleDeleteTask(project.id, step.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-colors -mr-1"
                             >
                                 <span className="material-symbols-outlined text-[16px]">close</span>
                             </button>
                        </div>
                    ))}
                    
                    {/* Add Task Input or Button */}
                    {addingTaskToProjectId === project.id ? (
                         <div className="flex items-center gap-2 mt-2 pl-3 pr-2 py-2 bg-white/[0.05] rounded-lg border border-primary/30 animate-in fade-in slide-in-from-top-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">add</span>
                            <input 
                                autoFocus
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onBlur={() => submitNewTask(project.id)}
                                onKeyDown={(e) => e.key === 'Enter' && submitNewTask(project.id)}
                                placeholder="Escribe nueva tarea..."
                                className="bg-transparent text-sm text-white w-full focus:outline-none placeholder:text-white/20"
                            />
                         </div>
                    ) : (
                        <button 
                            onClick={() => startAddingTask(project.id)}
                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white/20 hover:text-primary hover:bg-primary/5 rounded-lg border border-dashed border-white/10 hover:border-primary/30 transition-all mt-2"
                        >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            Agregar otra tarea
                        </button>
                    )}
                </div>
            </section>
        ))}
        
        {/* Actions Footer - Inside scroll but at bottom */}
        <div className="pt-6 pb-2 flex flex-col gap-2">
             <button 
                onClick={handleAddProject}
                className="w-full bg-white/5 border border-white/10 text-white/60 font-bold text-sm py-4 rounded-full active:scale-[0.98] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined font-bold">add</span>
                AGREGAR PROYECTO
            </button>

            <button 
                onClick={onStartWork}
                className="w-full bg-primary text-background font-extrabold text-lg py-4 rounded-full shadow-[0_0_20px_rgba(19,236,200,0.2)] active:scale-[0.98] hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
                CONTINUAR
                <span className="material-symbols-outlined font-bold">arrow_forward</span>
            </button>
        </div>
      </div>

      {/* Undo Toast - z-index increased to be above navbar (z-50) */}
      <div className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-surfaceHighlight border border-white/10 shadow-xl rounded-xl p-4 flex items-center justify-between transition-all duration-300 transform z-[60] ${toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
              </div>
              <span className="text-sm font-medium text-white/80">Tarea eliminada</span>
          </div>
          <button 
            onClick={handleUndo}
            className="text-primary font-bold text-xs tracking-wider uppercase hover:text-white transition-colors"
          >
              Deshacer
          </button>
      </div>
    </div>
  );
};

export default ProjectsModule;