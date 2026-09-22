import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  public sharePage(): void {
  if (navigator.share) {
    navigator.share({
      title: 'ExpoJuy 2026',
      text: '¡Conectando Países, Creando Oportunidades en la ExpoJuy 2026!',
      url: window.location.href
    }).catch(() => {});
  } else {
    // Fallback: Copia el enlace al portapapeles si la API nativa no está soportada
    navigator.clipboard.writeText(window.location.href);
    alert('¡Enlace copiado al portapapeles!');
  }
}
}