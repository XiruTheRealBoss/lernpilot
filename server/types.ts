import type { AuthUser, Credentials, CreateTaskInput, UpdateTaskInput, TaskDto } from '../src/shared/contracts/core.ts';

export interface ProviderSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}
export interface InfrastructureGateway {
  register(credentials: Credentials): Promise<ProviderSession | null>;
  login(credentials: Credentials): Promise<ProviderSession>;
  refresh(refreshToken: string): Promise<ProviderSession>;
  verify(accessToken: string): Promise<AuthUser>;
  logout(session: ProviderSession): Promise<void>;
  listTasks(session: ProviderSession, limit: number, after?: string): Promise<TaskDto[]>;
  createTask(session: ProviderSession, input: CreateTaskInput): Promise<TaskDto>;
  updateTask(session: ProviderSession, id: string, input: UpdateTaskInput): Promise<TaskDto | null>;
  deleteTask(session: ProviderSession, id: string): Promise<boolean>;
}
