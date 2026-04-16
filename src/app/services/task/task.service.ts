import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ColumnId, Task, TaskFile, TaskFormData } from '../../shared/models/task.model';
import environment from '../../environments/environment';
import { COLUMN_META } from './task.mock';
import { apiResponse } from '../../shared/models/request.model';
import { UserService } from '../user/user.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private userService = inject(UserService);
  private readonly apiUrl = `${environment.API_URL}/api/v1/tasks`;

  private tasksSignal = signal<Task[]>([]);
  readonly tasks = this.tasksSignal.asReadonly();

  readonly columnMeta = COLUMN_META;
  readonly availableTags = ['Frontend', 'Backend', 'Design', 'Testing', 'DevOps', 'Bug', 'Feature'];

  constructor(private http: HttpClient) {}

  readonly columns = computed(() =>
    COLUMN_META.map((meta) => ({
      ...meta,
      tasks: this.tasksSignal()
        .filter((t) => t.columnId === meta.id)
        .sort((a, b) => a.order - b.order),
    })),
  );

  loadBoard(): void {
    this.userService.loadUsers();

    this.http
      .get<apiResponse<Record<string, Task[]>>>(`${this.apiUrl}/board`)
      .pipe(catchError(() => of([])))
      .subscribe((res) => {
        if (!Array.isArray(res) && res.data) {
          this.tasksSignal.set(Object.values(res.data).flat());
        } else if (Array.isArray(res)) {
          this.tasksSignal.set(res);
        }
      });
  }

  canEditTask(task: Task): boolean {
    return true;
  }

  createTask(formData: TaskFormData): void {
    this.http.post<apiResponse<Task>>(`${this.apiUrl}`, formData).subscribe({
      next: (res) => {
        const task = res.data;
        if (task) {
          this.tasksSignal.update((tasks) => [...tasks, task]);
        }
      },
      error: () => {},
    });
  }

  updateTask(taskId: string, formData: Partial<TaskFormData>): void {
    this.http.patch(`${this.apiUrl}/${taskId}`, formData).subscribe({
      next: () => {
        this.tasksSignal.update((tasks) =>
          tasks.map((t) => (t._id === taskId ? { ...t, ...formData, updatedAt: new Date() } : t)),
        );
      },
      error: () => {},
    });
  }

  deleteTask(taskId: string): void {
    this.http.delete(`${this.apiUrl}/${taskId}`).subscribe({
      next: () => {
        this.tasksSignal.update((tasks) => tasks.filter((t) => t._id !== taskId));
      },
      error: () => {},
    });
  }

  moveTask(id: string, order: number, columnId: ColumnId): void {
    this.tasksSignal.update((tasks) => {
      const updated = tasks.map((t) => (t._id === id ? { ...t, columnId, order } : t));
      return [...updated].sort((a, b) => a.order - b.order);
    });

    this.http.patch<apiResponse<Task>>(`${this.apiUrl}/${id}/move`, { order, columnId }).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  validateFile(file: File): string | null {
    if (file.size > 5 * 1024 * 1024) return `"${file.name}" exceeds the 5MB size limit.`;
    return null;
  }

  readFileAsDataUrl(file: File): Promise<TaskFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        });
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
