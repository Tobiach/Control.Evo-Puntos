import { useEffect, useRef, useState } from 'react';

/**
 * Cuenta animada hacia `valor` con easing cúbico. Anima desde el valor mostrado ANTERIOR
 * (no siempre desde 0), así sirve tanto para el "sube al entrar" como para un incremento en
 * vivo (ej. el cajero acredita puntos y el total trepa desde donde estaba).
 */
export function useConteoAnimado(valor: number, duracionMs = 900): number {
  const [mostrado, setMostrado] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    const inicio = performance.now();
    const origen = desde.current;
    const rango = valor - origen;
    if (rango === 0) return;

    let raf = 0;
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracionMs);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      const actual = Math.round(origen + rango * suavizado);
      setMostrado(actual);
      desde.current = actual;
      if (avance < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracionMs]);

  return mostrado;
}
