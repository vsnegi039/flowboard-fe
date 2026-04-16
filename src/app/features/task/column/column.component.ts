import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle
} from '@angular/cdk/drag-drop';

import { Column, ColumnId, Task, User } from '../../../shared/models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskService } from '../../../services/task/task.service';
import { UserService } from '../../../services/user/user.service';

@Component({
  selector: 'app-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TaskCardComponent,
  ],
  templateUrl: './column.component.html',
  styleUrls: ['./column.component.scss'],
})
export class ColumnComponent {
  @Input({ required: true }) column!: Column;
  @Input() connectedTo: string[] = [];

  @Output() taskDropped = new EventEmitter<CdkDragDrop<Task[]>>();
  @Output() addTaskClick = new EventEmitter<ColumnId>();
  @Output() taskCardClick = new EventEmitter<Task>();

  taskService = inject(TaskService);
  userService = inject(UserService);

  onDrop(event: CdkDragDrop<Task[]>): void {
    this.taskDropped.emit(event);
  }

  onAddTask(): void {
    this.addTaskClick.emit(this.column.id);
  }

  onCardClick(task: Task): void {
    this.taskCardClick.emit(task);
  }

  trackByTask(_: number, task: Task): string {
    return task._id;
  }
}
