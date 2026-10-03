import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, take, tap } from 'rxjs';
import { BankingFacade } from '../../../../core/application/banking.facade';
import { asMoney, positiveMoneyValidator } from '../../shared/banking-form.utils';
import { PORTAL_PAGE_STYLES } from '../../shared/portal-page.styles';

@Component({
  selector: 'app-transfers-page',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <main class="page"><p class="eyebrow">TRANSFERENCIAS</p><h1>Nueva transferencia</h1><p class="intro">Verifica los datos del destinatario antes de continuar.</p><div class="form-layout">
    @if (step() === 'form') { <form class="surface form-card" [formGroup]="form" (ngSubmit)="continue()" novalidate>
      <label>Cuenta de origen<select formControlName="sourceAccountId">@for (account of accounts(); track account.id) {<option [value]="account.id">{{ account.name }} · •••• {{ account.lastDigits }} · {{ account.available | currency:'PEN':'S/ ':'1.2-2' }}</option>}</select></label>@if(invalid('sourceAccountId')){<p class="field-error">No encontramos una cuenta activa.</p>}
      <label>Número de cuenta destino<input formControlName="destinationAccountNumber" inputmode="numeric" maxlength="20" placeholder="Cuenta AZZU de 10 a 20 dígitos" [class.invalid]="invalid('destinationAccountNumber')"></label>@if(invalid('destinationAccountNumber')){<p class="field-error">Ingresa un número de cuenta de 10 a 20 dígitos.</p>}
      <label>Monto (S/)<input formControlName="amount" inputmode="decimal" maxlength="12" placeholder="0.00" [class.invalid]="invalid('amount')"></label>@if(invalid('amount')){<p class="field-error">Ingresa un monto válido mayor a cero.</p>}
      <label>Descripción<input formControlName="description" maxlength="80" placeholder="Ej. Pago compartido" [class.invalid]="invalid('description')"></label><button class="primary" type="submit">Continuar</button>
    </form> } @else if (step() === 'review') { <section class="surface form-card"><h2>Revisa tu transferencia</h2><div class="review"><div><span>Cuenta destino</span><b>{{ form.controls.destinationAccountNumber.value }}</b></div><div><span>Monto</span><b>{{ amount() | currency:'PEN':'S/ ':'1.2-2' }}</b></div><div><span>Descripción</span><b>{{ form.controls.description.value }}</b></div></div>@if(result()){<p class="field-error" role="alert">{{ result() }}</p>}<div class="actions"><button class="secondary" type="button" [disabled]="confirming()" (click)="step.set('form')">Editar</button><button class="primary" type="button" [disabled]="confirming()" (click)="confirm()">{{ confirming() ? 'Procesando…' : 'Confirmar transferencia' }}</button></div></section> } @else { <section class="surface form-card"><h2>Solicitud registrada</h2><p class="status">{{ result() }}</p><button class="primary" type="button" (click)="reset()">Hacer otra transferencia</button></section> }
    <aside class="side-note"><b>Antes de confirmar</b><p>La transferencia se valida nuevamente en el servidor y no se repite si reintentas la misma operación.</p></aside></div></main>`,
  styles: [PORTAL_PAGE_STYLES],
})
export class TransfersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly banking = inject(BankingFacade);
  protected readonly step = signal<'form' | 'review' | 'success'>('form');
  protected readonly submitted = signal(false);
  protected readonly confirming = signal(false);
  private readonly idempotencyKey = signal('');
  protected readonly result = signal('');
  protected readonly form = this.fb.nonNullable.group({
    sourceAccountId: ['', Validators.required],
    destinationAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,20}$/)]],
    amount: ['', [Validators.required, positiveMoneyValidator]],
    description: ['', [Validators.required, Validators.maxLength(80)]],
  });
  protected readonly accounts = toSignal(this.banking.getAccounts().pipe(
    tap((accounts) => { if (accounts[0] && !this.form.controls.sourceAccountId.value) this.form.controls.sourceAccountId.setValue(accounts[0].id); }),
  ), { initialValue: [] });
  protected readonly amount = computed(() => asMoney(this.form.controls.amount.value || '0'));
  protected invalid(name: keyof typeof this.form.controls) { const field = this.form.controls[name]; return field.invalid && (field.touched || this.submitted()); }
  protected continue() { this.submitted.set(true); if (this.form.invalid) { this.form.markAllAsTouched(); return; } if (!this.idempotencyKey()) this.idempotencyKey.set(crypto.randomUUID()); this.result.set(''); this.step.set('review'); }
  protected confirm() {
    if (this.confirming()) return;
    this.confirming.set(true);
    this.result.set('');
    this.banking.createTransfer({ ...this.form.getRawValue(), amount: this.amount(), idempotencyKey: this.idempotencyKey() }).pipe(
      take(1),
      finalize(() => this.confirming.set(false)),
    ).subscribe({
      next: (operation) => { this.result.set(`${operation.message} Código: ${operation.id}.`); this.step.set('success'); },
      error: (error: unknown) => this.result.set(error instanceof HttpErrorResponse && error.status === 400 && typeof error.error?.detail === 'string'
        ? error.error.detail : 'No pudimos procesar la transferencia. Vuelve a intentarlo sin cerrar esta pantalla.'),
    });
  }
  protected reset() { this.form.reset({ sourceAccountId: this.accounts()[0]?.id ?? '', destinationAccountNumber: '', amount: '', description: '' }); this.submitted.set(false); this.idempotencyKey.set(''); this.result.set(''); this.step.set('form'); }
}
