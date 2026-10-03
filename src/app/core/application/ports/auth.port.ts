import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

// Login propio de banca.azzu.tech contra Keycloak (vía BFF e Identity): DNI + contraseña y luego
// el código enviado al correo verificado en el onboarding. Nunca se redirige a una página del IdP.
export interface LoginCredentials {
  documentNumber: string;
  password: string;
}

export interface LoginChallenge {
  loginId: string;
  maskedEmail: string;
  expiresInSeconds: number;
}

export interface AuthenticatedSession {
  customerId: string;
  displayName: string;
  expiresAtUtc?: string;
  idleTimeoutSeconds?: number;
  authenticationMethods?: string[];
}

export interface AuthPort {
  startLogin(credentials: LoginCredentials): Observable<LoginChallenge>;
  verifyLogin(loginId: string, code: string): Observable<AuthenticatedSession>;
  beginStepUp(returnUrl: string): void;
  getSession(): Observable<AuthenticatedSession | null>;
  logout(): Observable<void>;
}

export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');
