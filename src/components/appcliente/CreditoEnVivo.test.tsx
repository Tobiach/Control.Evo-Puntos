import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreditoEnVivo, { type CreditoReciente } from './CreditoEnVivo';

vi.mock('../../lib/confetti', () => ({ lanzarConfetti: vi.fn() }));

const base: CreditoReciente = {
  negocioNombre: 'Café Nardo',
  delta: 40,
  puntosTotales: 220,
  proxima: { descripcion: 'Café de especialidad', pts: 300 },
};

describe('CreditoEnVivo', () => {
  it('muestra el delta, el negocio y la distancia a la próxima recompensa', () => {
    render(<CreditoEnVivo credito={base} onCerrar={vi.fn()} />);
    expect(screen.getByText('+40 pts')).toBeInTheDocument();
    expect(screen.getByText('en Café Nardo')).toBeInTheDocument();
    expect(screen.getByText(/Te faltan/)).toHaveTextContent('80 pts');
    expect(screen.getByText('Café de especialidad')).toBeInTheDocument();
  });

  it('cuando ya alcanza todas las recompensas, invita a canjear', () => {
    render(<CreditoEnVivo credito={{ ...base, proxima: null }} onCerrar={vi.fn()} />);
    expect(screen.getByText(/Ya te alcanza para tus recompensas/)).toBeInTheDocument();
  });

  it('no renderiza nada sin crédito', () => {
    const { container } = render(<CreditoEnVivo credito={null} onCerrar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('se cierra al tocarlo', () => {
    const onCerrar = vi.fn();
    render(<CreditoEnVivo credito={base} onCerrar={onCerrar} />);
    fireEvent.click(screen.getByText('+40 pts'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra solo pasado el tiempo visible', async () => {
    const onCerrar = vi.fn();
    render(<CreditoEnVivo credito={base} onCerrar={onCerrar} msVisible={20} />);
    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
  });
});
