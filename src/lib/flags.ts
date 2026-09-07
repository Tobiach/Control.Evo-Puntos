// Flags de producto — retiros reversibles de la Fase 0.4 del roadmap de experiencia
// (ver docs/ROADMAP-PRODUCTO.md y docs/DIAGNOSTICO-PRODUCTO.md, hallazgo F5).
// Poné el valor en `true` para volver a mostrar la feature — no hay más cambios que hacer.

/**
 * Ruleta semanal y recompensa sorpresa en la pantalla de un negocio (`TabInicio`).
 * Apagadas hasta que la tirada / el uso persistan server-side: hoy son `useState` en memoria
 * (`tiradasRuleta` en `MarketplaceApp`, `sorpresasUsadas` en `TabInicio`), así que se resetean
 * al recargar y prometen una recompensa que el mostrador no puede validar.
 */
export const MOSTRAR_RULETA_Y_SORPRESA = false;

/**
 * "Tu grupo esta semana" y "Desafío entre amigos" MOCK de `TabPerfil` (`lib/social.ts`,
 * `AMIGOS_MOCK` = Juan P. / Sofi R. / Nico D.). Solo tienen sentido en la demo de venta
 * (`!supabaseEnabled`); con backend real, la capa social real la cubren `SeccionReferidos`
 * y `SeccionDesafios` (esas sí verifican y premian server-side). Este flag fuerza mostrar
 * la versión mock también con backend — normalmente no hace falta.
 */
export const MOSTRAR_SOCIAL_MOCK_CON_BACKEND = false;
