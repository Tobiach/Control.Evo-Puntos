import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Cliente } from '../../data/mockClientes';
import { NEGOCIOS, RELACIONES_INICIALES } from '../../data/negocios';
import { CLIENTE_INVITADO } from '../../lib/invitado';
import TabPerfilMarketplace from './TabPerfilMarketplace';

const clienteReal: Cliente = {
  id: 'martina',
  nombre: 'Martina Gómez',
  telefono: '11-5555-1234',
  puntos: 0,
  ultimaVisitaDias: 1,
  nacimiento: '07-13',
};

const renderPerfil = (cliente: Cliente) =>
  render(
    <TabPerfilMarketplace
      cliente={cliente}
      negocios={NEGOCIOS}
      relaciones={RELACIONES_INICIALES}
      permisoNotif="default"
      onPedirPermisoNotif={vi.fn()}
      onSalir={vi.fn()}
      onCrearCuenta={vi.fn()}
    />,
  );

describe('TabPerfilMarketplace', () => {
  it('muestra la timeline cruzada de visitas para un cliente real', () => {
    renderPerfil(clienteReal);
    expect(screen.getByText('Tu historia en Premia.ar')).toBeInTheDocument();
    // Café Nardo y Cervecería Soler tienen historial real en RELACIONES_INICIALES.
    expect(screen.getAllByText('Café Nardo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cervecería Soler').length).toBeGreaterThan(0);
  });

  it('no muestra la timeline ni los stats para un invitado', () => {
    renderPerfil(CLIENTE_INVITADO);
    expect(screen.queryByText('Tu historia en Premia.ar')).toBeNull();
    expect(screen.getByText('Navegando sin cuenta')).toBeInTheDocument();
  });

  it('"Mis datos" muestra nombre, teléfono y cumpleaños reales de un cliente', () => {
    renderPerfil(clienteReal);
    fireEvent.click(screen.getByRole('button', { name: /Mis datos/ }));

    expect(screen.getByText('Martina Gómez')).toBeInTheDocument();
    expect(screen.getByText('11-5555-1234')).toBeInTheDocument();
    expect(screen.getByText('13 de julio')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Volver'));
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  it('no ofrece "Mis datos" a un invitado (no hay datos reales que mostrar)', () => {
    renderPerfil(CLIENTE_INVITADO);
    expect(screen.queryByRole('button', { name: /Mis datos/ })).toBeNull();
  });
});
