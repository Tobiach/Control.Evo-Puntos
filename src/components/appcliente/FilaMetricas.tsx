import { formatPuntos } from '../../lib/club';

interface Metrica {
  valor: number;
  label: string;
  color: string;
}

/** Fila de 3 métricas equilibradas — mismo patrón visual en Mis Premios y Perfil. */
export default function FilaMetricas({ metricas }: { metricas: Metrica[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {metricas.map(({ valor, label, color }) => (
        <div key={label} className="rounded-2xl bg-fondo-medio px-2 py-2.5 text-center">
          <p className={`font-titulo text-lg font-extrabold ${color}`}>{formatPuntos(valor)}</p>
          <p className="text-[9px] font-bold tracking-[0.06em] text-texto-muted uppercase">{label}</p>
        </div>
      ))}
    </div>
  );
}
