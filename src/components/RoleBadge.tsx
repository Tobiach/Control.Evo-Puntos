import type { LucideIcon } from 'lucide-react';

interface Props {
  icono: LucideIcon;
  texto: string;
}

export default function RoleBadge({ icono: Icono, texto }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-premio-suave px-3 py-1 text-xs font-semibold text-acento">
      <Icono size={13} strokeWidth={2.5} />
      {texto}
    </span>
  );
}
