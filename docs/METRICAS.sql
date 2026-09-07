-- ============================================================================
-- METRICAS.sql — funnel de Premia.ar sobre las tablas que YA existen
-- ----------------------------------------------------------------------------
-- Fase 0.5 del roadmap de experiencia (docs/ROADMAP-PRODUCTO.md).
-- No reemplaza analytics de front-end (clicks, pantallas vistas) — eso llega con
-- PostHog recien cuando haya ~50 usuarios activos/semana. Esto responde las
-- preguntas de comportamiento que el modelo de datos ya registra.
--
-- Cómo se usa: pegar cada bloque en el SQL Editor de Supabase (solo lectura) y
-- correrlo una vez por semana. Anotar los números en algún lado fijo para ver la
-- tendencia — el valor está en la serie, no en el dato suelto.
--
-- Nombres de columna asumidos a partir de src/lib/panelCliente.ts. Si alguna
-- query falla por una columna, verificar el esquema real (\d visitas, etc.) y
-- ajustar — el esquema NO está versionado completo en este repo.
-- ============================================================================


-- 1) Pulso semanal: visitas y canjes confirmados por semana (últimas 12) ------
--    La línea de vida del producto. Si esto no sube, nada más importa.
SELECT
  date_trunc('week', v.created_at)::date          AS semana,
  count(*)                                        AS visitas,
  count(DISTINCT v.cliente_id)                    AS clientes_que_visitaron
FROM visitas v
WHERE v.created_at >= now() - interval '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;

SELECT
  date_trunc('week', c.confirmado_at)::date       AS semana,
  count(*)                                        AS canjes_confirmados,
  count(DISTINCT c.cliente_id)                    AS clientes_que_canjearon
FROM canjes c
WHERE c.estado = 'confirmado'
  AND c.confirmado_at >= now() - interval '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;


-- 2) Activación: ¿la gente vuelve? ------------------------------------------
--    De todos los clientes con al menos 1 visita, qué % tiene 2+ (en cualquier
--    negocio). Es la métrica más honesta de si Premia genera recurrencia.
WITH por_cliente AS (
  SELECT cliente_id, count(*) AS visitas
  FROM visitas
  GROUP BY cliente_id
)
SELECT
  count(*)                                              AS clientes_con_1_visita_o_mas,
  count(*) FILTER (WHERE visitas >= 2)                  AS clientes_con_2_visitas_o_mas,
  round(100.0 * count(*) FILTER (WHERE visitas >= 2) / nullif(count(*), 0), 1) AS pct_segunda_visita
FROM por_cliente;


-- 3) Cuánto tarda la segunda visita ---------------------------------------
--    Días entre la 1ra y la 2da visita de cada cliente (mismo o distinto
--    negocio). Percentiles: si la mediana es de semanas, el Home tiene que
--    sostener la motivación en ese hueco (F1) y hace falta reenganche (F2).
WITH ordenadas AS (
  SELECT
    cliente_id,
    created_at,
    row_number() OVER (PARTITION BY cliente_id ORDER BY created_at) AS n
  FROM visitas
),
brecha AS (
  SELECT
    a.cliente_id,
    EXTRACT(epoch FROM (b.created_at - a.created_at)) / 86400.0 AS dias_a_2da
  FROM ordenadas a
  JOIN ordenadas b ON b.cliente_id = a.cliente_id AND a.n = 1 AND b.n = 2
)
SELECT
  count(*)                                                          AS clientes_con_2da_visita,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_a_2da)::numeric, 1) AS mediana_dias,
  round(percentile_cont(0.25) WITHIN GROUP (ORDER BY dias_a_2da)::numeric, 1) AS p25_dias,
  round(percentile_cont(0.75) WITHIN GROUP (ORDER BY dias_a_2da)::numeric, 1) AS p75_dias
FROM brecha;


-- 4) Retorno por negocio ------------------------------------------------
--    De los clientes que fueron 1 vez a un negocio, cuántos volvieron a ESE
--    negocio. Es el número que Premia le tiene que poder mostrar a un dueño.
WITH rel AS (
  SELECT
    v.negocio_id,
    v.cliente_id,
    count(*) AS visitas
  FROM visitas v
  GROUP BY 1, 2
)
SELECT
  negocio_id,
  count(*)                                        AS clientes,
  count(*) FILTER (WHERE visitas >= 2)            AS clientes_que_volvieron,
  round(100.0 * count(*) FILTER (WHERE visitas >= 2) / nullif(count(*), 0), 1) AS pct_retorno
FROM rel
GROUP BY negocio_id
ORDER BY clientes DESC;


-- 5) Lapsados con saldo (candidatos a reenganche — F2) -----------------
--    Clientes con puntos vivos que hace 30+ días que no vuelven a ese negocio.
--    Este es exactamente el disparador con el que arranca la Fase 3.
SELECT
  count(*)                                                          AS relaciones_lapsadas_con_saldo,
  count(DISTINCT cliente_id)                                        AS clientes_afectados,
  sum(puntos)                                                       AS puntos_en_riesgo,
  round(avg(EXTRACT(epoch FROM (now() - ultima_visita_at)) / 86400.0)::numeric, 0) AS dias_promedio_sin_volver
FROM relaciones_negocio
WHERE puntos > 0
  AND ultima_visita_at IS NOT NULL
  AND ultima_visita_at < now() - interval '30 days';


-- 6) Densidad de red (F7): ¿cuántos usan más de un comercio? ----------
--    En cuántos negocios tiene relación cada cliente. Mientras la mayoría esté
--    en 1, Premia es una tarjeta suelta, no una red.
WITH n AS (
  SELECT cliente_id, count(DISTINCT negocio_id) AS negocios
  FROM relaciones_negocio
  WHERE puntos > 0
  GROUP BY cliente_id
)
SELECT
  negocios              AS negocios_por_cliente,
  count(*)              AS cantidad_de_clientes
FROM n
GROUP BY negocios
ORDER BY negocios;


-- 7) Embudo a primer premio -------------------------------------------
--    visita -> relación con puntos -> primer canje confirmado.
SELECT
  (SELECT count(DISTINCT cliente_id) FROM visitas)                                   AS con_al_menos_1_visita,
  (SELECT count(DISTINCT cliente_id) FROM relaciones_negocio WHERE puntos > 0)       AS con_puntos_vivos,
  (SELECT count(DISTINCT cliente_id) FROM canjes WHERE estado = 'confirmado')        AS con_al_menos_1_canje;
