import { Pipe, PipeTransform } from '@angular/core';
import { TaskService } from '../../services/task/task.service';
import { ColumnId } from '../models/task.model';

@Pipe({ name: 'columnColor', standalone: true })
export class ColumnColorPipe implements PipeTransform {
  constructor(private taskService: TaskService) {}

  transform(columnId: ColumnId | string | null | undefined): string {
    if (!columnId) return '#9b9890';
    const col = this.taskService.columnMeta.find(c => c.id === columnId);
    return col?.color ?? '#9b9890';
  }
}
