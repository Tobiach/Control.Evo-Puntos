import Markdown from 'markdown-to-jsx';

interface Props {
  contenido: string;
}

/**
 * Renderiza un documento legal (Términos, Privacidad) directo desde su .md en `docs/` —
 * sin duplicar el texto en JSX, para que no se desincronice cuando se edite el .md. Se monta
 * desde main.tsx cuando la URL trae `?legal=terminos` o `?legal=privacidad`, mismo criterio
 * que `?carta=<negocioId>`: pública, sin login, antes de cualquier chequeo de auth o rubro.
 */
export default function PaginaLegal({ contenido }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-5 py-8">
      <Markdown
        options={{
          overrides: {
            h1: { props: { className: 'text-xl font-bold tracking-tight' } },
            h2: { props: { className: 'mt-3 text-base font-bold tracking-tight' } },
            p: { props: { className: 'text-sm leading-relaxed text-texto-muted' } },
            ul: { props: { className: 'flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-texto-muted [list-style:disc]' } },
            li: { props: { className: 'pl-1' } },
            strong: { props: { className: 'font-bold text-texto' } },
            em: { props: { className: 'text-texto-muted' } },
            a: { props: { className: 'font-semibold text-acento underline underline-offset-2' } },
            blockquote: {
              props: {
                className:
                  'rounded-2xl border border-borde bg-card px-4 py-3 text-xs leading-relaxed text-texto-muted',
              },
            },
            hr: { props: { className: 'my-2 border-borde' } },
          },
        }}
      >
        {contenido}
      </Markdown>
    </div>
  );
}
