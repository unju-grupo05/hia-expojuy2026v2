/**
 * Almacenamiento de sesión del panel de administración.
 *
 * Punto ÚNICO de acceso al `localStorage` / `sessionStorage` para las credenciales
 * de sesión. Evita que cada servicio duplique la clave del token y que queden
 * lecturas de claves muertas de sistemas de autenticación anteriores.
 */

/** Clave única del token JWT dentro de `localStorage`. */
export const AUTH_TOKEN_KEY = 'expojuy_admin_token';

/** Clave del objeto de usuario (datos de perfil, NO sensibles) dentro de `localStorage`. */
export const AUTH_USER_KEY = 'expojuy_admin_user';

/**
 * Claves usadas por el servicio de autenticación obsoleto (`ApiGestionUsuario`),
 * que leía de `sessionStorage`. Nada las escribe hoy, pero se limpian al
 * iniciar sesión y al cerrar sesión para no dejar fragmentos de sesión activos.
 */
export const LEGACY_SESSION_KEYS = ['token', 'legajo', 'nombre', 'apellido', 'rol'] as const;

/**
 * Indica si el token JWT ya expiró, según su claim `exp`.
 *
 * El navegador no puede verificar la firma (sólo el backend tiene la clave), pero sí
 * puede leer `exp`. Esto evita mantener sesión abierta con un token vencido: el
 * guard trataría al usuario como autenticado y cada petición fallaría con 401.
 */
export function isTokenExpired(token: string): boolean {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return true;
  }

  try {
    const payload = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodificado = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const exp = JSON.parse(decodificado).exp;

    if (typeof exp !== 'number') {
      return true;
    }
    return Date.now() >= exp * 1000;
  } catch {
    // Un token ilegible se considera inválido.
    return true;
  }
}

/** Devuelve el token JWT almacenado, o `null` si no hay sesión. */
export function readAuthToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Devuelve el usuario persistido, o `null` si no hay perfil guardado.
 * Un JSON corrupto se trata como ausencia de perfil en lugar de propagar el error.
 */
export function readAuthUser<T = unknown>(): T | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Persiste el token y el usuario. */
export function writeAuthStorage(token: string, user: unknown): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Elimina TODOS los restos de la sesión: claves actuales en `localStorage`
 * y claves heredadas en `sessionStorage`.
 */
export function clearAuthStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  if (typeof sessionStorage !== 'undefined') {
    for (const key of LEGACY_SESSION_KEYS) {
      sessionStorage.removeItem(key);
    }
  }
}
