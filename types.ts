export type ViewState = 'input' | 'focus' | 'projects';

export interface ProjectAction {
  type: 'createProject' | 'createTask';
  projectName?: string; // For 'createTask', to know which project to target
}

export interface Project {
  id: string;
  title: string;
  colorClass: string;
  steps: Step[];
  sort_order?: number;
}

export interface Step {
  id: string;
  order: number;
  title: string;
  isDone: boolean;
  sort_order?: number;
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