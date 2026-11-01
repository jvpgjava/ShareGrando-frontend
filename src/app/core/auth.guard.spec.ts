import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { provideHttpClient } from '@angular/common/http';

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });
  it('allows an authenticated session', () => {
    TestBed.inject(AuthService).set({
      accessToken: 'signed',
      expiresIn: 600,
      user: { id: 'u', name: 'A', email: 'a@b.test', role: 'ADMIN' },
    });
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBeTrue();
  });
  it('redirects when no session exists', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });
});
