import { Component, inject, QueryList, ViewChildren, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify.component.html',
})
export class VerifyOtpComponent implements OnInit {
  private fb = inject(FormBuilder);
  public auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  public data = this.auth.getPendingData();

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  form = this.fb.nonNullable.group({
    otp: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]),
  });

  otpArray = Array.from({ length: 6 });
  otpValues: string[] = Array(6).fill('');

  ngOnInit(): void {
    if (!this.auth.getPendingData()) {
      this.router.navigate(['/signup']);
    }
  }

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 1) {
      this.handlePaste(value);
      return;
    }

    this.otpValues[index] = value;
    input.value = value;

    if (value && index < 5) {
      this.inputs.get(index + 1)?.nativeElement.focus();
    }

    this.updateForm();
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        this.inputs.get(index - 1)?.nativeElement.focus();
      }

      this.otpValues[index] = '';
      this.updateForm();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    this.handlePaste(pasted);
  }

  private handlePaste(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('');

    digits.forEach((digit, i) => {
      this.otpValues[i] = digit;
      const input = this.inputs.get(i)?.nativeElement;
      if (input) input.value = digit;
    });

    this.updateForm();

    const nextIndex = digits.length < 6 ? digits.length : 5;
    this.inputs.get(nextIndex)?.nativeElement.focus();
  }

  private updateForm() {
    this.form.patchValue({
      otp: this.otpValues.join(''),
    });
  }

  verify() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { otp } = this.form.getRawValue();

    if (!this.auth.getPendingData()) {
      this.snackBar.open('Email is missing. Please sign up again.', '', { duration: 1800 });
      this.router.navigate(['/signup']);
      return;
    }

    this.auth.verifyOtp(otp).subscribe({
      next: () => this.router.navigate(['/board']),
      error: (error: HttpErrorResponse) =>
        this.snackBar.open(this.getErrorMessage(error), '', {
          duration: 2200,
        }),
    });
  }

  resendOtp() {
    const data = this.auth.getPendingData();
    if (!data) {
      this.router.navigate(['/signup']);
      return;
    }
    this.auth.signup(data.name, data.email, data.password).subscribe({
      next: () => {},
      error: (error: HttpErrorResponse) =>
        this.snackBar.open(this.getErrorMessage(error), '', { duration: 2400 }),
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
    return 'Invalid OTP. Please try again.';
  }
}
