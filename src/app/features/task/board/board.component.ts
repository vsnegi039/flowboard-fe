import { Component, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import {
  Column,
  ColumnId,
  Priority,
  Task,
  User,
  UserRole,
} from '../../../shared/models/task.model';
import { TaskService } from '../../../services/task/task.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ColumnComponent } from '../column/column.component';
import { TaskDialogComponent } from '../task-dialog/task-dialog.component';
import { CreateUserDialogComponent } from '../../users/create-user-dialog/create-user-dialog.component';
import { UserService } from '../../../services/user/user.service';

@Component({
  selector: 'app-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatChipsModule,
    ColumnComponent,
  ],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit {
  columnIds: ColumnId[] = [];

  filterControl = new FormControl<Priority | 'all'>('all', { nonNullable: true });
  private filterSignal = signal<Priority | 'all'>('all');

  get users(): User[] {
    return this.userService.users();
  }

  readonly filterOptions: { value: Priority | 'all'; label: string }[] = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  readonly userRole = UserRole;

  readonly columns = computed(() => {
    const filter = this.filterSignal();
    const columns = this.taskService.columns();

    if (filter === 'all') return columns;

    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => task.priority === filter),
    }));
  });

  constructor(
    public taskService: TaskService,
    public authService: AuthService,
    public userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.columnIds = this.taskService.columnMeta.map((c: Omit<Column, 'tasks'>) => c.id);

    this.filterControl.valueChanges.subscribe((value) => {
      this.filterSignal.set(value);
    });

    this.taskService.loadBoard();
  }

  logout(): void {
    this.authService.logout();
  }

  get isManager(): boolean {
    return this.authService.user()?.role === UserRole.MANAGER;
  }

  get canCreate(): boolean {
    return this.authService.user()?.role !== UserRole.EMPLOYEE;
  }

  private getDialogCurrentUser(): User {
    const authUser = this.authService.user();
    if (authUser) {
      const matchedUser = this.userService.getUserById(authUser.id);
      if (matchedUser) return matchedUser;

      return {
        id: authUser.id,
        name: authUser.name,
        initials: authUser.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
        role: authUser.role,
        avatarColor: '#ffffff',
        avatarBg: '#5c6bc0',
      };
    }

    return this.users[0];
  }

  openCreateDialog(columnId?: ColumnId): void {
    const ref = this.dialog.open(TaskDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        defaultColumnId: columnId ?? 'todo',
        currentUser: this.getDialogCurrentUser(),
        allUsers: this.users,
      },
    });

    ref.afterClosed().subscribe((result: { saved?: boolean }) => {
      if (result?.saved) {
        this.snackBar.open('Task created!', '', { duration: 2000 });
      }
    });
  }

  openCreateUserDialog(): void {
    const currentUser = this.authService.user();
    if (!currentUser || !this.canCreate) return;

    const managers = this.users.filter((user) => user.role !== UserRole.EMPLOYEE);
    const ref = this.dialog.open(CreateUserDialogComponent, {
      width: '420px',
      data: {
        availableManagers: managers.length ? managers : [this.getDialogCurrentUser()],
        currentUser,
      },
    });

    ref.afterClosed().subscribe((result: { created?: boolean }) => {
      if (result?.created) {
        this.userService.loadUsers();
      }
    });
  }

  openEditDialog(task: Task): void {
    const ref = this.dialog.open(TaskDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        task,
        currentUser: this.getDialogCurrentUser(),
        allUsers: this.users,
      },
    });

    ref.afterClosed().subscribe((result: { saved?: boolean; deleted?: boolean }) => {
      if (result?.saved) {
        this.snackBar.open('Task updated!', '', { duration: 2000 });
      }
      if (result?.deleted) {
        this.snackBar.open('Task deleted.', '', { duration: 2000 });
      }
    });
  }

  onTaskDropped(event: CdkDragDrop<Task[]>, targetColumnId: ColumnId): void {
    const task: Task = event.item.data;

    if (!this.taskService.canEditTask(task)) {
      this.snackBar.open('Permission denied: you cannot move this task.', '', { duration: 3000 });
      return;
    }

    const updatedTasks = [...event.container.data];
    moveItemInArray(updatedTasks, event.previousIndex, event.currentIndex);

    const prev = updatedTasks[event.currentIndex - 1];
    const next = updatedTasks[event.currentIndex + 1];

    let newOrder: number;

    if (!prev && !next) newOrder = 0;
    else if (!prev) newOrder = next.order - 1000;
    else if (!next) newOrder = prev.order + 1000;
    else newOrder = (prev.order + next.order) / 2;

    task.columnId = targetColumnId;
    task.order = newOrder;

    this.taskService.moveTask(task._id, newOrder, targetColumnId);

    if (event.previousContainer !== event.container) {
      const col = this.taskService.columnMeta.find(
        (c: Omit<Column, 'tasks'>) => c.id === targetColumnId,
      );
    }
  }

  trackByColumn(_: number, col: Column): string {
    return col.id;
  }
}
