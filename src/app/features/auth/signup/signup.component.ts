import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../services/auth/auth.service';
import { emailAsyncValidatorFactory } from '../../../shared/validators/email-availability';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CommonModule],
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    email: this.fb.nonNullable.control(
      '',
      [Validators.required, Validators.email],
    ),
    password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();

    this.auth.signup(name, email, password).subscribe({
      next: () => this.router.navigate(['/verify-otp']),
      error: (error: HttpErrorResponse) =>
        this.snackBar.open(this.getErrorMessage(error), '', { duration: 2400 }),
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const fieldMessage = this.extractFieldErrorMessage(error.error?.errors);
    if (fieldMessage) return fieldMessage;

    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    return 'Signup failed. Please check your details.';
  }

  private extractFieldErrorMessage(errors: unknown): string | null {
    if (!Array.isArray(errors) || errors.length === 0) return null;

    const firstError = errors[0] as {
      path?: string;
      msg?: string;
      message?: string;
    };

    const message = firstError?.msg ?? firstError?.message;
    if (!message) return null;

    return firstError?.path ? `${firstError.path}: ${message}` : message;
  }
}
