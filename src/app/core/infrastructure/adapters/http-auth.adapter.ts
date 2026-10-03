import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthenticatedSession, AuthPort, LoginChallenge, LoginCredentials } from '../../application/ports/auth.port';

@Injectable()
export class HttpAuthAdapter implements AuthPort {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  // El BFF exige el token CSRF también en el login: primero se obtiene la cookie XSRF-TOKEN.
  startLogin(credentials: LoginCredentials): Observable<LoginChallenge> {
    return this.http.get<void>(`${this.baseUrl}/csrf`, { withCredentials: true }).pipe(
      switchMap(() => this.http.post<LoginChallenge>(`${this.baseUrl}/login`,
        { dni: credentials.documentNumber, password: credentials.password }, { withCredentials: true })),
    );
  }

  verifyLogin(loginId: string, code: string): Observable<AuthenticatedSession> {
    return this.http.post<void>(`${this.baseUrl}/login/verify`, { loginId, code }, { withCredentials: true }).pipe(
      switchMap(() => this.http.get<AuthenticatedSession>(`${this.baseUrl}/session`, { withCredentials: true })),
    );
  }

  // Reautenticación: el mismo formulario propio (DNI + contraseña + código).
  beginStepUp(returnUrl: string): void {
    window.location.assign(`/auth?reason=reauth&returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  getSession(): Observable<AuthenticatedSession | null> {
    return this.http.get<AuthenticatedSession | null>(`${this.baseUrl}/session`, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true });
  }
}
