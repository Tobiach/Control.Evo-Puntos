/**
 * Comparte texto con la Web Share API real del navegador; si no está disponible o el usuario
 * cancela, cae a copiar al portapapeles. Devuelve true cuando terminó copiando (para mostrar
 * el feedback "copiado"). Mismo patrón usado para el código de referido y para compartir logros.
 */
export async function compartir(texto: string, aCopiar: string = texto): Promise<boolean> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: texto });
      return false;
    } catch {
      // El usuario canceló o el navegador no completó la acción: caemos al portapapeles.
    }
  }
  try {
    await navigator.clipboard.writeText(aCopiar);
    return true;
  } catch {
    // Sin acceso al portapapeles: no rompemos la demo.
    return false;
  }
}
