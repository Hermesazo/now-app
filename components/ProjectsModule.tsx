import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Step, ProjectAction } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface ProjectsModuleProps {
  onStartWork?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  initialAction?: ProjectAction | null;
  onActionHandled?: () => void;
}

// Mock data removed in favor of Supabase fetching
const INITIAL_PROJECTS: Project[] = [];

// Drag Item Types
type DragItem =
  | { type: 'project'; index: number }
  | { type: 'task'; projectId: string; index: number };

const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  onStartWork,
  showBackButton,
  onBack,
  initialAction,
  onActionHandled
}) => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Drag State
  const [dragItem, setDragItem] = useState<DragItem | null>(null);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');

  // Adding Task State
  const [addingTaskToProjectId, setAddingTaskToProjectId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  // Toast / Undo State
  const [toastVisible, setToastVisible] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{
    type: 'task' | 'project';
    projectId?: string;
    data: any;
    index: number;
    tasks?: Step[]; // For restored projects
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Refs for scrolling
  const projectsBottomRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Try with sort_order first
      let { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      // If sort_order doesn't exist (code 42703), fall back to created_at
      // Fallback for projects if sort_order column is missing (code 42703)
      if (projectsError && (projectsError.code === '42703' || projectsError.message.includes('sort_order'))) {
        const fallback = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        projectsData = fallback.data;
        projectsError = fallback.error;
      }

      if (projectsError) throw projectsError;

      let { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      // Fallback for tasks if sort_order column is missing (code 42703)
      if (tasksError && (tasksError.code === '42703' || tasksError.message.includes('sort_order'))) {
        const fallback = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        tasksData = fallback.data;
        tasksError = fallback.error;
      }

      if (tasksError) throw tasksError;

      const mappedProjects: Project[] = (projectsData || []).map(p => ({
        id: p.id,
        title: p.name,
        colorClass: 'bg-primary',
        sort_order: p.sort_order,
        steps: (tasksData || [])
          .filter(t => t.project_id === p.id)
          .map(t => ({
            id: t.id,
            order: 0,
            title: t.title,
            isDone: t.status === 'done',
            sort_order: t.sort_order
          }))
      }));

      setProjects(mappedProjects);
    } catch (err) {
      console.error("Error fetching project data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const totalTasks = projects.reduce((acc, curr) => acc + curr.steps.length, 0);

  // --- Handle Initial Action ---
  useEffect(() => {
    if (!initialAction) return;

    if (initialAction.type === 'createProject') {
      handleAddProject();
    } else if (initialAction.type === 'createTask') {
      // Try to find project by name (since FocusModule sends names)
      // If not found, default to first project or just ignore
      let targetProject = projects.find(p => p.title === initialAction.projectName);

      // Fallback: if project name doesn't match exactly (because of Mock Data mismatch), pick the last one or create new
      if (!targetProject && projects.length > 0) {
        targetProject = projects[projects.length - 1]; // Simply attach to last project for demo purposes
      }

      if (targetProject) {
        // Scroll to project is handled by just rendering
        startAddingTask(targetProject.id);
        // We need to wait for render to focus input, but startAddingTask sets state which triggers render
      }
    }

    if (onActionHandled) onActionHandled();
  }, [initialAction]);

  // Scroll to bottom when adding project
  useEffect(() => {
    if (editingId && editingId.startsWith('p-') && projectsBottomRef.current) {
      projectsBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editingId, projects.length]);

  // Focus on new task input when addingTaskToProjectId changes
  useEffect(() => {
    if (addingTaskToProjectId && taskInputRef.current) {
      taskInputRef.current.focus();
    }
  }, [addingTaskToProjectId]);

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    e.stopPropagation();
    setDragItem(item);
    // Visual tweak
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image usually handled by browser or can be set here
    // e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (e: React.DragEvent, targetItem: DragItem) => {
    e.preventDefault();
    if (!dragItem) return;
    if (dragItem.type !== targetItem.type) return;

    // Reorder Projects
    if (dragItem.type === 'project' && targetItem.type === 'project') {
      if (dragItem.index === targetItem.index) return;

      const newProjects = [...projects];
      const item = newProjects.splice(dragItem.index, 1)[0];
      newProjects.splice(targetItem.index, 0, item);

      setProjects(newProjects);
      setDragItem({ ...dragItem, index: targetItem.index });
    }

    // Reorder Tasks
    if (dragItem.type === 'task' && targetItem.type === 'task') {
      const sourceProjId = dragItem.projectId;
      const destProjId = targetItem.projectId;

      // Same Project Reorder
      if (sourceProjId === destProjId) {
        if (dragItem.index === targetItem.index) return;

        const newProjects = projects.map(p => {
          if (p.id === sourceProjId) {
            const newSteps = [...p.steps];
            const item = newSteps.splice(dragItem.index, 1)[0];
            newSteps.splice(targetItem.index, 0, item);
            return { ...p, steps: newSteps };
          }
          return p;
        });
        setProjects(newProjects);
        setDragItem({ ...dragItem, index: targetItem.index });
      }
      // Cross Project Move
      else {
        const newProjects = [...projects];
        const sourceProj = newProjects.find(p => p.id === sourceProjId);
        const destProj = newProjects.find(p => p.id === destProjId);

        if (sourceProj && destProj) {
          const item = sourceProj.steps[dragItem.index];
          // Remove
          sourceProj.steps = sourceProj.steps.filter((_, i) => i !== dragItem.index);
          // Add
          destProj.steps.splice(targetItem.index, 0, item);

          setProjects(newProjects);
          setDragItem({ type: 'task', projectId: destProjId, index: targetItem.index });
        }
      }
    }
  };

  const handleDragEnd = async () => {
    setDragItem(null);
    if (!user) return;

    // After drag ends, persist the new order to Supabase
    try {
      // We wrap the updates in case sort_order doesn't exist yet
      // 1. Update Projects Order
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        await supabase.from('projects')
          .update({ sort_order: i })
          .eq('id', p.id);
      }

      // 2. Update Tasks Order for each project
      for (const project of projects) {
        for (let i = 0; i < project.steps.length; i++) {
          const s = project.steps[i];
          await supabase.from('tasks')
            .update({ sort_order: i })
            .eq('id', s.id);
        }
      }
    } catch (err) {
      console.warn("Could not persist order (likely missing sort_order column):", err);
    }
  };

  // --- Edit Handlers ---

  const handleEditClick = (id: string, currentText: string) => {
    setEditingId(id);
    setTempText(currentText);
  };

  const submitNewTask = async (projectId: string) => {
    if (newTaskText.trim() && user) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId,
          title: newTaskText,
          status: 'todo',
          priority: 'medium'
        })
        .select()
        .single();

      if (!error && data) {
        const newTask: Step = {
          id: data.id,
          order: 99,
          title: data.title,
          isDone: false
        };
        setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
            return { ...p, steps: [...p.steps, newTask] };
          }
          return p;
        }));
      } else {
        console.error("Error creating task:", error);
      }
    }
    setAddingTaskToProjectId(null);
  };

  const handleAddProject = async () => {
    if (!user) return;

    const nextSortOrder = projects.length > 0
      ? Math.max(...projects.map(p => p.sort_order || 0)) + 1
      : 0;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: 'Nuevo Proyecto',
        status: 'active',
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (!error && data) {
      const newProject: Project = {
        id: data.id,
        title: data.name,
        colorClass: 'bg-primary',
        steps: []
      };
      setProjects(prev => [...prev, newProject]);

      // Auto focus on new project title
      setEditingId(data.id);
      setTempText(data.name);
    } else {
      console.error("Error creating project:", error);
    }
  };

  const handleSaveEdit = async (projectId: string, taskId?: string) => {
    if (!tempText.trim()) {
      setEditingId(null);
      return;
    }

    try {
      if (!taskId) {
        const { error } = await supabase
          .from('projects')
          .update({ name: tempText })
          .eq('id', projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .update({ title: tempText })
          .eq('id', taskId);
        if (error) throw error;
      }

      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          if (!taskId) {
            return { ...p, title: tempText };
          } else {
            return {
              ...p,
              steps: p.steps.map(s => s.id === taskId ? { ...s, title: tempText } : s)
            };
          }
        }
        return p;
      }));
    } catch (err) {
      console.error("Error updating record:", err);
    }
    setEditingId(null);
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId);
    const taskIndex = project?.steps.findIndex(s => s.id === taskId);
    const task = project?.steps[taskIndex!];

    if (project && task && taskIndex !== undefined) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;

        setLastDeleted({ type: 'task', projectId, data: task, index: taskIndex });

        setProjects(prev => prev.map(p => {
          if (p.id === projectId) {
            return { ...p, steps: p.steps.filter(s => s.id !== taskId) };
          }
          return p;
        }));

        setToastVisible(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setToastVisible(false);
        }, 4000);
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const project = projects[projectIndex];

    if (project && projectIndex !== -1) {
      try {
        // First delete tasks (Supabase should handle cascade but let's be safe if not configured)
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('project_id', projectId);

        if (tasksError) throw tasksError;

        const { error: projectError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (projectError) throw projectError;

        setLastDeleted({
          type: 'project',
          data: project,
          index: projectIndex,
          tasks: project.steps
        });

        setProjects(prev => prev.filter(p => p.id !== projectId));

        setToastVisible(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setToastVisible(false);
        }, 4000);
      } catch (err) {
        console.error("Error deleting project:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, projectId: string, taskId?: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(projectId, taskId);
    }
  };

  const startAddingTask = (projectId: string) => {
    setAddingTaskToProjectId(projectId);
    setNewTaskText('');
  };

  const handleUndo = async () => {
    if (!lastDeleted || !user) return;

    try {
      if (lastDeleted.type === 'task') {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            project_id: lastDeleted.projectId!,
            title: lastDeleted.data.title,
            status: lastDeleted.data.isDone ? 'done' : 'todo',
            priority: 'medium'
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setProjects(prev => prev.map(p => {
            if (p.id === lastDeleted.projectId) {
              const newSteps = [...p.steps];
              const restoredTask: Step = { ...lastDeleted.data, id: data.id };
              newSteps.splice(lastDeleted.index, 0, restoredTask);
              return { ...p, steps: newSteps };
            }
            return p;
          }));
        }
      } else if (lastDeleted.type === 'project') {
        // Restore project first
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: lastDeleted.data.title,
            status: 'active'
          })
          .select()
          .single();

        if (projError) throw projError;

        if (projData) {
          const restoredProjectId = projData.id;
          const restoredTasks: Step[] = [];

          // Restore associated tasks
          if (lastDeleted.tasks && lastDeleted.tasks.length > 0) {
            for (const task of lastDeleted.tasks) {
              const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  user_id: user.id,
                  project_id: restoredProjectId,
                  title: task.title,
                  status: task.isDone ? 'done' : 'todo',
                  priority: 'medium'
                })
                .select()
                .single();

              if (!taskError && taskData) {
                restoredTasks.push({ ...task, id: taskData.id });
              }
            }
          }

          const restoredProject: Project = {
            ...lastDeleted.data,
            id: restoredProjectId,
            steps: restoredTasks
          };

          setProjects(prev => {
            const newProjects = [...prev];
            newProjects.splice(lastDeleted.index, 0, restoredProject);
            return newProjects;
          });
        }
      }

      setToastVisible(false);
      setLastDeleted(null);
    } catch (err) {
      console.error("Error undoing deletion:", err);
    }
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

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white leading-tight mb-2 text-center">
              Tienes <span className="text-primary">{projects.length} proyectos</span> y <span className="text-primary">{totalTasks} tareas</span>
            </h2>
            <p className="text-sm text-white/40 flex items-center gap-1.5 text-center">
              <span className="material-symbols-outlined text-[16px]">touch_app</span>
              Edita cualquier texto haciendo tap
            </p>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-28 no-scrollbar">
        {projects.map((project, idx) => (
          <section
            key={project.id}
            className={`space-y-3 animate-in slide-in-from-bottom-4 duration-500 transition-opacity ${dragItem?.type === 'project' && dragItem.index === idx ? 'opacity-50' : 'opacity-100'}`}
            style={{ animationDelay: `${idx * 100}ms` }}
            draggable
            onDragStart={(e) => handleDragStart(e, { type: 'project', index: idx })}
            onDragEnter={(e) => handleDragEnter(e, { type: 'project', index: idx })}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center gap-2 mb-2 group">
              {/* Project Drag Handle */}
              <div className="text-white/20 cursor-grab active:cursor-grabbing hover:text-white/50 p-1">
                <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
              </div>

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
                  className="text-lg font-bold text-white/90 cursor-text hover:text-primary transition-colors select-none flex-1"
                >
                  {project.title}
                </h3>
              )}

              {/* Project Delete Button */}
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Eliminar proyecto"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2 pl-2">
              {project.steps.map((step, sIdx) => (
                <div
                  key={step.id}
                  className={`group relative flex items-start gap-3 bg-white/[0.02] hover:bg-white/[0.05] py-2 px-3 rounded-lg border border-white/5 transition-all
                                ${dragItem?.type === 'task' && dragItem.projectId === project.id && dragItem.index === sIdx ? 'opacity-30 border-dashed border-primary/50' : ''}
                            `}
                  draggable
                  onDragStart={(e) => handleDragStart(e, { type: 'task', projectId: project.id, index: sIdx })}
                  onDragEnter={(e) => handleDragEnter(e, { type: 'task', projectId: project.id, index: sIdx })}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  {/* Task Drag Handle */}
                  <div className="text-white/10 cursor-grab active:cursor-grabbing hover:text-white/40 mt-0.5 -ml-1">
                    <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                  </div>

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
                        className="text-sm font-medium text-white/80 break-words leading-snug cursor-text hover:text-white transition-colors select-none"
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
                    ref={taskInputRef}
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

        {/* Helper Div to scroll to bottom */}
        <div ref={projectsBottomRef} />

        {/* Actions Footer - Inside scroll but at bottom. Ensure gap-4 (16px) */}
        <div className="pt-6 pb-2 flex flex-col gap-6">
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
          <span className="text-sm font-medium text-white/80">
            {lastDeleted?.type === 'project' ? 'Proyecto eliminado' : 'Tarea eliminada'}
          </span>
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