import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { Cliente } from '../../data/mockClientes';
import { NEGOCIOS, RELACIONES_INICIALES, type Negocio } from '../../data/negocios';
import Marketplace from './Marketplace';

const CLIENTE_TEST: Cliente = {
  id: 'cliente-test',
  nombre: 'Martina Gómez',
  telefono: '11 5555-0000',
  puntos: 0,
  ultimaVisitaDias: 0,
};

const renderMarketplace = () =>
  render(
    <Marketplace
      negocios={NEGOCIOS}
      relaciones={RELACIONES_INICIALES}
      cliente={CLIENTE_TEST}
      nombreCliente="Martina Gómez"
      esNuevo={false}
      onAbrirNegocio={vi.fn()}
    />,
  );

describe('Marketplace', () => {
  it('el titular fijo no cambia según el estado del cliente (se eliminó "Arrancás la partida")', () => {
    renderMarketplace();
    expect(screen.getByText('Cada visita te acerca a tu próximo premio.')).toBeInTheDocument();
  });

  it('muestra la señal más urgente entre todos los locales, agrupada como "Premio listo"', () => {
    renderMarketplace();
    // RELACIONES_INICIALES: Rooftop Malabia tiene 95 pts y última visita hace 47 días → los
    // puntos vencen en 13 días, es la señal de mayor prioridad. "vencimiento" agrupa como
    // "listo" (no como "próximo premio") — no se mezclan los dos estados.
    expect(screen.getByText(/Rooftop Malabia vencen/)).toBeInTheDocument();
    // "Premio listo" también puede aparecer como pill en "Tus lugares" para otros negocios
    // canjeables — acá solo nos importa que la insignia del estado exista al menos una vez.
    expect(screen.getAllByText('Premio listo').length).toBeGreaterThan(0);
  });

  it('"Tus lugares" lista los negocios donde el cliente ya tiene relación', () => {
    renderMarketplace();
    const titulo = screen.getByText('Tus lugares');
    // scoped a la sección: "Café Nardo" también puede aparecer en la card de estado si es el
    // negocio destacado — acá solo nos importa que "Tus lugares" lo liste.
    const seccion = titulo.closest('section');
    expect(seccion).not.toBeNull();
    expect(within(seccion as HTMLElement).getByText('Café Nardo')).toBeInTheDocument();
  });

  it('muestra el nivel/XP global (CardNivelXp) cuando el cliente ya tiene actividad', () => {
    renderMarketplace();
    // RELACIONES_INICIALES suma 320+720+160+95 = 1295 XP → nivel "Habitué" (1000-3000).
    expect(screen.getByText('Habitué')).toBeInTheDocument();
  });

  it('ofrece invitar a un amigo cuando el cliente ya tiene un negocio ancla', () => {
    renderMarketplace();
    expect(screen.getByText('Invitá a un amigo')).toBeInTheDocument();
  });

  it('"Descubrí nuevos lugares" muestra, por clientesActivos, negocios sin relación real', () => {
    renderMarketplace();
    expect(screen.getByText('Descubrí nuevos lugares')).toBeInTheDocument();
    // Mismo criterio que el componente: el de más clientesActivos entre los que el
    // cliente nunca visitó. No se hardcodea el nombre — se deriva de los datos reales.
    const esperado = [...NEGOCIOS]
      .filter((negocio) => !RELACIONES_INICIALES[negocio.id])
      .sort((a, b) => b.clientesActivos - a.clientesActivos)[0];
    expect(screen.getByText(esperado.nombre)).toBeInTheDocument();
  });

  it('sin ninguna relación real, agrupa como "Tu próximo premio" y usa la foto real del negocio (G8)', () => {
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
    // Sin relaciones → fallback "descubrir" (grupo "próximo premio") sobre el único negocio
    // disponible.
    const { container } = render(
      <Marketplace
        negocios={[negocioConFoto]}
        relaciones={{}}
        cliente={CLIENTE_TEST}
        nombreCliente="Martina Gómez"
        esNuevo
        onAbrirNegocio={vi.fn()}
      />,
    );
    expect(screen.getByText('Tu próximo premio')).toBeInTheDocument();
    expect(container.querySelector('img[src="/portadas/cafe-de-prueba.jpg"]')).not.toBeNull();
  });

  it('sin héroe posible (sin negocios) no rompe la pantalla', () => {
    render(
      <Marketplace
        negocios={[]}
        relaciones={{}}
        cliente={CLIENTE_TEST}
        nombreCliente="Martina Gómez"
        esNuevo
        onAbrirNegocio={vi.fn()}
      />,
    );
    expect(screen.getByText('Cada visita te acerca a tu próximo premio.')).toBeInTheDocument();
  });
});
