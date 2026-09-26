import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL, ASSETS_BASE } from '../core/api-url';
import { readAuthToken } from '../core/auth-storage';

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
  public readonly urlBase: string = `${API_URL}/admin/media`;

  constructor(private http: HttpClient) {}

  private obtenerToken(): string | null {
    return readAuthToken();
  }

  private httpOptionsConAuth() {
    const token = this.obtenerToken();
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  public uploadImage(file: File): Observable<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const token = this.obtenerToken();
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    return this.http.post<UploadMediaResponse>(`${this.urlBase}/upload`, formData, { headers });
  }

  public getMedias(): Observable<{ success: boolean; data: MediaItemData[] }> {
    return this.http.get<{ success: boolean; data: MediaItemData[] }>(this.urlBase);
  }

  public deleteMedia(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.urlBase}/${id}`, this.httpOptionsConAuth());
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
