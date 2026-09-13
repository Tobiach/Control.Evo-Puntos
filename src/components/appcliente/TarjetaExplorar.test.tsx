import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Negocio } from '../../data/negocios';
import TarjetaExplorar from './TarjetaExplorar';

const negocioBase: Negocio = {
  id: 'test-negocio',
  nombre: 'Test Café',
  categoria: 'Cafetería',
  rubro: 'cafeteria',
  emoji: '☕',
  lat: -34.58,
  lng: -58.43,
  clientesActivos: 10,
  fechaAlta: '2026-01-01',
  recompensas: [
    { pts: 120, descripcion: 'Café de especialidad', categoria: 'Bebidas' },
    { pts: 400, descripcion: 'Brunch completo', categoria: 'Comida' },
  ],
};

describe('TarjetaExplorar — G2 premio visible', () => {
  it('muestra el nombre de la recompensa ya alcanzable, no solo el progreso', () => {
    render(
      <TarjetaExplorar
        negocio={negocioBase}
        relacion={{ puntos: 150, ultimaVisitaDias: 1, historial: [] }}
        activo={false}
        onAbrir={vi.fn()}
      />,
    );
    // El pill antepone el emoji 🎁 al nombre cuando ya es canjeable, en el mismo nodo.
    expect(screen.getByText(/Café de especialidad/)).toBeInTheDocument();
  });

  it('sin puntos suficientes, muestra la próxima recompensa como meta', () => {
    render(
      <TarjetaExplorar
        negocio={negocioBase}
        relacion={{ puntos: 30, ultimaVisitaDias: 1, historial: [] }}
        activo={false}
        onAbrir={vi.fn()}
      />,
    );
    expect(screen.getByText('Café de especialidad')).toBeInTheDocument();
  });

  it('sin ninguna relación todavía, igual asoma la primera recompensa como aspiracional', () => {
    render(<TarjetaExplorar negocio={negocioBase} relacion={undefined} activo={false} onAbrir={vi.fn()} />);
    expect(screen.getByText('Café de especialidad')).toBeInTheDocument();
  });
});
