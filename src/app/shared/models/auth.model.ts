export interface UserSession {
  id: number;
  username: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: UserSession;
}
