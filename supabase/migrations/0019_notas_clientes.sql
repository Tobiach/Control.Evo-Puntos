-- Premia.ar — Notas y etiquetas del CRM (pendiente real desde la fase C del panel del dueño).
-- `relaciones_negocio` ya es 1 fila por cliente-por-negocio (PK compuesta) y el dueño ya
-- tiene policy de UPDATE sobre sus propias filas (0001_schema.sql) — no hace falta RLS
-- nueva, solo las 2 columnas. La escritura igual pasa por una RPC (no UPDATE directo desde
-- el cliente) para mantener el mismo patrón que el resto del panel (ver 0016/0017).
-- Backup antes de correr en producción.

ALTER TABLE relaciones_negocio
  ADD COLUMN IF NOT EXISTS nota TEXT,
  ADD COLUMN IF NOT EXISTS etiquetas TEXT[] NOT NULL DEFAULT '{}';

-- clientes_del_negocio (0006, extendida en 0018): suma nota + etiquetas a lo que ya trae.
-- Mismo gotcha de siempre: Postgres no permite CREATE OR REPLACE si cambian las columnas
-- de salida (RETURNS TABLE) — hay que borrar la función vieja primero.

DROP FUNCTION IF EXISTS clientes_del_negocio(TEXT);

CREATE OR REPLACE FUNCTION clientes_del_negocio(p_negocio_id TEXT)
RETURNS TABLE (
  cliente_id UUID,
  nombre TEXT,
  telefono TEXT,
  puntos INT,
  ultima_visita_at TIMESTAMPTZ,
  cantidad_visitas BIGINT,
  valor_total NUMERIC,
  recompensas_usadas BIGINT,
  nota TEXT,
  etiquetas TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> (SELECT n.dueno_user_id FROM negocios n WHERE n.id = p_negocio_id) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.nombre,
    c.telefono,
    r.puntos,
    r.ultima_visita_at,
    COALESCE(v.cantidad, 0) AS cantidad_visitas,
    COALESCE(v.total, 0) AS valor_total,
    COALESCE(k.cantidad, 0) AS recompensas_usadas,
    r.nota,
    r.etiquetas
  FROM relaciones_negocio r
  JOIN clientes c ON c.id = r.cliente_id
  LEFT JOIN (
    SELECT visitas.cliente_id AS cid, COUNT(*) AS cantidad, SUM(monto) AS total
    FROM visitas
    WHERE negocio_id = p_negocio_id
    GROUP BY visitas.cliente_id
  ) v ON v.cid = r.cliente_id
  LEFT JOIN (
    SELECT canjes.cliente_id AS cid, COUNT(*) AS cantidad
    FROM canjes
    WHERE negocio_id = p_negocio_id
    GROUP BY canjes.cliente_id
  ) k ON k.cid = r.cliente_id
  WHERE r.negocio_id = p_negocio_id
  ORDER BY r.ultima_visita_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION clientes_del_negocio(TEXT) TO authenticated;

-- Guarda nota + etiquetas de UN cliente en el negocio del dueño autenticado.
-- Etiquetas libres (no hay catálogo fijo todavía) — el dueño escribe las suyas.

CREATE OR REPLACE FUNCTION actualizar_nota_cliente(
  p_negocio_id TEXT,
  p_cliente_id UUID,
  p_nota TEXT,
  p_etiquetas TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> (SELECT n.dueno_user_id FROM negocios n WHERE n.id = p_negocio_id) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;

  UPDATE relaciones_negocio
  SET nota = NULLIF(BTRIM(p_nota), ''),
      etiquetas = COALESCE(p_etiquetas, '{}')
  WHERE negocio_id = p_negocio_id
    AND cliente_id = p_cliente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION actualizar_nota_cliente(TEXT, UUID, TEXT, TEXT[]) TO authenticated;
