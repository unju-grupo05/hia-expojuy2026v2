import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public errorMessage = signal<string | null>(null);
  public showPassword = signal<boolean>(false);

  public loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    this.authService.login({
      email: email || '',
      password: password || ''
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/posts';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    });
  }

  public togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }
}
