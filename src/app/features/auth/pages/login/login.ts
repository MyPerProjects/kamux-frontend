import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  private subManager = new Subscription();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subManager.unsubscribe();
  }

  onLogin(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.subManager.add(
      this.authService.login(this.username, this.password).subscribe({
        next: () => {
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Error al iniciar sesión. Inténtalo de nuevo.';
          this.cdr.detectChanges();
        },
      }),
    );
  }
}
