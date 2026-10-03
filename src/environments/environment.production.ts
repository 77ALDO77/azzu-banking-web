import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  useMockBackend: false,
  authStrategy: 'bff-credentials',
  apiBaseUrl: '/api/v1',
  defaultIdleTimeoutSeconds: 15 * 60,
  idleWarningSeconds: 2 * 60,
};
