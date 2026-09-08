import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreminEvoluciono from './PreminEvoluciono';

vi.mock('../../lib/confetti', () => ({ lanzarConfetti: vi.fn() }));

const evo = { nivelNombre: 'Habitué', premin: '/premin.png' };

describe('PreminEvoluciono', () => {
  it('muestra la forma nueva y el nombre del nivel alcanzado', () => {
    render(<PreminEvoluciono evolucion={evo} onCerrar={vi.fn()} />);
    expect(screen.getByText('¡Premín evolucionó!')).toBeInTheDocument();
    expect(screen.getByText('Habitué')).toBeInTheDocument();
    expect(screen.getByAltText('Premín — Habitué')).toBeInTheDocument();
  });

  it('no renderiza nada sin evolución', () => {
    const { container } = render(<PreminEvoluciono evolucion={null} onCerrar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('se cierra con "Seguir"', () => {
    const onCerrar = vi.fn();
    render(<PreminEvoluciono evolucion={evo} onCerrar={onCerrar} />);
    fireEvent.click(screen.getByText('Seguir'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
