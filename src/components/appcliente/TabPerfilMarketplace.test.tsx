import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Cliente } from '../../data/mockClientes';
import { NEGOCIOS, RELACIONES_INICIALES } from '../../data/negocios';
import { CLIENTE_INVITADO } from '../../lib/invitado';
import type { CanjeConfirmado } from '../../lib/panelCliente';
import TabPerfilMarketplace from './TabPerfilMarketplace';

const clienteReal: Cliente = {
  id: 'martina',
  nombre: 'Martina Gómez',
  telefono: '11-5555-1234',
  puntos: 0,
  ultimaVisitaDias: 1,
  nacimiento: '07-13',
};

const renderPerfil = (cliente: Cliente, canjesConfirmados: CanjeConfirmado[] = []) =>
  render(
    <TabPerfilMarketplace
      cliente={cliente}
      negocios={NEGOCIOS}
      relaciones={RELACIONES_INICIALES}
      canjesConfirmados={canjesConfirmados}
      permisoNotif="default"
      onPedirPermisoNotif={vi.fn()}
      onSalir={vi.fn()}
      onCrearCuenta={vi.fn()}
      onIrAMisPremios={vi.fn()}
    />,
  );

describe('TabPerfilMarketplace', () => {
  it('muestra Mis lugares con los negocios reales donde el cliente tiene relación', () => {
    renderPerfil(clienteReal);
    expect(screen.getByText('Mis lugares')).toBeInTheDocument();
    // Café Nardo y Cervecería Soler tienen relación real en RELACIONES_INICIALES.
    expect(screen.getByText('Café Nardo')).toBeInTheDocument();
    expect(screen.getByText('Cervecería Soler')).toBeInTheDocument();
  });

  it('calcula el saludo y el nivel a partir de datos reales, no hardcodeados', () => {
    renderPerfil(clienteReal);
    expect(screen.getByText('Hola, Martina 👋')).toBeInTheDocument();
    // xpTotal = 320+720+160+95 = 1295 → nivel "Habitué 🔥" (rango 1000-2999).
    expect(screen.getByText(/Habitué 🔥 · Nivel 3/)).toBeInTheDocument();
  });

  it('"Premios que ya conseguiste" muestra los canjes confirmados reales', () => {
    renderPerfil(clienteReal, [
      { negocioId: 'cafe-nardo', descripcion: 'Café de especialidad', pts: 120, confirmadoAt: '2026-08-01T12:00:00Z' },
    ]);
    expect(screen.getByText('Café de especialidad')).toBeInTheDocument();
    expect(screen.getByText(/Canjeado el/)).toBeInTheDocument();
  });

  it('"Premios que ya conseguiste" muestra estado vacío sin canjes reales', () => {
    renderPerfil(clienteReal, []);
    expect(screen.getByText('Todavía no canjeaste ningún premio.')).toBeInTheDocument();
  });

  it('no muestra progreso, recorrido ni lugares para un invitado', () => {
    renderPerfil(CLIENTE_INVITADO);
    expect(screen.queryByText('Tu recorrido')).toBeNull();
    expect(screen.queryByText('Mis lugares')).toBeNull();
    expect(screen.getByText('Navegando sin cuenta')).toBeInTheDocument();
  });

  it('"Datos personales" muestra nombre, teléfono y cumpleaños reales de un cliente', () => {
    renderPerfil(clienteReal);
    fireEvent.click(screen.getByRole('button', { name: /Datos personales/ }));

    expect(screen.getByText('Martina Gómez')).toBeInTheDocument();
    expect(screen.getByText('11-5555-1234')).toBeInTheDocument();
    expect(screen.getByText('13 de julio')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Volver'));
    expect(screen.getByText('Hola, Martina 👋')).toBeInTheDocument();
  });

  it('no ofrece "Datos personales" a un invitado (no hay datos reales que mostrar)', () => {
    renderPerfil(CLIENTE_INVITADO);
    expect(screen.queryByRole('button', { name: /Datos personales/ })).toBeNull();
  });
});
