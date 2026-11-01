import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('saves the returned token and user to memory and sessionStorage', () => {
    const response = {
      accessToken: 'token-1',
      expiresIn: 600,
      user: { id: 'u1', name: 'Pessoa', email: 'pessoa@grando.test', role: 'ADMIN' as const },
    };
    auth.login(response.user.email, 'senha').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: response.user.email, password: 'senha' });
    req.flush(response);
    expect(auth.token()).toBe('token-1');
    expect(auth.user()?.name).toBe('Pessoa');
    expect(sessionStorage.getItem('screengrando.auth')).toContain('token-1');
  });

  it('clears the persisted session', () => {
    sessionStorage.setItem('screengrando.auth', '{}');
    auth.clear();
    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem('screengrando.auth')).toBeNull();
  });
});
