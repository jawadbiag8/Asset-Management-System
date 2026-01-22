import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
    private router: Router
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

    // TODO: Implement actual authentication logic
    const { username, password } = this.loginForm.value;

    // Placeholder authentication - replace with actual service call
    console.log('Login attempt:', { username, password });

    // Simulate successful login
    // this.router.navigate(['/dashboard']);

    // For now, just show a message
    alert('Login functionality will be implemented with authentication service');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
