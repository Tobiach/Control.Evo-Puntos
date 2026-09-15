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
  it('muestra un héroe con la señal más urgente entre todos los locales', () => {
    renderMarketplace();
    // RELACIONES_INICIALES: Rooftop Malabia tiene 95 pts y última visita hace 47 días
    // → los puntos vencen en 13 días, es la señal de mayor prioridad.
    expect(screen.getByText(/Rooftop Malabia vencen/)).toBeInTheDocument();
  });

  it('"Tus lugares" lista los negocios donde el cliente ya tiene relación', () => {
    renderMarketplace();
    const titulo = screen.getByText('Tus lugares');
    // scoped a la sección: "Café Nardo" también puede aparecer en "Tu próximo premio" si
    // es el negocio destacado — acá solo nos importa que "Tus lugares" lo liste.
    const seccion = titulo.closest('section');
    expect(seccion).not.toBeNull();
    expect(within(seccion as HTMLElement).getByText('Café Nardo')).toBeInTheDocument();
  });

  it('muestra el nivel/XP global (CardNivelXp) cuando el cliente ya tiene actividad', () => {
    renderMarketplace();
    // RELACIONES_INICIALES suma 320+720+160+95 = 1295 XP → nivel "Habitué" (1000-3000).
    expect(screen.getByText('Habitué')).toBeInTheDocument();
  });

  it('"Tu próximo premio" destaca el mejor premio al alcance, cruzando negocios', () => {
    renderMarketplace();
    expect(screen.getByText('Tu próximo premio')).toBeInTheDocument();
  });

  it('ofrece invitar a un amigo cuando el cliente ya tiene un negocio ancla', () => {
    renderMarketplace();
    expect(screen.getByText('Invitá a un amigo')).toBeInTheDocument();
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
        cliente={CLIENTE_TEST}
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
        cliente={CLIENTE_TEST}
        nombreCliente="Martina Gómez"
        esNuevo
        onAbrirNegocio={vi.fn()}
      />,
    );
    expect(screen.getByText('Arrancás la partida')).toBeInTheDocument();
  });
});
