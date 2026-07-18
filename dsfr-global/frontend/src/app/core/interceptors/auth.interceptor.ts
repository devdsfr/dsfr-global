import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Attaches the Bearer token to every API request. On a 401 from a protected
 * endpoint, attempts a single token refresh and retries the original request.
 *
 * Without this, an expired/invalid access token (e.g. GET /me returning 401)
 * left the UI stuck: the failing request's error was swallowed by the caller
 * (loadMe().subscribe({ error: () => void 0 })) and nothing ever redirected
 * the user back to login, so the dashboard sat forever showing loading
 * placeholders instead of real data.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = req.url.includes('/auth/');
  const authedReq = attachToken(req, auth.accessToken, isAuthEndpoint);

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      const isUnauthorized = err instanceof HttpErrorResponse && err.status === 401;
      if (!isUnauthorized || isAuthEndpoint) {
        return throwError(() => err);
      }

      return auth.refreshOnce().pipe(
        switchMap(() => next(attachToken(req, auth.accessToken, false))),
        catchError((refreshErr: unknown) => {
          // Refresh token is also expired/invalid: the session is truly over.
          auth.logout();
          router.navigate(['/auth/login']);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};

function attachToken<T>(req: import('@angular/common/http').HttpRequest<T>, token: string | null, isAuthEndpoint: boolean) {
  return token && !isAuthEndpoint ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
