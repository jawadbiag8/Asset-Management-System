import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  submitted = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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
    this.apiService.post<any>('Auth/login', {
      username: username,
      password: password
    }).subscribe({
      next: (response) => {
        // Handle successful login
        // ApiService extracts data from response, so response is directly the token string
        // API response structure: { isSuccessful: true, data: "token_string" }
        // After ApiService mapping, response = "token_string"

        let token: string | null = null;

        if (typeof response === 'string' && response.length > 0) {
          // Response is directly the token string (most common case)
          token = response;
        } else if (response && typeof response === 'object') {
          // Fallback: if response is still an object, check for token
          token = response.token || response.data || null;
        }

        if (token) {
          // Store token
          this.apiService.setAuthToken(token);

          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Invalid response from server';
          console.error('Login response:', response);
        }
      },
      error: (error) => {
        // Handle error
        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
        console.error('Login error:', error);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
