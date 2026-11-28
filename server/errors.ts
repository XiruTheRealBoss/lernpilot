export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const unauthenticated = () => new ApiError(401, 'SESSION_EXPIRED', 'Bitte erneut anmelden.');
export const unavailable = () => new ApiError(503, 'INFRASTRUCTURE_UNAVAILABLE', 'Die lokale Testumgebung ist gerade nicht erreichbar.');
