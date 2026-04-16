import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { debounceTime, switchMap, map, catchError, of, startWith, tap, timeout } from 'rxjs';

import { AuthService } from '../../services/auth/auth.service';

export function emailAsyncValidatorFactory(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl) => {
    if (!control.value) return of(null);

    return control.valueChanges.pipe(
      startWith(control.value),
      debounceTime(400),
      switchMap((email) => {
        console.log('Checking email:', email);
        return authService.checkEmailAvailability(email).pipe(
          tap((res) => console.log('API Response:', res)),
          timeout(10000), // Add timeout if API hangs
        );
      }),
      map((res) => {
        const isAvailable = res.data?.available;
        return isAvailable ? null : { emailTaken: true };
      }),
      catchError((err) => {
        console.error('Validator error:', err);
        return of(null);
      }),
    );
  };
}