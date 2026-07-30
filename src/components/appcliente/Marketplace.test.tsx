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
  it('muestra todos los locales al inicio', () => {
    renderMarketplace();
    // Café Nardo tiene relación real (RELACIONES_INICIALES): aparece en "Tu historia
    // reciente" y en la lista completa, duplicación esperada de esa sección.
    expect(screen.getAllByText('Café Nardo').length).toBeGreaterThan(0); // gastro
    // Súper Charcas es #1 en clientesActivos: aparece tanto en "Los más elegidos" como
    // en la lista completa, es la duplicación esperada de esa sección.
    expect(screen.getAllByText('Súper Charcas').length).toBeGreaterThan(0); // super
  });

  it('filtra por rubro', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Súper' }));

    expect(screen.getByText('Almacén Guatemala')).toBeInTheDocument(); // super
    // Los locales gastro salen de la lista tras la animación de salida.
    await waitFor(() => expect(screen.queryByText('Café Nardo')).toBeNull());
  });

  it('filtra por búsqueda de texto (nombre)', async () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar cafés, restaurantes o comercios/), {
      target: { value: 'nardo' },
    });

    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Súper Charcas')).toBeNull());
  });

  it('filtra por búsqueda de texto (categoría)', async () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar cafés, restaurantes o comercios/), {
      target: { value: 'pizzería' },
    });

    expect(screen.getByText('Fornería Thames')).toBeInTheDocument(); // categoría "Pizzería"
    await waitFor(() => expect(screen.queryByText('Café Nardo')).toBeNull());
  });

  it('filtra por intención ("Por Experiencias")', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar algo' }));

    expect(screen.getByText('Bar Aguirre')).toBeInTheDocument(); // categoría "Bar de tragos"
    // Café Nardo (categoría "Café") no aplica a "Tomar algo".
    await waitFor(() => expect(screen.queryByText('Café Nardo')).toBeNull());
  });

  it('"Nuevos para vos" muestra negocios sin relación real', () => {
    renderMarketplace();
    expect(screen.getByText('Nuevos para vos')).toBeInTheDocument();
    // Bar Aguirre no está en RELACIONES_INICIALES: nunca fue.
    expect(screen.getAllByText('Bar Aguirre').length).toBeGreaterThan(0);
  });

  it('"Premia recomienda" muestra solo negocios con historiaCorta cargada', () => {
    renderMarketplace();
    expect(screen.getByText('Premia recomienda')).toBeInTheDocument();
    expect(screen.getByText('Una mesa donde nadie mira el reloj.')).toBeInTheDocument();
  });

  it('"Tu historia reciente" muestra visitas reales cruzadas', () => {
    renderMarketplace();
    expect(screen.getByText('Tu historia reciente')).toBeInTheDocument();
    // Café Nardo tiene historial real en RELACIONES_INICIALES.
    expect(screen.getAllByText('Café Nardo').length).toBeGreaterThan(0);
  });

  it('las secciones curadas desaparecen al filtrar o buscar', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Súper' }));
    await waitFor(() => expect(screen.queryByText('Nuevos para vos')).toBeNull());
    expect(screen.queryByText('Premia recomienda')).toBeNull();
    expect(screen.queryByText('Tu historia reciente')).toBeNull();
  });

  it('avisa cuando no hay coincidencias', () => {
    renderMarketplace();
    fireEvent.change(screen.getByPlaceholderText(/Buscar cafés, restaurantes o comercios/), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText(/No encontramos locales con esa búsqueda/)).toBeInTheDocument();
  });
});
