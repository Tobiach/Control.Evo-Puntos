const DIA_MS = 86_400_000;

/** La ruleta semanal se puede girar una vez cada 7 días (cooldown por tiempo, no por puntos). */
export const COOLDOWN_RULETA_DIAS = 7;

export interface PremioRuleta {
  id: string;
  label: string;
  emoji: string;
  /** Probabilidad relativa: a mayor peso, más seguido cae. Los premios grandes pesan poco. */
  peso: number;
  /** Premio "bueno": dispara confetti al caer. */
  bueno: boolean;
}

/**
 * Pool de premios de la ruleta: más variado que el de la recompensa sorpresa.
 * Los pesos NO son uniformes: la mayoría son premios chicos y el "premio mayor"
 * casi no sale (peso 2 sobre 100), para generar expectativa.
 */
export const PREMIOS_RULETA: PremioRuleta[] = [
  { id: 'pts-30', label: '+30 pts de regalo', emoji: '⭐', peso: 22, bueno: false },
  { id: 'off-5', label: '5% off hoy', emoji: '🏷️', peso: 20, bueno: false },
  { id: 'pts-75', label: '+75 pts de regalo', emoji: '✨', peso: 15, bueno: true },
  { id: '2x1', label: '2x1 en tu próxima visita', emoji: '🍹', peso: 13, bueno: true },
  { id: 'envio', label: 'Envío gratis', emoji: '🛵', peso: 12, bueno: false },
  { id: 'pts-150', label: '+150 pts de regalo', emoji: '🎯', peso: 10, bueno: true },
  { id: 'regalo', label: 'Regalo de la casa', emoji: '🎁', peso: 6, bueno: true },
  { id: 'mayor', label: 'Premio mayor: $10.000 en consumo', emoji: '👑', peso: 2, bueno: true },
];

/**
 * Elige un premio según su peso. `aleatorio` en [0, 1) permite testear de forma determinística
 * (por defecto usa Math.random). Devuelve el premio y su índice en el pool (para ubicar la
 * porción en la rueda).
 */
export function elegirPremio(
  premios: PremioRuleta[] = PREMIOS_RULETA,
  aleatorio: number = Math.random(),
): { premio: PremioRuleta; indice: number } {
  const total = premios.reduce((suma, premio) => suma + premio.peso, 0);
  let objetivo = aleatorio * total;
  for (let i = 0; i < premios.length; i += 1) {
    objetivo -= premios[i].peso;
    if (objetivo < 0) return { premio: premios[i], indice: i };
  }
  const ultimo = premios.length - 1;
  return { premio: premios[ultimo], indice: ultimo };
}

export interface EstadoRuleta {
  puedeGirar: boolean;
  /** Días que faltan para volver a girar (0 si ya está disponible). */
  diasRestantes: number;
}

/** ¿Se puede girar la ruleta? Calcula el cooldown de 7 días desde la última tirada. */
export function estadoCooldown(
  ultimaTirada: number | null | undefined,
  ahora: number = Date.now(),
): EstadoRuleta {
  if (!ultimaTirada) return { puedeGirar: true, diasRestantes: 0 };
  const restanteMs = ultimaTirada + COOLDOWN_RULETA_DIAS * DIA_MS - ahora;
  if (restanteMs <= 0) return { puedeGirar: true, diasRestantes: 0 };
  return { puedeGirar: false, diasRestantes: Math.ceil(restanteMs / DIA_MS) };
}
