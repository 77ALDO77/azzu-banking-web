import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface TransferDraft {
  idempotencyKey: string;
  sourceAccountId: string;
  destinationAccountNumber: string;
  amount: number;
  description: string;
}

export interface LoanSimulationRequest { amount: number; termMonths: number; monthlyIncome: number; }
export interface LoanSimulation { monthlyPayment: number; totalPayment: number; annualRate: number; }
export interface LoanApplicationRequest extends LoanSimulationRequest { simulationAccepted: true; idempotencyKey: string; }
export interface PaymentDraft { sourceAccountId: string; service: 'Luz' | 'Agua' | 'Celular' | 'Internet'; customerCode: string; amount: number; idempotencyKey: string; }
export interface ProfileUpdate { email: string; phone: string; address: string; }
export interface DigitalKeyChange { currentKey: string; newKey: string; }
export interface NotificationPreferencesUpdate { transfers: boolean; cardPurchases: boolean; security: boolean; marketing: boolean; channel: 'email' | 'push' | 'both'; }
export interface CardControlUpdate { cardId: string; purchaseLimit: number; onlinePaymentsEnabled: boolean; }
export interface ProcedureRequest { type: 'bank-certificate' | 'data-update' | 'claim'; detail: string; }
export interface ApiOperation { id: string; status: string; message: string; resultingBalance?: number | null; }

/**
 * Contrato del portal. La implementación productiva debe invocar /api mediante HTTPS;
 * jamás debe llevar una conexión PostgreSQL ni secretos al navegador.
 */
export interface BankingCommandPort {
  createTransfer(draft: TransferDraft): Observable<ApiOperation>;
  createPayment(draft: PaymentDraft): Observable<ApiOperation>;
  simulateLoan(request: LoanSimulationRequest): Observable<LoanSimulation>;
  applyForLoan(request: LoanApplicationRequest): Observable<ApiOperation>;
  submitProcedure(request: ProcedureRequest): Observable<ApiOperation>;
  updateProfile(request: ProfileUpdate): Observable<ApiOperation>;
  changeDigitalKey(request: DigitalKeyChange): Observable<ApiOperation>;
  updateNotificationPreferences(request: NotificationPreferencesUpdate): Observable<ApiOperation>;
  revokeOtherSessions(): Observable<ApiOperation>;
  markNotificationsRead(): Observable<ApiOperation>;
  updateCardControls(request: CardControlUpdate): Observable<ApiOperation>;
  setCardTemporaryBlock(cardId: string, blocked: boolean): Observable<ApiOperation>;
}

export const BANKING_COMMAND_PORT = new InjectionToken<BankingCommandPort>('BANKING_COMMAND_PORT');
