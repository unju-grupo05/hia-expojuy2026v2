import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL, ASSETS_BASE } from '../core/api-url';

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
export class MediaService {
  public readonly urlBase: string = `${API_URL}/admin/media`;

  constructor(private http: HttpClient) {}

  // El token lo adjunta el AuthInterceptor. En `uploadImage` NO se fija
  // Content-Type a propósito: el navegador debe generar el boundary de
  // multipart/form-data al enviar el FormData.
  public uploadImage(file: File): Observable<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<UploadMediaResponse>(`${this.urlBase}/upload`, formData);
  }

  public getMedias(): Observable<{ success: boolean; data: MediaItemData[] }> {
    return this.http.get<{ success: boolean; data: MediaItemData[] }>(this.urlBase);
  }

  public deleteMedia(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.urlBase}/${id}`);
  }

  public normalizeImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    const cleanUrl = url.trim();

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('data:')) {
      return cleanUrl;
    }
    if (cleanUrl.startsWith('/uploads')) {
      return `${ASSETS_BASE}${cleanUrl}`;
    }
    if (cleanUrl.startsWith('uploads/')) {
      return `${ASSETS_BASE}/${cleanUrl}`;
    }
    if (/^\.?\/?[iI][mM][gG]\//.test(cleanUrl)) {
      return cleanUrl.replace(/^\.?\/?[iI][mM][gG]\//, '/img/');
    }
    if (cleanUrl.startsWith('./')) {
      return cleanUrl.replace(/^\.\//, '/');
    }
    return cleanUrl;
  }
}
