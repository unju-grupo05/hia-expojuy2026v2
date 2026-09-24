import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadMediaResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  format: string;
}

export interface MediaItemData {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiMediaService {
  public readonly urlHost: string = 'http://localhost:3000';
  public readonly urlBase: string = this.urlHost + '/api/admin/media';

  constructor(private http: HttpClient) {}

  private obtenerToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('expojuy_admin_token') ||
      sessionStorage.getItem('token')
    );
  }

  private httpOptionsConAuth() {
    const token = this.obtenerToken();
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  /**
   * Sube una imagen cruda (JPG, PNG, WebP, AVIF) al backend.
   * El backend la valida, redimensiona y convierte a formato .webp optimizado.
   */
  public uploadImage(file: File): Observable<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const token = this.obtenerToken();
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    return this.http.post<UploadMediaResponse>(`${this.urlBase}/upload`, formData, { headers });
  }

  /**
   * Obtiene la lista de imágenes optimizadas persistidas en el catálogo del backend.
   */
  public getMedias(): Observable<{ success: boolean; data: MediaItemData[] }> {
    return this.http.get<{ success: boolean; data: MediaItemData[] }>(this.urlBase);
  }

  /**
   * Elimina una imagen del disco y de la base de datos a través del backend.
   */
  public deleteMedia(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.urlBase}/${id}`, this.httpOptionsConAuth());
  }

  /**
   * Asegura que las URLs de imágenes se resuelvan correctamente:
   * - Si es de subida en backend (/uploads/xxx.webp) -> http://localhost:3000/uploads/xxx.webp
   * - Si es del seed local del frontend (./Img/xxx o Img/xxx) -> /Img/xxx (raíz de localhost:4200)
   * - Evita errores 404 al navegar en subrutas como /galeria o /admin/media
   */
  public normalizeImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    const cleanUrl = url.trim();

    // 1. Si ya es absoluta o data-url, retornar intacta
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
      return cleanUrl;
    }

    // 2. Si viene del backend (subida de archivos persistida en /uploads)
    if (cleanUrl.startsWith('/uploads')) {
      return `${this.urlHost}${cleanUrl}`;
    }
    if (cleanUrl.startsWith('uploads/')) {
      return `${this.urlHost}/${cleanUrl}`;
    }

    // 3. Si viene del seeder (./Img/... o Img/...)
    // Quitamos el punto inicial para que la ruta sea absoluta desde la raíz del frontend (/Img/...)
    if (cleanUrl.startsWith('./Img/')) {
      return cleanUrl.replace(/^\.\//, '/');
    }
    if (cleanUrl.startsWith('Img/')) {
      return `/${cleanUrl}`;
    }
    if (cleanUrl.startsWith('./')) {
      return cleanUrl.replace(/^\.\//, '/');
    }

    return cleanUrl;
  }
}
