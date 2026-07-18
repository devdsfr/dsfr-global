import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginResponse, TokenPair, User } from '../models/user.model';

const ACCESS_KEY = 'dsfr.access';
const REFRESH_KEY = 'dsfr.refresh';

/**
 * Central authentication state. Uses Angular Signals so the shell and guards
 * react automatically to login/logout.
 *
 * Note: authentication state is tracked with an explicit `signal<boolean>`
 * (isAuthenticatedSignal), not a `computed()` over a plain sessionStorage
 * getter. A `computed()` only re-evaluates when a *signal* it read changes;
 * reading sessionStorage inside it is invisible to Angular's reactivity, so
 * the computed value would be calculated once and then frozen forever —
 * which caused the authGuard to keep rejecting navigation to /dashboard
 * right after a successful login (token was stored, but isAuthenticated()
 * still returned its stale initial value).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<User | null>(null);
  private readonly isAuthenticatedSignal = signal<boolean>(this.readAccessToken() !== null);

  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());

  get accessToken(): string | null {
    return this.readAccessToken();
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.api}/register`, { name, email, password });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, { email, password }).pipe(
      tap((res) => {
        this.storeTokens(res.tokens);
        this.userSignal.set(res.user);
      })
    );
  }

  refresh(): Observable<TokenPair> {
    const refresh_token = sessionStorage.getItem(REFRESH_KEY);
    return this.http
      .post<TokenPair>(`${this.api}/refresh`, { refresh_token })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout(): void {
    const refresh_token = sessionStorage.getItem(REFRESH_KEY);
    if (refresh_token) {
      this.http.post(`${this.api}/logout`, { refresh_token }).subscribe();
    }
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    this.userSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  loadMe(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/me`)
      .pipe(tap((u) => this.userSignal.set(u)));
  }

  private storeTokens(tokens: TokenPair): void {
    sessionStorage.setItem(ACCESS_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    this.isAuthenticatedSignal.set(true);
  }

  private readAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
  }
}
