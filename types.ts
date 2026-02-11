export type ViewState = 'input' | 'focus' | 'projects';

export interface ProjectAction {
  type: 'createProject' | 'createTask';
  projectName?: string; // For 'createTask', to know which project to target
}

export interface Project {
  id: string;
  title: string;
  colorClass: string; // Tailwind color class for accents
  steps: Step[];
}

export interface Step {
  id: string;
  order: number;
  title: string;
  isDone: boolean;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  durationMinutes: number;
  isCore: boolean;
  difficulty: 'Low' | 'Medium' | 'High';
  insight?: string;
}