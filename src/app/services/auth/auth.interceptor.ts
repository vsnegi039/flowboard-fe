import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.shouldSkipAuth(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();

    const handleRequest = (accessToken: string | null) => {
      const authReq = accessToken
        ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
        : req;
      return next.handle(authReq);
    };

    const request$ = token
      ? handleRequest(token)
      : this.authService
          .refreshAccessToken()
          .pipe(switchMap(() => handleRequest(this.authService.getToken())));

    return request$.pipe(
      catchError((error: HttpErrorResponse) => {
        // ✅ HANDLE 500 ERROR HERE
        if (error.status === 500) {
          this.snackBar.open(
            error.error?.message || 'Something went wrong. Please try again.',
            '',
            { duration: 3000 },
          );
        }

        if (error.status === 401 && !this.isRefreshEndpoint(req.url)) {
          return this.refreshAndRetry(req, next);
        }

        return throwError(() => error);
      }),
    );
  }

  private refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandler) {
    return this.authService.refreshAccessToken().pipe(
      switchMap(() => {
        const newToken = this.authService.getToken();
        if (!newToken) {
          return throwError(() => new Error('Unable to refresh access token.'));
        }

        const retryReq = req.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` },
        });

        return next.handle(retryReq);
      }),
      catchError((refreshError) => throwError(() => refreshError)),
    );
  }

  private shouldSkipAuth(url: string): boolean {
    return url.includes('/api/v1/auth') && !url.includes('/logout');
  }

  private isRefreshEndpoint(url: string): boolean {
    return url.endsWith('/refresh');
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
