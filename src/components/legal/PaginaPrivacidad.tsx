import PaginaLegal from './PaginaLegal';
import contenido from '../../../docs/PRIVACIDAD.md?raw';

/** Wrapper propio para que el `?raw` del .md (y `markdown-to-jsx`) solo se descarguen cuando
 * alguien realmente visita `?legal=privacidad` — ver el `lazy()` en main.tsx. */
export default function PaginaPrivacidad() {
  return <PaginaLegal contenido={contenido} />;
}
