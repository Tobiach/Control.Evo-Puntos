import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `waitFor` por defecto espera 1 s. Varios tests esperan a que terminen animaciones de salida
// de `AnimatePresence` (motion/react), que son wall-clock: en máquinas de pocos cores, bajo
// carga, 1 s no alcanza y el test flakea sin que haya nada roto. 5 s da margen sin volver
// lento el camino feliz (resuelve apenas la condición se cumple).
configure({ asyncUtilTimeout: 5000 });

// Limpia el DOM entre tests (react testing library no lo hace solo sin globals).
afterEach(() => {
  cleanup();
});

// Polyfills mínimos que motion/react espera y jsdom no provee.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const globalRef = globalThis as unknown as Record<string, unknown>;

if (typeof globalRef.ResizeObserver === 'undefined') {
  globalRef.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof globalRef.IntersectionObserver === 'undefined') {
  globalRef.IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
