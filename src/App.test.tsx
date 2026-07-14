import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App — cambio de rubro en Bienvenida', () => {
  it('resetea al set de clientes del nuevo rubro y actualiza el tema', async () => {
    render(<App />);

    // Arranca en gastro (rubro por defecto).
    expect(screen.getByText('Elegí tu rubro')).toBeInTheDocument();
    expect(document.documentElement.dataset.rubro).toBe('gastro');

    // Cambiar el rubro a Supermercado.
    fireEvent.click(screen.getByRole('button', { name: /Supermercado/ }));
    await waitFor(() => expect(document.documentElement.dataset.rubro).toBe('super'));

    // Entrar a la demo (modo por defecto) → Paso 1, listado de clientes del rubro activo.
    fireEvent.click(screen.getByRole('button', { name: /Ver cómo funciona/ }));

    // El estado de clientes se reseteó a los del super: aparece Ramona (super), no Martina (gastro).
    expect(await screen.findByText('Ramona Villalba', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText('Martina Gómez')).toBeNull();
  });
});
