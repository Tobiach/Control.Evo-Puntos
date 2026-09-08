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
      esNuevo={false}
      onAbrirNegocio={vi.fn()}
      onIrAMapa={vi.fn()}
    />,
  );

describe('Marketplace', () => {
  it('muestra un héroe con la señal más urgente entre todos los locales', () => {
    renderMarketplace();
    // RELACIONES_INICIALES: Rooftop Malabia tiene 95 pts y última visita hace 47 días
    // → los puntos vencen en 13 días, es la señal de mayor prioridad.
    expect(screen.getByText(/Rooftop Malabia vencen/)).toBeInTheDocument();
  });

  it('"Tus lugares" lista los negocios donde el cliente ya tiene relación', () => {
    renderMarketplace();
    expect(screen.getByText('Tus lugares')).toBeInTheDocument();
    // Café Nardo tiene relación real: aparece en "Tus lugares" y también en la lista completa.
    expect(screen.getAllByText('Café Nardo').length).toBeGreaterThan(0);
  });

  it('"Nuevos para vos" muestra negocios sin relación real', () => {
    renderMarketplace();
    expect(screen.getByText('Nuevos para vos')).toBeInTheDocument();
    // Bar Aguirre no está en RELACIONES_INICIALES.
    expect(screen.getAllByText('Bar Aguirre').length).toBeGreaterThan(0);
  });

  it('lista todos los locales abajo', () => {
    renderMarketplace();
    expect(screen.getByText('Todos los locales')).toBeInTheDocument();
    expect(screen.getAllByText('Súper Charcas').length).toBeGreaterThan(0);
  });

  it('filtra por rubro', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Súper' }));
    expect(screen.getByText('Almacén Guatemala')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Fornería Thames')).toBeNull());
  });

  it('filtra por búsqueda de texto (nombre y categoría)', async () => {
    renderMarketplace();
    const input = screen.getByPlaceholderText(/Buscar por nombre o rubro/);

    fireEvent.change(input, { target: { value: 'nardo' } });
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Súper Charcas')).toBeNull());

    fireEvent.change(input, { target: { value: 'pizzería' } });
    expect(screen.getByText('Fornería Thames')).toBeInTheDocument();
  });

  it('el héroe y las secciones curadas desaparecen al buscar o filtrar', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Súper' }));
    await waitFor(() => expect(screen.queryByText('Tus lugares')).toBeNull());
    expect(screen.queryByText('Nuevos para vos')).toBeNull();
    expect(screen.queryByText(/Rooftop Malabia vencen/)).toBeNull();
  });

  it('avisa cuando no hay coincidencias', () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o rubro/), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText(/No encontramos locales con esa búsqueda/)).toBeInTheDocument();
  });
});
