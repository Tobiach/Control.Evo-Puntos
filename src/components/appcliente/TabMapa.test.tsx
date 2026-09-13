import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NEGOCIOS, RELACIONES_INICIALES } from '../../data/negocios';
import TabMapa from './TabMapa';

const renderTabMapa = () =>
  render(<TabMapa negocios={NEGOCIOS} relaciones={RELACIONES_INICIALES} onAbrirNegocio={vi.fn()} />);

describe('TabMapa', () => {
  it('muestra la lista de locales aunque no haya geolocalización disponible', async () => {
    renderTabMapa();
    // jsdom no implementa navigator.geolocation: cae al estado "error" — la lista de
    // locales tiene que verse igual, nunca depender del permiso para poder explorar.
    await waitFor(() => expect(screen.getByText(/no soporta geolocalización/)).toBeInTheDocument());
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    expect(screen.getByText('Locales')).toBeInTheDocument();
  });

  it('filtra por rubro', async () => {
    renderTabMapa();
    await waitFor(() => expect(screen.getByText('Café Nardo')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cafeterías' }));
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    expect(screen.queryByText('Súper Charcas')).toBeNull();
  });

  it('filtra por "Te alcanza": solo locales con puntos suficientes para alguna recompensa', async () => {
    renderTabMapa();
    await waitFor(() => expect(screen.getByText('Café Nardo')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Te alcanza/ }));
    // Café Nardo: 320 pts, ya alcanza la de 120 → se ve.
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    // Rooftop Malabia: 95 pts, ninguna recompensa cuesta tan poco → no se ve.
    expect(screen.queryByText('Rooftop Malabia')).toBeNull();
    // Bar Aguirre: ni siquiera tiene relación (nunca fue) → no se ve.
    expect(screen.queryByText('Bar Aguirre')).toBeNull();
  });
});
