import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DATA_RUBROS, type Cliente } from '../../data/mockClientes';
import TabRecompensas from './TabRecompensas';

const gastro = DATA_RUBROS.gastro;

const cliente = (puntos: number): Cliente => ({
  id: 'g1',
  nombre: 'Martina Gómez',
  telefono: '11 5320-4471',
  puntos,
  ultimaVisitaDias: 2,
});

describe('TabRecompensas', () => {
  it('canjea la recompensa con el costo de puntos correcto y muestra el comprobante', () => {
    const onCanjear = vi.fn();
    // Con 1300 pts el cliente alcanza todas: la primera de la lista es "Cocktail de bienvenida" (150).
    render(<TabRecompensas data={gastro} cliente={cliente(1300)} onCanjear={onCanjear} />);

    const botones = screen.getAllByRole('button', { name: 'Canjear' });
    fireEvent.click(botones[0]);

    expect(onCanjear).toHaveBeenCalledTimes(1);
    expect(onCanjear).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: 'Cocktail de bienvenida', pts: 150 }),
    );
    expect(screen.getByText('¡Canje exitoso!')).toBeInTheDocument();
  });

  it('no deja canjear recompensas que el cliente no puede pagar', () => {
    const onCanjear = vi.fn();
    // Con 100 pts no llega a ninguna recompensa (la más barata es 150).
    render(<TabRecompensas data={gastro} cliente={cliente(100)} onCanjear={onCanjear} />);

    expect(screen.queryByRole('button', { name: 'Canjear' })).toBeNull();
    expect(screen.getAllByText(/Te faltan/).length).toBeGreaterThan(0);
  });

  it('filtra las recompensas por categoría', async () => {
    const onCanjear = vi.fn();
    render(<TabRecompensas data={gastro} cliente={cliente(1300)} onCanjear={onCanjear} />);

    // Al inicio ("Todas") se ve una recompensa de Comida.
    expect(screen.getByText('Entrada a elección')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.getByText('Cocktail de bienvenida')).toBeInTheDocument(); // Bebidas
    // La recompensa de Comida sale de la lista (tras la animación de salida).
    await waitFor(() => expect(screen.queryByText('Entrada a elección')).toBeNull());
  });
});
