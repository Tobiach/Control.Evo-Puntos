// Efectos de sonido de la app del cliente. Sintetizados en tiempo real con Web Audio API —
// sin archivos de audio ni dependencias nuevas. Todo corre dentro del gesto de click que lo
// dispara (requisito de Safari/iOS para poder sonar).

let contextoAudio: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!contextoAudio) contextoAudio = new AudioContext();
  if (contextoAudio.state === 'suspended') void contextoAudio.resume();
  return contextoAudio;
}

/** Buffer de ruido blanco de `duracionMs`, para darle textura mecánica a los ticks. */
function bufferRuido(audio: AudioContext, duracionMs: number): AudioBuffer {
  const frames = Math.max(1, Math.floor((duracionMs / 1000) * audio.sampleRate));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) datos[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Un "tick" mecánico corto: ruido filtrado en banda + envolvente rápida de volumen. */
function tick(audio: AudioContext, cuando: number, volumen: number, frecuencia: number): void {
  const fuente = audio.createBufferSource();
  fuente.buffer = bufferRuido(audio, 18);
  const filtro = audio.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = frecuencia;
  filtro.Q.value = 6;
  const ganancia = audio.createGain();
  ganancia.gain.setValueAtTime(volumen, cuando);
  ganancia.gain.exponentialRampToValueAtTime(0.001, cuando + 0.05);
  fuente.connect(filtro).connect(ganancia).connect(audio.destination);
  fuente.start(cuando);
  fuente.stop(cuando + 0.06);
}

/**
 * Sonido de la ruleta girando: una serie de ticks mecánicos que se van espaciando, como si
 * pasaran clavijas — imita la desaceleración de la rueda (mismo criterio visual que su curva
 * de easing, sin acoplarse a los grados exactos). Llamar al mismo tiempo que arranca el giro.
 */
export function sonidoRuletaGirando(duracionMs: number): void {
  const audio = contexto();
  if (!audio) return;
  const inicio = audio.currentTime + 0.02;
  let acumulado = 0;
  let intervalo = 0.045;
  let intentos = 0;
  while (acumulado < duracionMs / 1000 - 0.15 && intentos < 60) {
    tick(audio, inicio + acumulado, 0.14, 2200);
    acumulado += intervalo;
    intervalo *= 1.09; // la rueda "frena": cada tick tarda un poco más que el anterior
    intentos += 1;
  }
}

/**
 * Chasquido al revelar la recompensa sorpresa: un "snap" seco (barrido de tono descendente
 * muy rápido) + una chispa de brillos agudos ascendentes justo después — pensado para el
 * momento de "revelar algo", no un click genérico.
 */
export function sonidoChasquido(): void {
  const audio = contexto();
  if (!audio) return;
  const inicio = audio.currentTime;

  const snap = audio.createOscillator();
  snap.type = 'triangle';
  snap.frequency.setValueAtTime(1200, inicio);
  snap.frequency.exponentialRampToValueAtTime(80, inicio + 0.08);
  const gananciaSnap = audio.createGain();
  gananciaSnap.gain.setValueAtTime(0.22, inicio);
  gananciaSnap.gain.exponentialRampToValueAtTime(0.001, inicio + 0.1);
  snap.connect(gananciaSnap).connect(audio.destination);
  snap.start(inicio);
  snap.stop(inicio + 0.12);

  const notas = [1400, 1800, 2200, 2600];
  notas.forEach((frecuencia, indice) => {
    const cuando = inicio + 0.06 + indice * 0.035;
    const brillo = audio.createOscillator();
    brillo.type = 'sine';
    brillo.frequency.value = frecuencia;
    const ganancia = audio.createGain();
    ganancia.gain.setValueAtTime(0.09, cuando);
    ganancia.gain.exponentialRampToValueAtTime(0.001, cuando + 0.09);
    brillo.connect(ganancia).connect(audio.destination);
    brillo.start(cuando);
    brillo.stop(cuando + 0.1);
  });
}
