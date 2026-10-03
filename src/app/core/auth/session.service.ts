import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { AUTH_PORT, AuthenticatedSession, LoginChallenge, LoginCredentials } from '../application/ports/auth.port';
import { SessionStateService } from './session-state.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AUTH_PORT);
  private readonly state = inject(SessionStateService);
  private sessionCheck?: Observable<boolean>;
  readonly session = this.state.session;

  beginStepUp(returnUrl: string): void {
    this.auth.beginStepUp(this.safeReturnUrl(returnUrl));
  }

  startLogin(credentials: LoginCredentials): Observable<LoginChallenge> {
    return this.auth.startLogin(credentials);
  }

  verifyLogin(loginId: string, code: string): Observable<AuthenticatedSession> {
    return this.auth.verifyLogin(loginId, code).pipe(tap((session) => this.state.set(session)));
  }

  safeReturnUrl(returnUrl: string | null | undefined): string {
    return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/portal/inicio';
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.session()) return of(true);
    return this.refreshSession();
  }

  refreshSession(): Observable<boolean> {
    if (this.sessionCheck) return this.sessionCheck;
    this.sessionCheck = this.auth.getSession().pipe(
      tap((session) => this.state.set(session)),
      map((session) => session !== null),
      catchError(() => {
        this.state.clear();
        return of(false);
      }),
      finalize(() => { this.sessionCheck = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sessionCheck;
  }

  endSession(): Observable<void> {
    return this.auth.logout().pipe(
      tap(() => this.state.clear()),
      finalize(() => this.state.clear()),
    );
  }

  invalidate(): void {
    this.state.clear();
  }
}
