import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideChevronRight } from '@lucide/angular';
import { finalize, take } from 'rxjs';
import { LoginChallenge } from '../../core/application/ports/auth.port';
import { SessionService } from '../../core/auth/session.service';

// Acceso con identidad AZZU (Keycloak) en el formulario propio: DNI + contraseña y luego el código
// de 6 dígitos enviado al correo. Las credenciales viajan al BFF del mismo origen, nunca a otra página.
@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink, LucideArrowRight, LucideChevronRight],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  readonly sessionMessage = (() => {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'expired') return 'Tu sesión finalizó por seguridad. Ingresa nuevamente para continuar.';
    if (reason === 'reauth') return 'Por seguridad, confirma tu identidad para continuar con la operación.';
    return '';
  })();
  private readonly returnUrl = this.session.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly challenge = signal<LoginChallenge | null>(null);
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly loginError = signal('');
  readonly loginForm = this.formBuilder.nonNullable.group({
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    password: ['', [Validators.required, Validators.maxLength(256)]],
  });
  readonly codeForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly documentNumberInvalid = computed(() => this.loginForm.controls.documentNumber.invalid && (this.loginForm.controls.documentNumber.touched || this.submitted()));
  readonly passwordInvalid = computed(() => this.loginForm.controls.password.invalid && (this.loginForm.controls.password.touched || this.submitted()));
  readonly codeInvalid = computed(() => this.codeForm.controls.code.invalid && (this.codeForm.controls.code.touched || this.submitted()));

  sanitizeDocumentNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = value;
    this.loginForm.controls.documentNumber.setValue(value);
  }

  sanitizeCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = value;
    this.codeForm.controls.code.setValue(value);
  }

  submit(): void {
    this.submitted.set(true);
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.loginError.set('');
    const { documentNumber, password } = this.loginForm.getRawValue();
    this.session.startLogin({ documentNumber, password }).pipe(
      take(1),
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: (challenge) => {
        this.loginForm.controls.password.setValue('');
        this.submitted.set(false);
        this.challenge.set(challenge);
      },
      error: (error: unknown) => {
        this.loginForm.controls.password.setValue('');
        this.loginError.set(this.message(error, 'DNI o contraseña incorrectos.'));
      },
    });
  }

  verify(): void {
    const challenge = this.challenge();
    this.submitted.set(true);
    if (!challenge || this.codeForm.invalid || this.isSubmitting()) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.loginError.set('');
    this.session.verifyLogin(challenge.loginId, this.codeForm.controls.code.value).pipe(
      take(1),
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl(this.returnUrl),
      error: (error: unknown) => {
        this.codeForm.controls.code.setValue('');
        const code = this.problemCode(error);
        if (code === 'LOGIN_EXPIRED') this.restart();
        this.loginError.set(this.message(error, 'El código no es válido.'));
      },
    });
  }

  restart(): void {
    this.challenge.set(null);
    this.codeForm.reset();
    this.submitted.set(false);
  }

  private problemCode(error: unknown): string {
    return error instanceof HttpErrorResponse && typeof error.error?.code === 'string' ? error.error.code : '';
  }

  private message(error: unknown, fallback: string): string {
    switch (this.problemCode(error)) {
      case 'INVALID_CREDENTIALS': return 'DNI o contraseña incorrectos.';
      case 'LOGIN_TEMPORARILY_LOCKED': return 'Demasiados intentos. Espera unos minutos e inténtalo nuevamente.';
      case 'OTP_RATE_LIMITED': case 'RATE_LIMIT_EXCEEDED': return 'Demasiadas solicitudes. Espera unos minutos.';
      case 'OTP_INVALID': return 'El código no es válido.';
      case 'LOGIN_EXPIRED': return 'El código venció. Ingresa nuevamente tu contraseña.';
      case 'LOGIN_NOT_CONFIGURED': case 'BANKING_DEPENDENCY_UNAVAILABLE': return 'El acceso no está disponible en este momento. Inténtalo más tarde.';
      default: return error instanceof HttpErrorResponse && error.status >= 500 ? 'El acceso no está disponible en este momento. Inténtalo más tarde.' : fallback;
    }
  }
}
