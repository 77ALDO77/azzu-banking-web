import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AUTH_PORT, AuthenticatedSession, AuthPort, LoginChallenge, LoginCredentials } from '../application/ports/auth.port';
import { SessionService } from './session.service';

class AuthPortStub implements AuthPort {
  session: AuthenticatedSession | null = null;
  stepUpReturnUrl = '';
  credentials?: LoginCredentials;

  startLogin(credentials: LoginCredentials): Observable<LoginChallenge> {
    this.credentials = credentials;
    return of({ loginId: 'login-1', maskedEmail: 'ma*****@example.com', expiresInSeconds: 300 });
  }
  verifyLogin(_loginId: string, _code: string): Observable<AuthenticatedSession> {
    this.session = { customerId: 'customer-1', displayName: 'Mariana' };
    return of(this.session);
  }
  beginStepUp(returnUrl: string): void { this.stepUpReturnUrl = returnUrl; }
  getSession(): Observable<AuthenticatedSession | null> { return of(this.session); }
  logout(): Observable<void> { this.session = null; return of(undefined); }
}

describe('SessionService', () => {
  let service: SessionService;
  let auth: AuthPortStub;

  beforeEach(() => {
    auth = new AuthPortStub();
    TestBed.configureTestingModule({ providers: [SessionService, { provide: AUTH_PORT, useValue: auth }] });
    service = TestBed.inject(SessionService);
  });

  it('stores the session only after the email code and clears it on logout', async () => {
    const challenge = await firstValueFrom(service.startLogin({ documentNumber: '12345678', password: 'Clave-Segura-2026' }));
    expect(challenge.maskedEmail).toBe('ma*****@example.com');
    expect(service.session()).toBeNull();
    await firstValueFrom(service.verifyLogin(challenge.loginId, '123456'));
    expect(service.session()?.customerId).toBe('customer-1');
    await firstValueFrom(service.endSession());
    expect(service.session()).toBeNull();
  });

  it('rejects an external return URL', () => {
    expect(service.safeReturnUrl('https://evil.example/steal')).toBe('/portal/inicio');
    expect(service.safeReturnUrl('//evil.example')).toBe('/portal/inicio');
  });

  it('accepts an internal return URL for step-up', () => {
    service.beginStepUp('/portal/operaciones/transferencias');
    expect(auth.stepUpReturnUrl).toBe('/portal/operaciones/transferencias');
  });
});
