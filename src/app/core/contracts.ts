export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface SessionSummary {
  code: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
  viewerUrl: string;
}

export interface SessionCreated extends SessionSummary {
  livekitUrl: string;
  publisherSecret: string;
}

export interface PublicSession {
  code: string;
  title: string;
  status: SessionStatus;
  publisherName: string | null;
  viewerCount: number;
  pinProtected: boolean;
}

export interface LivekitToken {
  livekitUrl: string;
  token: string;
  expiresAt: string;
}

export type SessionStatus = 'WAITING' | 'LIVE' | 'ENDED';

export interface Problem {
  detail?: string;
  title?: string;
  status?: number;
}
