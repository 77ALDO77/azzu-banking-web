export interface AppEnvironment {
  production: boolean;
  useMockBackend: boolean;
  authStrategy: 'mock-credentials' | 'bff-credentials';
  apiBaseUrl: string;
  defaultIdleTimeoutSeconds: number;
  idleWarningSeconds: number;
}
