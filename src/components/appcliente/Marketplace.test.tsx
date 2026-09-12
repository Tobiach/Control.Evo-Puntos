import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NEGOCIOS, RELACIONES_INICIALES, type Negocio } from '../../data/negocios';
import Marketplace from './Marketplace';

const renderMarketplace = () =>
  render(
    <Marketplace
      negocios={NEGOCIOS}
      relaciones={RELACIONES_INICIALES}
      nombreCliente="Martina Gómez"
      esNuevo={false}
      onAbrirNegocio={vi.fn()}
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
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
  });

  it('"Nuevos para vos" muestra, por clientesActivos, negocios sin relación real', () => {
    renderMarketplace();
    expect(screen.getByText('Nuevos para vos')).toBeInTheDocument();
    // Mismo criterio que el componente: el de más clientesActivos entre los que el
    // cliente nunca visitó. No se hardcodea el nombre — se deriva de los datos reales.
    const esperado = [...NEGOCIOS]
      .filter((negocio) => !RELACIONES_INICIALES[negocio.id])
      .sort((a, b) => b.clientesActivos - a.clientesActivos)[0];
    expect(screen.getByText(esperado.nombre)).toBeInTheDocument();
  });

  it('el héroe en tono calmo usa la foto real del negocio como fondo (G8)', () => {
    const negocioConFoto: Negocio = {
      id: 'con-foto',
      nombre: 'Café De Prueba',
      categoria: 'Café',
      rubro: 'cafeteria',
      emoji: '☕',
      lat: -34.58,
      lng: -58.42,
      clientesActivos: 999,
      fechaAlta: '2026-01-01',
      recompensas: [{ pts: 100000, descripcion: 'Lejano', categoria: 'Bebidas' }],
      portadaUrl: '/portadas/cafe-de-prueba.jpg',
    };
    // Sin relaciones → fallback "descubrir" (tono calmo) sobre el único negocio disponible.
    const { container } = render(
      <Marketplace
        negocios={[negocioConFoto]}
        relaciones={{}}
        nombreCliente="Martina Gómez"
        esNuevo
        onAbrirNegocio={vi.fn()}
      />,
    );
    expect(container.querySelector('img[src="/portadas/cafe-de-prueba.jpg"]')).not.toBeNull();
  });

  it('sin héroe posible (sin negocios) no rompe la pantalla', () => {
    render(
      <Marketplace
        negocios={[]}
        relaciones={{}}
        nombreCliente="Martina Gómez"
        esNuevo
        onAbrirNegocio={vi.fn()}
      />,
    );
    expect(screen.getByText('Arrancás la partida')).toBeInTheDocument();
  });
});
