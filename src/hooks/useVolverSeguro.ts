import { useLocation, useNavigate } from 'react-router-dom';

/**
 * "Volver" que imita el botón atrás del navegador cuando hay desde dónde volver (mismo
 * historial de esta sesión de SPA) — así el botón "Volver" de la UI y el atrás real del
 * navegador hacen exactamente lo mismo, en vez de apilar un estado nuevo que deja el
 * historial inconsistente entre los dos caminos.
 *
 * `location.key === 'default'` es como React Router marca la entrada inicial (llegaste por
 * un link directo o recargaste la página) — ahí no hay nada previo DENTRO de esta sesión a lo
 * que volver, así que cae a `destinoSiNoHayHistorial` en vez de sacar al usuario de la app.
 */
export function useVolverSeguro(destinoSiNoHayHistorial: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key === 'default') {
      navigate(destinoSiNoHayHistorial, { replace: true });
    } else {
      navigate(-1);
    }
  };
}
