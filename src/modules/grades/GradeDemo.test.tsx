import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeDemo } from './GradeDemo';

describe('isolierte Notenoberfläche', () => {
  it('zeigt Herkunft und wechselt zwischen Halbjahr und Jahr ohne Netzwerk', () => {
    render(<GradeDemo />);
    expect(screen.getByText(/Valor calculado · meta escolhida/)).toBeInTheDocument();
    expect(screen.getByText(/Simulação:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1º semestre' }));
    expect(screen.getByText(/Valor importado de exemplo \(fictício\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ano' }));
    expect(screen.getByText(/estimativa parcial, sem previsão de aprovação/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('verarbeitet das Ziel Null und lehnt ungültige Ziele sichtbar ab', () => {
    render(<GradeDemo />);
    const input = screen.getByRole('textbox', { name: 'Meta da simulação' });
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar meta' }));
    expect(screen.getByText(/meta escolhida: 0,00/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Infinity' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar meta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Meta inválida');
    expect(screen.getByText(/meta escolhida: 0,00/)).toBeInTheDocument();
  });

  it('übernimmt ausschließlich gültige fiktive Nachtragsnoten und speichert nichts', () => {
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    render(<GradeDemo />);
    const input = screen.getByRole('textbox', { name: 'Nota fictícia da Prova C' });
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar exemplo' }));
    expect(screen.getByText('Prova C: 8,00')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '<img src=x onerror=alert(1)>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar exemplo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Nota inválida');
    expect(screen.getByText('Prova C: 8,00')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(persist).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
