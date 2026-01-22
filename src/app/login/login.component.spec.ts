import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.loginForm.invalid).toBeTruthy();
  });

  it('should validate username field', () => {
    const usernameControl = component.loginForm.get('username');
    expect(usernameControl?.hasError('required')).toBeTruthy();

    usernameControl?.setValue('testuser');
    expect(usernameControl?.valid).toBeTruthy();
  });

  it('should validate password field', () => {
    const passwordControl = component.loginForm.get('password');
    expect(passwordControl?.hasError('required')).toBeTruthy();

    passwordControl?.setValue('12345');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();

    passwordControl?.setValue('123456');
    expect(passwordControl?.valid).toBeTruthy();
  });

  it('should submit form when valid', () => {
    component.loginForm.patchValue({
      username: 'testuser',
      password: 'password123'
    });

    component.onSubmit();
    expect(component.submitted).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBeFalsy();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTruthy();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeFalsy();
  });
});
