import PaginaLegal from './PaginaLegal';
import contenido from '../../../docs/TERMINOS.md?raw';

/** Wrapper propio para que el `?raw` del .md (y `markdown-to-jsx`) solo se descarguen cuando
 * alguien realmente visita `?legal=terminos` — ver el `lazy()` en main.tsx. */
export default function PaginaTerminos() {
  return <PaginaLegal contenido={contenido} />;
}
