import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { LoginResponse, User } from './contracts';

const STORAGE_KEY = 'screengrando.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stored = this.readStored();
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(this.stored?.user ?? null);
  readonly token = signal<string | null>(this.stored?.accessToken ?? null);

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(tap((result) => this.set(result)));
  }

  restore(): void {
    if (!this.token()) {
      return;
    }

    this.http.get<User>('/api/auth/me').subscribe({
      next: (user) => this.user.set(user),
      error: () => this.clear(),
    });
  }

  set(result: LoginResponse): void {
    this.token.set(result.accessToken);
    this.user.set(result.user);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  clear(): void {
    this.token.set(null);
    this.user.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  logout(): void {
    this.clear();
    void this.router.navigateByUrl('/login');
  }

  private readStored(): LoginResponse | null {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as LoginResponse | null;
    } catch {
      return null;
    }
  }
}
