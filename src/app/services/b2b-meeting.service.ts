import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { B2BMeetingRequest } from '../components/models/b2b-meeting.model';

@Injectable({
  providedIn: 'root'
})
export class B2BMeetingService {
  private readonly urlBase = 'http://localhost:3000/api/reuniones-b2b';

  constructor(private readonly http: HttpClient) {}

  createB2BMeeting(request: B2BMeetingRequest): Observable<any> {
    return this.http.post<any>(this.urlBase, request);
  }
}
