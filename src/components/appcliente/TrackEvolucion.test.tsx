import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrackEvolucion from './TrackEvolucion';

describe('TrackEvolucion', () => {
  it('muestra las 5 formas y cuánto falta para la próxima evolución', () => {
    render(<TrackEvolucion xpTotal={0} />);
    expect(screen.getByText('Recién Llegado')).toBeInTheDocument();
    expect(screen.getByText('Prócer del Barrio')).toBeInTheDocument();
    expect(
      screen.getByText(/Faltan 200 XP para que Premín evolucione a Cliente Fijo/),
    ).toBeInTheDocument();
  });

  it('el nivel alcanzado va a color y el bloqueado como silueta (alt distinto)', () => {
    render(<TrackEvolucion xpTotal={0} />);
    expect(screen.getByAltText('Premín — Recién Llegado')).toBeInTheDocument();
    expect(screen.getByAltText('Cliente Fijo (bloqueado)')).toBeInTheDocument();
  });

  it('en un nivel intermedio calcula el faltante real', () => {
    render(<TrackEvolucion xpTotal={1295} />);
    expect(
      screen.getByText(/Faltan 1\.705 XP para que Premín evolucione a Cráneo del Barrio/),
    ).toBeInTheDocument();
  });

  it('en el nivel máximo no muestra "faltan"', () => {
    render(<TrackEvolucion xpTotal={9000} />);
    expect(screen.getByText(/forma final/)).toBeInTheDocument();
    expect(screen.queryByText(/Faltan/)).toBeNull();
    expect(screen.getByAltText('Premín — Prócer del Barrio')).toBeInTheDocument();
  });
});
