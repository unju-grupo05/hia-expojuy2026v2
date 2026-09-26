import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api-url';
import { B2BMeetingRequest, B2BMeetingResponse } from '../models/b2b-meeting.model';

@Injectable({
  providedIn: 'root'
})
export class B2BMeetingService {
  private readonly urlBase = `${API_URL}/reuniones-b2b`;

  constructor(private readonly http: HttpClient) {}

  createB2BMeeting(request: B2BMeetingRequest): Observable<B2BMeetingResponse> {
    return this.http.post<B2BMeetingResponse>(this.urlBase, request);
  }
}
