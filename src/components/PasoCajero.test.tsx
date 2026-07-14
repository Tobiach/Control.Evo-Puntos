import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DATA_RUBROS, type Cliente } from '../data/mockClientes';
import PasoCajero from './PasoCajero';

const gastro = DATA_RUBROS.gastro;
const clientes = (): Cliente[] => gastro.clientes.map((c) => ({ ...c }));

describe('PasoCajero (modo demo)', () => {
  it('acredita los puntos correctos al cliente elegido', () => {
    const onAcreditar = vi.fn();
    render(
      <PasoCajero
        data={gastro}
        clientes={clientes()}
        clienteActivo={null}
        onAcreditar={onAcreditar}
      />,
    );

    // Cargar el monto: $4.500 → 45 puntos (1 punto cada $100).
    const montoInput = screen.getByPlaceholderText('4.500');
    fireEvent.change(montoInput, { target: { value: '4500' } });
    expect(screen.getByText('= 45 puntos para el cliente')).toBeInTheDocument();

    // Elegir al cliente por nombre.
    fireEvent.change(screen.getByPlaceholderText('Teléfono o nombre'), {
      target: { value: 'Martina' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Martina Gómez/ }));

    // Confirmar el cobro.
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(onAcreditar).toHaveBeenCalledTimes(1);
    expect(onAcreditar).toHaveBeenCalledWith('g1', 45);
  });

  it('no permite cobrar sin monto', () => {
    const onAcreditar = vi.fn();
    render(
      <PasoCajero
        data={gastro}
        clientes={clientes()}
        clienteActivo={gastro.clientes[0]}
        onAcreditar={onAcreditar}
      />,
    );

    // Cliente ya seleccionado (clienteActivo) pero sin monto → botón deshabilitado.
    const confirmar = screen.getByRole('button', { name: 'Confirmar cobro' });
    expect(confirmar).toBeDisabled();
    fireEvent.click(confirmar);
    expect(onAcreditar).not.toHaveBeenCalled();
  });
});
