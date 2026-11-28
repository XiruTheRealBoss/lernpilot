import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LocalAccountApp from './LocalAccountApp';
import { accountClient, ApiError, type AccountTask } from './client';

const a = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.test' };
const b = { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.test' };
const owned: AccountTask = {
  id: '33333333-3333-4333-8333-333333333333', title: 'Tarefa privada A', description: '',
  dueAt: null, completedAt: null, subjectId: null, periodId: null, source: 'manual',
  createdAt: '2026-11-27T12:00:00Z', updatedAt: '2026-11-27T12:00:00Z',
};

describe('separate local account surface', () => {
  beforeEach(() => {
    vi.spyOn(accountClient, 'me').mockResolvedValue(a);
    vi.spyOn(accountClient, 'tasks').mockResolvedValue([owned]);
    vi.spyOn(accountClient, 'create').mockResolvedValue(owned);
    vi.spyOn(accountClient, 'logout').mockResolvedValue();
  });

  it('keeps protected contents unavailable before authentication', async () => {
    vi.mocked(accountClient.me).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sessão encerrada.'));
    render(<LocalAccountApp />);
    expect(await screen.findByRole('region', { name: 'Autenticação de teste' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Área protegida' })).not.toBeInTheDocument();
    expect(accountClient.tasks).not.toHaveBeenCalled();
  });

  it('discards A data before acting with a different browser account', async () => {
    vi.mocked(accountClient.me).mockResolvedValueOnce(a).mockResolvedValue(b);
    render(<LocalAccountApp />);
    expect(await screen.findByText(owned.title)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título fictício'), { target: { value: 'Outra tarefa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('conta mudou');
    expect(screen.queryByText(owned.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Área protegida' })).not.toBeInTheDocument();
    expect(accountClient.create).not.toHaveBeenCalled();
  });

  it('clears the protected UI even if upstream logout fails', async () => {
    vi.mocked(accountClient.logout).mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'Servidor indisponível.'));
    render(<LocalAccountApp />);
    expect(await screen.findByText(owned.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.queryByRole('region', { name: 'Área protegida' })).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível');
    expect(screen.queryByText(a.email)).not.toBeInTheDocument();
  });

  it('ignores a late mutation result after another tab changes the account', async () => {
    let finish!: (task: AccountTask) => void;
    vi.mocked(accountClient.create).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    vi.mocked(accountClient.me).mockResolvedValueOnce(a).mockResolvedValueOnce(a).mockResolvedValue(b);
    render(<LocalAccountApp />);
    expect(await screen.findByText(owned.title)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título fictício'), { target: { value: 'Resposta atrasada A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    await waitFor(() => expect(accountClient.create).toHaveBeenCalled());
    fireEvent.focus(window);
    expect(await screen.findByRole('alert')).toHaveTextContent('conta mudou');
    await act(async () => { finish({ ...owned, title: 'Resposta atrasada A' }); });
    expect(screen.queryByText('Resposta atrasada A')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Área protegida' })).not.toBeInTheDocument();
  });
});
