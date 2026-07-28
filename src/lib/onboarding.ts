const CLAVE_ONBOARDING_PREMIN = 'premia_onboarding_premin_visto';

/** true si ESTE dispositivo ya vio el onboarding de Premín (localStorage, no por cuenta). */
export function yaVioOnboardingPremin(): boolean {
  return localStorage.getItem(CLAVE_ONBOARDING_PREMIN) === '1';
}

export function marcarOnboardingPreminVisto(): void {
  localStorage.setItem(CLAVE_ONBOARDING_PREMIN, '1');
}
