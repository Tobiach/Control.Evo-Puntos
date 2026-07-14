import confetti from 'canvas-confetti';

const COLORES = ['#C9973A', '#E5B860', '#8B5CF6', '#EC4899', '#0EA5E9', '#F97316'];

/**
 * Explosión de confetti al desbloquear una insignia o completar la temporada.
 * `origin` en coordenadas relativas (0-1); por defecto un poco arriba del centro.
 */
export function lanzarConfetti(origin: { x: number; y: number } = { x: 0.5, y: 0.42 }): void {
  confetti({
    particleCount: 90,
    spread: 72,
    startVelocity: 38,
    origin,
    colors: COLORES,
    disableForReducedMotion: true,
  });
}
