/**
 * Carga perezosa y memoizada de GSAP + ScrollTrigger.
 *
 * `gsap` (mas `ScrollTrigger`) rondan los 80 kB minificados y antes vivian en
 * los imports estaticos de `InicioComponent` y `EjesComponent`, con lo cual
 * acababan en los chunks iniciales: el navegador los descargaba, parseaba y
 * ejecutaba durante el render critico aunque el visitante nunca scrolleara.
 *
 * Aqui se resuelven con `import()` dinamico, una sola vez y de forma
 * compartida: el primer consumidor dispara la descarga y todos los demas
 * reutilizan la misma promesa (el chunk ya esta en la cache del modulo).
 *
 * `registerPlugin(ScrollTrigger)` se hace aqui para que ningun consumidor
 * tenga que acordarse de hacerlo.
 */

export type GsapApi = typeof import('gsap')['gsap'];
export type ScrollTriggerApi = typeof import('gsap/ScrollTrigger')['ScrollTrigger'];

export interface GsapBundle {
  gsap: GsapApi;
  ScrollTrigger: ScrollTriggerApi;
}

let pending: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!pending) {
    pending = (async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);

      // GSAP expone `gsap` con nombre y como default; segun el empaquetado
      // puede venir en cualquiera de los dos huecos.
      const gsap = (gsapModule.gsap ?? gsapModule.default) as GsapApi;
      const scrollTriggerModuleApi = scrollTriggerModule as {
        ScrollTrigger: ScrollTriggerApi;
        default?: ScrollTriggerApi;
      };
      const ScrollTrigger = scrollTriggerModuleApi.ScrollTrigger ?? scrollTriggerModuleApi.default;

      gsap.registerPlugin(ScrollTrigger);

      return { gsap, ScrollTrigger };
    })().catch((error) => {
      // Permite reintentar en el siguiente consumidor en vez de cachear el fallo.
      pending = null;
      throw error;
    });
  }

  return pending;
}
