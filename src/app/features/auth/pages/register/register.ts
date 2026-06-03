import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  private subManager = new Subscription();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subManager.unsubscribe();
  }

  onRegister(): void {
    if (!this.username.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      this.cdr.detectChanges();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.subManager.add(
      this.authService.register(this.username, this.password).subscribe({
        next: () => {
          this.successMessage = '¡Usuario registrado con éxito! Redirigiendo al login...';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Error al registrar el usuario.';
          this.cdr.detectChanges();
        },
      }),
    );
  }
}
