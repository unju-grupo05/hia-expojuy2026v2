import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'iconHref', standalone: true, pure: true })
export class IconHrefPipe implements PipeTransform {
  transform(name: string | null | undefined): string {
    const n = (name ?? '').trim();
    return `#ms-${/^[a-z0-9_]+$/.test(n) ? n : 'star'}`;
  }
}