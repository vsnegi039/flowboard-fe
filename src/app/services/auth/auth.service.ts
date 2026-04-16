import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, shareReplay, tap, finalize } from 'rxjs';
import { Router } from '@angular/router';

import environment from '../../../environments/environment';
import { apiResponse } from '../../shared/models/request.model';
import { UserRole } from '../../shared/models/task.model';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.API_URL}/api/v1/auth`;
  router = inject(Router);
  private _user = signal<AuthUser | null>(null);
  private accessToken = signal<string | null>(null);
  private refreshRequest$?: Observable<apiResponse<AuthResponse>>;
  private pendingData: { name: string; email: string; password: string; otp: string } | null = null;

  user = this._user.asReadonly();

  constructor(private http: HttpClient) {}

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this._user();
  }

  getToken(): string | null {
    return this.accessToken();
  }

  login(email: string, password: string): Observable<apiResponse<AuthResponse>> {
    return this.http
      .post<
        apiResponse<AuthResponse>
      >(`${this.apiUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(tap((response) => this.setAuth(response)));
  }

  signup(
    name: string,
    email: string,
    password: string,
  ): Observable<apiResponse<{ otp: string; message: string }>> {
    return this.http
      .post<
        apiResponse<{ otp: string; message: string }>
      >(`${this.apiUrl}/register`, { name, email, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.data) this.pendingData = { email, name, password, otp: res.data.otp };
        }),
      );
  }

  getPendingData() {
    return this.pendingData;
  }

  verifyOtp(inputOtp: string): Observable<apiResponse<AuthResponse>> {
    if (!this.pendingData) {
      return throwError(() => new Error('Email is required to verify OTP.'));
    }

    return this.http
      .post<apiResponse<AuthResponse>>(`${this.apiUrl}/verify`, {
        email: this.pendingData.email,
        otp: inputOtp,
      })
      .pipe(
        tap((response) => {
          this.pendingData = null;
          this.setAuth(response);
        }),
      );
  }

  refreshAccessToken(): Observable<apiResponse<AuthResponse>> {
    if (this.refreshRequest$) {
      return this.refreshRequest$ as Observable<apiResponse<AuthResponse>>;
    }

    this.refreshRequest$ = this.http
      .post<apiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.data) {
            this.accessToken.set(response.data.accessToken);
            this._user.set(response.data.user);
          } else {
            throwError(() => 'Invalid credentials');
          }
        }),
        finalize(() => {
          this.refreshRequest$ = undefined;
        }),
        shareReplay(1),
      );

    return this.refreshRequest$ as Observable<apiResponse<AuthResponse>>;
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe(() => {
      this.clearAuth();
      this.router.navigate(['/login']);
    });
  }

  private setAuth(response: apiResponse<AuthResponse>): void {
    if (!response.data) return;
    this._user.set({
      id: response.data.user.id,
      name: response.data.user.name,
      role: response.data.user.role,
    });
    this.accessToken.set(response.data.accessToken);
  }

  private clearAuth(): void {
    this._user.set(null);
    this.accessToken.set(null);
  }

  checkEmailAvailability(email: string): Observable<apiResponse<{ available: boolean }>> {
    return this.http.get<apiResponse<{ available: boolean }>>(`${this.apiUrl}/check-email`, {
      params: { email },
    });
  }
}
