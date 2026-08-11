import { useEffect, type RefObject } from 'react';

// Módulo-level: sobrevive a que el componente se desmonte y vuelva a montar (exactamente lo
// que pasa hoy al entrar/salir de un negocio o cambiar de sección) — un useState/useRef local
// no serviría porque se pierde junto con el componente.
const posiciones = new Map<string, number>();

/**
 * Recuerda y restaura la posición de scroll de un contenedor (o de la ventana, si no se pasa
 * `ref`) por `clave`. Sin esto, volver atrás a una lista larga (scrolleada) la deja arriba de
 * todo en vez de donde estaba — el comportamiento que un usuario espera de cualquier app real.
 */
export function useScrollRestoration(clave: string, ref?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref?.current ?? null;
    const posicionGuardada = posiciones.get(clave) ?? 0;
    if (el) el.scrollTop = posicionGuardada;
    else window.scrollTo(0, posicionGuardada);

    const objetivo: HTMLElement | Window = el ?? window;
    const onScroll = () => {
      posiciones.set(clave, el ? el.scrollTop : window.scrollY);
    };
    objetivo.addEventListener('scroll', onScroll, { passive: true });
    return () => objetivo.removeEventListener('scroll', onScroll);
  }, [clave, ref]);
}
