-- Control.Evo — CRM del dueño: listar los clientes de su propio negocio
--
-- Problema de RLS: el dueño necesita ver nombre + teléfono de cada cliente que sumó
-- puntos en su local. Pero la policy de `clientes` es `auth.uid() = user_id` (solo el
-- propio cliente ve su fila), así que:
--   - un SELECT directo a `clientes` desde la sesión del dueño no devuelve nada;
--   - un join embebido de PostgREST (`relaciones_negocio?select=...,clientes(nombre,telefono)`)
--     tampoco sirve: RLS se aplica también sobre el recurso EMBEBIDO, y el dueño no es
--     el dueño de esas filas de `clientes`, así que vienen en null.
--
-- Solución (mismo patrón que `cobrar_con_pin` / `verificar_pin_cajero`): una función
-- SECURITY DEFINER que corre con los privilegios de quien la crea, valida del lado del
-- servidor que quien llama sea el dueño del negocio, y recién ahí devuelve el join ya
-- armado. Nunca expone clientes de otros negocios. Backup antes de correr en producción.

CREATE OR REPLACE FUNCTION clientes_del_negocio(p_negocio_id TEXT)
RETURNS TABLE (
  cliente_id UUID,
  nombre TEXT,
  telefono TEXT,
  puntos INT,
  ultima_visita_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Autorización: solo el dueño del negocio puede listar sus clientes.
  IF auth.uid() IS NULL
     OR auth.uid() <> (SELECT n.dueno_user_id FROM negocios n WHERE n.id = p_negocio_id) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  RETURN QUERY
  SELECT c.id, c.nombre, c.telefono, r.puntos, r.ultima_visita_at
  FROM relaciones_negocio r
  JOIN clientes c ON c.id = r.cliente_id
  WHERE r.negocio_id = p_negocio_id
  ORDER BY r.ultima_visita_at DESC NULLS LAST;
END;
$$;

-- Solo el dueño (con sesión de Auth) la ejecuta; el cajero anónimo no la necesita.
GRANT EXECUTE ON FUNCTION clientes_del_negocio(TEXT) TO authenticated;
