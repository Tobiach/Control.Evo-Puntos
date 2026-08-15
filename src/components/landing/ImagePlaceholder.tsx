import { ImageIcon } from 'lucide-react';

interface Props {
  /** Qué imagen va acá — se usa como el prompt base cuando se genere con GPT. */
  descripcion: string;
  aspecto?: string;
  className?: string;
}

/**
 * Marca visual de "acá va una imagen real" — nunca un mockup falso ni un stock genérico.
 * Se reemplaza por la imagen generada en GPT sin tocar el layout de alrededor.
 */
export default function ImagePlaceholder({ descripcion, aspecto = 'aspect-[4/5]', className = '' }: Props) {
  return (
    <div
      className={`relative ${aspecto} w-full overflow-hidden rounded-3xl border-2 border-dashed border-acento/40 bg-acento-suave/40 flex flex-col items-center justify-center gap-3 px-8 text-center ${className}`}
    >
      <ImageIcon size={26} className="text-acento" />
      <p className="text-xs font-semibold leading-relaxed text-texto-muted">{descripcion}</p>
    </div>
  );
}
