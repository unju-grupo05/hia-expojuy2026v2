import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'iconHref', standalone: true, pure: true })
export class IconHrefPipe implements PipeTransform {
  transform(name: string | null | undefined): string {
    const n = (name ?? '').trim();
    return `#ms-${/^[a-z0-9_]+$/.test(n) ? n : 'star'}`;
  }
}

// Esto es un pipe para que se muestre siempre un icono en los componentes, si el backend no envia un icono, se muestra una estrella por defecto.
// Y evita que se rompa la pagina si el icono no existe.
// Se utiliza en los siguientes componentes:
// - agenda-list-component.component.ts
// - pillars-component.component.ts
// - metrics-component.component.ts
// - posts-list-component.component.ts
 