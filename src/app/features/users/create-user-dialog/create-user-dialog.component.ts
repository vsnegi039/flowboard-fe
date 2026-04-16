import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User, UserRole } from '../../../shared/models/task.model';
import { CreateUserPayload, UserService } from '../../../services/user/user.service';

interface CreateUserDialogData {
  availableManagers: User[];
  currentUser: User;
}

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './create-user-dialog.component.html',
  styleUrls: ['./create-user-dialog.component.scss'],
})
export class CreateUserDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  readonly data = inject<CreateUserDialogData>(MAT_DIALOG_DATA);

  readonly roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Team Lead', value: UserRole.TEAM_LEAD },
    { label: 'Employee', value: UserRole.EMPLOYEE },
  ];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [UserRole.EMPLOYEE as Exclude<UserRole, UserRole.MANAGER>, Validators.required],
    managerId: [this.isManager ? '' : this.data.currentUser.id, Validators.required],
  });

  get isManager(): boolean {
    return this.data.currentUser.role === UserRole.MANAGER;
  }

  get filteredManagers(): User[] {
    const role = this.form.get('role')?.value;

    if (role === UserRole.TEAM_LEAD) {
      return this.data.availableManagers.filter((user) => user.role === UserRole.MANAGER);
    }

    if (role === UserRole.EMPLOYEE) {
      return this.data.availableManagers.filter((user) => user.role === UserRole.TEAM_LEAD);
    }

    return [];
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.userService.createUser(this.form.getRawValue() as CreateUserPayload).subscribe({
      next: () => {
        this.snackBar.open('User created successfully.', '', { duration: 2200 });
        this.dialogRef.close({ created: true });
      },
      error: (error: HttpErrorResponse) => {
        const message = error.error?.message ?? 'Failed to create user.';
        this.snackBar.open(message, '', { duration: 2600 });
      },
    });
  }

  formatRole(role: UserRole): string {
    if (role === UserRole.MANAGER) return 'Manager';
    if (role === UserRole.TEAM_LEAD) return 'Team Lead';
    return 'Employee';
  }
}
