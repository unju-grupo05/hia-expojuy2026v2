import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  templateUrl: './ubicacion.component.html',
  styleUrl: './ubicacion.component.css'
})
export class UbicacionComponent implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initLocationMap();
  }

  private initLocationMap(): void {
    const container = document.getElementById('location-map');
    if (!container) return;

    const BOUNDS = L.latLngBounds(
      L.latLng(-24.1950, -65.3180),
      L.latLng(-24.1720, -65.2920)
    );

    const map = L.map('location-map', {
      center: [-24.1835, -65.3050],
      zoom: 16,
      minZoom: 14,
      maxZoom: 19,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 1.0,
      scrollWheelZoom: true
    });

    const TILES = {
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      })
    };

    let currentTheme: 'dark' | 'light' = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    TILES[currentTheme].addTo(map);

    L.marker([-24.1835, -65.3050])
      .addTo(map)
      .bindPopup(
        '<strong>Ciudad Cultural — ExpoJuy 2026</strong><br>Av. Bolivia, San Salvador de Jujuy.<br>' +
        '<a href="https://maps.app.goo.gl/nqbHeuuaThDJd9b5A" target="_blank" rel="noopener">Abrir en Google Maps</a>',
        { maxWidth: 260 }
      )
      .openPopup();

    (window as any).setLocationMapTheme = (isDark: boolean) => {
      const next = isDark ? 'dark' : 'light';
      if (next === currentTheme) return;
      map.removeLayer(TILES[currentTheme]);
      TILES[next].addTo(map);
      currentTheme = next;
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) map.invalidateSize();
        });
      }, { threshold: 0.05 });
      io.observe(container);
    }
  }
}