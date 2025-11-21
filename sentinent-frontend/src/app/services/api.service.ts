import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getParticipants(): Observable<any> {
    return this.http.get(`${this.base}/participants`);
  }
  addParticipant(payload: any) {
    return this.http.post(`${this.base}/participants`, payload);
  }

  getContacts(): Observable<any> {
    return this.http.get(`${this.base}/contacts`);
  }
  addContact(payload: any) {
    return this.http.post(`${this.base}/contacts`, payload);
  }
}
