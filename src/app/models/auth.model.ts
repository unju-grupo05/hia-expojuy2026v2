export interface AuthCredentials {
  email: string;
  password: string;
}

/** Cuerpo que espera el backend. */
export interface AuthLoginPayload {
  identificador: string;
  password: string;
}

/** Claims del JWT que devuelve `usuario`. */
export interface AuthUsuarioClaims {
  legajo: string;
  nombre: string;
  apellido: string;
  rol: string;
  /** Solo si el backend lo envia; la UI debe tener fallback local. */
  avatar?: string;
}

/** Respuesta cruda del login. */
export interface AuthLoginResponse {
  msg: string;
  token: string;
  usuario: AuthUsuarioClaims;
}
