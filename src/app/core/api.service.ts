import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LivekitToken, PublicSession, SessionCreated } from './contracts';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  create(title: string, pin: string | null) {
    return this.http.post<SessionCreated>('/api/sessions', { title, pin });
  }

  session(code: string) {
    return this.http.get<PublicSession>(`/api/sessions/${encodeURIComponent(code)}`);
  }

  viewerToken(code: string, displayName: string, pin: string | null) {
    return this.http.post<LivekitToken>(`/api/sessions/${encodeURIComponent(code)}/viewer-token`, {
      displayName,
      pin,
    });
  }

  publisherToken(code: string, publisherSecret: string) {
    const headers = new HttpHeaders({ 'X-Session-Secret': publisherSecret });

    return this.http.post<LivekitToken>(
      `/api/sessions/${encodeURIComponent(code)}/publisher-token`,
      {},
      { headers },
    );
  }

  markPublisherStarted(code: string, publisherSecret: string) {
    const headers = new HttpHeaders({ 'X-Session-Secret': publisherSecret });

    return this.http.post<void>(
      `/api/sessions/${encodeURIComponent(code)}/publisher-started`,
      {},
      { headers },
    );
  }

  end(code: string, publisherSecret: string) {
    const headers = new HttpHeaders({ 'X-Session-Secret': publisherSecret });

    return this.http.delete<void>(`/api/sessions/${encodeURIComponent(code)}`, { headers });
  }
}
