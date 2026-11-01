import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  email = '';
  password = '';
  busy = signal(false);
  submit() {
    this.busy.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => void this.router.navigateByUrl('/app'),
      error: (e) => {
        this.toast.show(
          (e as HttpErrorResponse).error?.detail ??
            'Não foi possível entrar. Confira suas credenciais.',
          'error',
        );
        this.busy.set(false);
      },
    });
  }
}
