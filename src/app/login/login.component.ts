import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, ApiResponse, LoginData } from '../services/api.service';
import { UtilsService } from '../services/utils.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  submitted = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private utilsService: UtilsService,
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Reset so error toasts work again after next login
    this.utilsService.setSessionExpiredHandled(false);
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;

    // Call login API
    this.apiService.login(username, password).subscribe({
      next: (response: ApiResponse<LoginData>) => {
        // Handle successful login
        if (response.isSuccessful && response.data) {
          const data = response.data;

          // Store token, name and roles in local storage
          this.utilsService.setStorage('token', data.token);
          this.utilsService.setStorage('name', data.name);
          this.utilsService.setStorage('roles', data.roles);

          // Store user data (for header and guards)
          const userData = {
            username: username,
            name: data.name,
            roles: data.roles,
            role: data.roles?.[0] ?? '',
            loginTime: new Date().toISOString(),
          };
          this.utilsService.setStorage('user', userData);

          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage =
            response.message || 'Login failed. Please check your credentials.';
          console.error('Login response:', response);
        }
      },
      error: (error) => {
        // Handle error
        this.errorMessage =
          error.message || 'Login failed. Please check your credentials.';
        console.error('Login error:', error);
      },
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
