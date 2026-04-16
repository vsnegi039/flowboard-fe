import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Task, User } from '../../../shared/models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() assignee: User | undefined;
  @Input() canEdit = true;

  @Output() cardClick = new EventEmitter<Task>();

  onCardClick(): void {
    this.cardClick.emit(this.task);
  }

  getFileSizeLabel(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    return Math.round(bytes / 1024) + 'KB';
  }

  trackByTag(_: number, tag: string): string {
    return tag;
  }
}
