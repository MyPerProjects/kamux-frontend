import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_URL } from '../constants';
import { LoginResponse, UserSession } from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'kamux_token';
  private readonly userKey = 'kamux_user';

  // El BehaviorSubject mantiene el estado del usuario en memoria y emite cambios en tiempo real
  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.loadStorage();
  }

  // 1. Cargar la sesión del localStorage al iniciar la aplicación en el navegador
  private loadStorage(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userJson = localStorage.getItem(this.userKey);

    if (token && userJson) {
      try {
        this.currentUserSubject.next(JSON.parse(userJson));
      } catch (e) {
        this.logout();
      }
    }
  }

  // 2. Registro de nuevos usuarios
  register(username: string, passwordPlain: string): Observable<any> {
    return this.http.post(`${API_URL}/users/register`, {
      username,
      passwordPlain,
    });
  }

  // 3. Inicio de sesión con almacenamiento reactivo del JWT
  login(username: string, passwordPlain: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/auth/login`, {
        username,
        passwordPlain,
      })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.access_token);
          localStorage.setItem(this.userKey, JSON.stringify(response.user));

          this.currentUserSubject.next(response.user);
        }),
      );
  }

  // 4. Cerrar sesión limpiando el rastro del navegador
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  // 5. Getters síncronos útiles para los guardianes de rutas
  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public isLoggedIn(): boolean {
    return this.getToken() !== null;
  }
}
