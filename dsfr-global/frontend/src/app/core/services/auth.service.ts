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
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<User | null>(null);
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => this.accessToken !== null);

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
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
  }

  loadMe(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/me`)
      .pipe(tap((u) => this.userSignal.set(u)));
  }

  private storeTokens(tokens: TokenPair): void {
    sessionStorage.setItem(ACCESS_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  }
}
