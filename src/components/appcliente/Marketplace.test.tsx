import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NEGOCIOS, RELACIONES_INICIALES } from '../../data/negocios';
import Marketplace from './Marketplace';

const renderMarketplace = () =>
  render(
    <Marketplace
      negocios={NEGOCIOS}
      relaciones={RELACIONES_INICIALES}
      nombreCliente="Martina Gómez"
      onAbrirNegocio={vi.fn()}
      onSalir={vi.fn()}
    />,
  );

describe('Marketplace', () => {
  it('muestra todos los locales al inicio', () => {
    renderMarketplace();
    expect(screen.getByText('Café Nardo')).toBeInTheDocument(); // gastro
    expect(screen.getByText('Súper Charcas')).toBeInTheDocument(); // super
  });

  it('filtra por rubro', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Supermercado' }));

    expect(screen.getByText('Almacén Guatemala')).toBeInTheDocument(); // super
    // Los locales gastro salen de la lista tras la animación de salida.
    await waitFor(() => expect(screen.queryByText('Café Nardo')).toBeNull());
  });

  it('filtra por búsqueda de texto (nombre)', async () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o categoría/), {
      target: { value: 'nardo' },
    });

    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Súper Charcas')).toBeNull());
  });

  it('filtra por búsqueda de texto (categoría)', async () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o categoría/), {
      target: { value: 'pizzería' },
    });

    expect(screen.getByText('Fornería Thames')).toBeInTheDocument(); // categoría "Pizzería"
    await waitFor(() => expect(screen.queryByText('Café Nardo')).toBeNull());
  });

  it('avisa cuando no hay coincidencias', () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o categoría/), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText(/No encontramos locales con esa búsqueda/)).toBeInTheDocument();
  });
});
