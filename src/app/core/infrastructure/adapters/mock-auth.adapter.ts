import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AuthenticatedSession, AuthPort, LoginChallenge, LoginCredentials } from '../../application/ports/auth.port';

@Injectable()
export class MockAuthAdapter implements AuthPort {
  private session: AuthenticatedSession | null = null;

  startLogin(_credentials: LoginCredentials): Observable<LoginChallenge> {
    return of({ loginId: 'mock-login', maskedEmail: 'ma*****@example.com', expiresInSeconds: 300 });
  }

  verifyLogin(_loginId: string, code: string): Observable<AuthenticatedSession> {
    if (!/^\d{6}$/.test(code)) return throwError(() => new Error('OTP_INVALID'));
    this.session = {
      customerId: 'demo-customer',
      displayName: 'Mariana',
      idleTimeoutSeconds: 15 * 60,
      authenticationMethods: ['mock'],
    };
    return of(this.session);
  }

  beginStepUp(_returnUrl: string): void {}

  getSession(): Observable<AuthenticatedSession | null> {
    return of(this.session);
  }

  logout(): Observable<void> {
    this.session = null;
    return of(undefined);
  }
}
