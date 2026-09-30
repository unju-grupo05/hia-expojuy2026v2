/**
 * Encola `fn` para el proximo hueco ocioso del hilo principal.
 *
 * `requestIdleCallback` solo garantiza que `fn` corra cuando el hilo queda
 * libre, nunca que tarde: por eso el `timeout` actua como red de seguridad para
 * que una tarea no se quede indefinidamente en cola si la pagina no vuelve a
 * quedar ociosa (por ejemplo, con la escena 3D montandose).
 *
 * `setTimeout` es el fallback para navegadores sin `requestIdleCallback`.
 *
 * Devuelve la funcion de cancelacion del callback todavia no ejecutado. Quien
 * llama debe registrarla en su teardown: un componente destruido mientras
 * esperaba su hueco ocioso no debe escribir despues sobre el DOM.
 */
export function scheduleIdle(fn: () => void, timeoutMs = 500): () => void {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(fn, { timeout: timeoutMs });
    return () => cancelIdleCallback(handle);
  }

  const id = setTimeout(fn, 100);
  return () => clearTimeout(id);
}
