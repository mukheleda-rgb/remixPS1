export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  department?: string;
  createdAt: number;
}

const TASKS_KEY = "oil_depot_tasks";

export function getTasks(): Task[] {
  const saved = localStorage.getItem(TASKS_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function addTask(task: Omit<Task, "id" | "createdAt">) {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>) {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveTasks(tasks);
  }
}

export function deleteTask(id: string) {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  saveTasks(filtered);
}
