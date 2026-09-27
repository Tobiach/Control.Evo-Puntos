// Flags de producto — retiros reversibles de la Fase 0.4 del roadmap de experiencia
// (ver docs/ROADMAP-PRODUCTO.md y docs/DIAGNOSTICO-PRODUCTO.md, hallazgo F5).
// Poné el valor en `true` para volver a mostrar la feature — no hay más cambios que hacer.

/**
 * Ruleta semanal y recompensa sorpresa en la pantalla de un negocio (`TabInicio`).
 * Ya tienen persistencia real y código verificable en el mostrador (RPC `girar_ruleta`/
 * `usar_sorpresa`/`confirmar_premio_juego`, migración `0026_juego_ruleta_sorpresa.sql`).
 * Apagadas todavía porque esa migración no se corrió contra producción — recién probarlas en
 * vivo (girar de verdad, confirmar con PIN, cooldown sobreviviendo un refresh) y pasar esto a
 * `true`.
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
