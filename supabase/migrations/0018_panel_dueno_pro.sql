-- Premia.ar — Panel operativo del dueño (fase C): habilita lectura real de lo que faltaba.
-- Dos problemas de RLS encontrados al auditar antes de escribir código (mismo patrón que
-- 0006_crm_clientes_del_negocio: RLS bloquea joins embebidos aunque el dueño sea legítimo):
--   1. `referidos` y `desafios_amigos` no tienen ninguna policy para que el DUEÑO los lea
--      (solo el cliente participante) — se agregan 2 policies de SELECT, mismo criterio que
--      ya usan `visitas`/`relaciones_negocio`.
--   2. El copiloto de acciones necesita nombre de cliente junto a puntos por vencer y
--      referidos a un paso de convertir — igual que en 0006, un SELECT directo del dueño NO
--      trae el nombre (RLS de `clientes` es auth.uid() = user_id). Nueva RPC SECURITY DEFINER.
-- Backup antes de correr en producción.

-- ============================================================
-- 1. El dueño lee referidos y desafíos de SU negocio
-- ============================================================

CREATE POLICY "El dueño ve los referidos de su negocio" ON referidos
  FOR SELECT USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE POLICY "El dueño ve los desafíos de su negocio" ON desafios_amigos
  FOR SELECT USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

-- ============================================================
-- 2. clientes_del_negocio (0006): se agrega visitas/valor/recompensas usadas —
--    todo lo que el CRM completo necesita para no quedar en una tabla plana.
-- ============================================================

CREATE OR REPLACE FUNCTION clientes_del_negocio(p_negocio_id TEXT)
RETURNS TABLE (
  cliente_id UUID,
  nombre TEXT,
  telefono TEXT,
  puntos INT,
  ultima_visita_at TIMESTAMPTZ,
  cantidad_visitas BIGINT,
  valor_total NUMERIC,
  recompensas_usadas BIGINT
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
    COALESCE(k.cantidad, 0) AS recompensas_usadas
  FROM relaciones_negocio r
  JOIN clientes c ON c.id = r.cliente_id
  LEFT JOIN (
    SELECT cliente_id, COUNT(*) AS cantidad, SUM(monto) AS total
    FROM visitas
    WHERE negocio_id = p_negocio_id
    GROUP BY cliente_id
  ) v ON v.cliente_id = r.cliente_id
  LEFT JOIN (
    SELECT cliente_id, COUNT(*) AS cantidad
    FROM canjes
    WHERE negocio_id = p_negocio_id
    GROUP BY cliente_id
  ) k ON k.cliente_id = r.cliente_id
  WHERE r.negocio_id = p_negocio_id
  ORDER BY r.ultima_visita_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION clientes_del_negocio(TEXT) TO authenticated;

-- ============================================================
-- 3. Copiloto de acciones reales (puntos por vencer + referidos a un paso), con nombre.
-- ============================================================

CREATE OR REPLACE FUNCTION panel_acciones_reales(p_negocio_id TEXT)
RETURNS TABLE (
  tipo TEXT,               -- 'puntos_por_vencer' | 'referido_a_un_paso'
  cliente_nombre TEXT,
  puntos INT,              -- solo puntos_por_vencer
  dias_restantes INT,      -- solo puntos_por_vencer
  visitas_faltantes INT    -- solo referido_a_un_paso (siempre 1, hoy; se deja explícito por si el umbral cambia)
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
    'puntos_por_vencer'::TEXT,
    c.nombre,
    r.puntos,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (r.puntos_vencen_at - NOW())) / 86400))::INT,
    NULL::INT
  FROM relaciones_negocio r
  JOIN clientes c ON c.id = r.cliente_id
  WHERE r.negocio_id = p_negocio_id
    AND r.puntos_vencen_at IS NOT NULL
    AND r.puntos_vencen_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND r.puntos > 0
  ORDER BY r.puntos DESC;

  RETURN QUERY
  SELECT
    'referido_a_un_paso'::TEXT,
    c.nombre,
    NULL::INT,
    NULL::INT,
    (4 - COUNT(v.id))::INT
  FROM referidos ref
  JOIN clientes c ON c.id = ref.referido_cliente_id
  LEFT JOIN visitas v ON v.cliente_id = ref.referido_cliente_id AND v.negocio_id = ref.negocio_id
  WHERE ref.negocio_id = p_negocio_id
    AND ref.premiado_at IS NULL
  GROUP BY ref.referido_cliente_id, c.nombre -- agrupar por id, no solo por nombre: dos clientes distintos pueden llamarse igual
  HAVING COUNT(v.id) = 3; -- a una sola visita de las 4 que premian (ver 0008_referidos.sql)
END;
$$;

GRANT EXECUTE ON FUNCTION panel_acciones_reales(TEXT) TO authenticated;
