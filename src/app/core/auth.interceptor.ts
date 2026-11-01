import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const publicViewerToken = request.method === 'POST' && request.url.includes('/viewer-token');
  const publicSession = request.method === 'GET' && /^\/api\/sessions\/[^/]+$/.test(request.url);
  const publicRequest = publicViewerToken || publicSession || request.url.endsWith('/auth/login');
  const token = publicRequest ? null : auth.token();

  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !publicRequest) {
        auth.clear();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
