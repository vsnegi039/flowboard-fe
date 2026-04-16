import { Component, Inject, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  DialogData,
  Priority,
  ColumnId,
  TaskFile,
  User,
  UserRole,
} from '../../../shared/models/task.model';
import { TaskService } from '../../../services/task/task.service';
import { ColumnColorPipe } from '../../../shared/pipes/column-color.pipe';
import { UserService } from '../../../services/user/user.service';

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    ColumnColorPipe,
  ],
  templateUrl: './task-dialog.component.html',
  styleUrls: ['./task-dialog.component.scss'],
})
export class TaskDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  selectedTags: string[] = [];
  attachedFiles: TaskFile[] = [];
  fileError = '';
  isDraggingOver = false;
  isLoading = false;
  canAssign = true;
  assignableUsers: User[] = [];

  private taskService = inject(TaskService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<TaskDialogComponent>);

  readonly priorities: { value: Priority; label: string; icon: string }[] = [
    { value: 'high', label: 'High', icon: 'keyboard_double_arrow_up' },
    { value: 'medium', label: 'Medium', icon: 'drag_handle' },
    { value: 'low', label: 'Low', icon: 'keyboard_double_arrow_down' },
  ];

  readonly columns = this.taskService.columnMeta;
  readonly availableTags = this.taskService.availableTags;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.task;
    this.canAssign = this.data.currentUser.role !== UserRole.EMPLOYEE;
    this.assignableUsers = this.canAssign ? this.data.allUsers : [this.data.currentUser];
    this.selectedTags = this.data.task?.tags ? [...this.data.task.tags] : [];
    this.attachedFiles = this.data.task?.files ? [...this.data.task.files] : [];

    this.form = this.fb.group({
      title: [this.data.task?.title ?? '', [Validators.required, Validators.maxLength(120)]],
      description: [this.data.task?.description ?? '', Validators.maxLength(500)],
      priority: [this.data.task?.priority ?? 'medium', Validators.required],
      columnId: [
        this.data.task?.columnId ?? this.data.defaultColumnId ?? 'todo',
        Validators.required,
      ],
      assignedTo: [
        this.canAssign
          ? (this.data.task?.assignedTo ?? this.data.currentUser.id)
          : this.data.currentUser.id,
      ],
    });
  }

  toggleTag(tag: string): void {
    const idx = this.selectedTags.indexOf(tag);
    idx === -1 ? this.selectedTags.push(tag) : this.selectedTags.splice(idx, 1);
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(): void {
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;
    if (event.dataTransfer?.files) this.processFiles(Array.from(event.dataTransfer.files));
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private async processFiles(files: File[]): Promise<void> {
    this.fileError = '';
    for (const file of files) {
      if (this.attachedFiles.length >= 5) {
        this.fileError = 'Maximum 5 files allowed per task.';
        break;
      }
      const error = this.taskService.validateFile(file);
      if (error) {
        this.fileError = error;
        continue;
      }
      if (this.attachedFiles.find((f) => f.name === file.name)) continue;
      try {
        const taskFile = await this.taskService.readFileAsDataUrl(file);
        this.attachedFiles = [...this.attachedFiles, taskFile];
      } catch {
        this.fileError = `Failed to read "${file.name}".`;
      }
    }
  }

  removeFile(index: number): void {
    this.attachedFiles = this.attachedFiles.filter((_, i) => i !== index);
    this.fileError = '';
  }

  getFileIcon(fileType: string, fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf' || ext === 'pdf') return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
    if (['zip', 'rar', '7z'].includes(ext)) return 'folder_zip';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'videocam';
    return 'attach_file';
  }

  getFileSizeLabel(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  getUserById(id: string): User | undefined {
    return this.userService.getUserById(id);
  }

  formatRole(role: User['role']): string {
    if (role === UserRole.TEAM_LEAD) return 'Team Lead';
    if (role === UserRole.MANAGER) return 'Manager';
    return 'Employee';
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, priority, columnId, assignedTo } = this.form.value;
    const formData = {
      title: title.trim(),
      description: description?.trim() ?? '',
      priority: priority as Priority,
      columnId: columnId as ColumnId,
      assignedTo: this.canAssign ? assignedTo : this.data.currentUser.id,
      tags: [...this.selectedTags],
      files: [...this.attachedFiles],
    };

    if (this.isEditMode && this.data.task) {
      this.taskService.updateTask(this.data.task._id, formData);
    } else {
      this.taskService.createTask(formData);
    }
    this.dialogRef.close({ saved: true });
  }

  onDelete(): void {
    if (this.data.task) {
      this.taskService.deleteTask(this.data.task._id);
      this.dialogRef.close({ deleted: true });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
