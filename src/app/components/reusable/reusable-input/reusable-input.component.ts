import { Component, Input, OnInit } from '@angular/core';
import { FormControl, AbstractControl } from '@angular/forms';

export interface ReusableInputOption {
  value: string | number;
  label: string;
}

export interface ReusableInputConfig {
  label: string;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select';
  required?: boolean;
  disabled: boolean; // Always boolean, never undefined
  rows?: number; // For textarea
  options?: ReusableInputOption[]; // For select
  errorMessages?: { [key: string]: string }; // Custom error messages
}

@Component({
  selector: 'app-reusable-input',
  templateUrl: './reusable-input.component.html',
  styleUrl: './reusable-input.component.scss',
  standalone: false,
})
export class ReusableInputComponent implements OnInit {
  // Direct props from parent component
  @Input() label?: string;
  @Input() type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select';
  @Input() placeholder?: string;
  @Input() hint?: string;
  @Input() disabled?: boolean;
  @Input() rows?: number;
  @Input() options?: ReusableInputOption[];
  @Input() errorMessages?: { [key: string]: string };
  
  @Input() control!: FormControl;

  // Merged configuration
  mergedConfig: ReusableInputConfig = {
    label: '',
    type: 'text',
    disabled: false
  };

  ngOnInit() {
    // Extract required status from form control validators
    let isRequiredFromControl = false;
    if (this.control && this.control.validator) {
      const validator = this.control.validator({} as AbstractControl);
      if (validator !== null && validator['required'] !== undefined) {
        isRequiredFromControl = true;
      }
    }

    // Build merged config from direct props only
    this.mergedConfig = {
      label: this.label ?? '',
      type: this.type ?? 'text',
      placeholder: this.placeholder,
      hint: this.hint,
      required: isRequiredFromControl,
      disabled: this.disabled ?? false,
      rows: this.rows,
      options: this.options,
      errorMessages: this.errorMessages
    };
  }

  getErrorMessage(): string {
    if (!this.control || !this.control.errors || !this.control.touched) {
      return '';
    }

    const errors = this.control.errors;
    const errorKeys = Object.keys(errors);

    if (errorKeys.length === 0) {
      return '';
    }

    // Check for custom error messages first
    if (this.mergedConfig.errorMessages && this.mergedConfig.errorMessages[errorKeys[0]]) {
      return this.mergedConfig.errorMessages[errorKeys[0]];
    }

    // Default error messages
    const errorKey = errorKeys[0];
    switch (errorKey) {
      case 'required':
        return `${this.mergedConfig.label} is required`;
      case 'email':
        return 'Please enter a valid email address';
      case 'pattern':
        return 'Please enter a valid value';
      case 'min':
        return `Value must be at least ${errors['min']?.min}`;
      case 'max':
        return `Value must be at most ${errors['max']?.max}`;
      case 'minlength':
        return `Minimum length is ${errors['minlength']?.requiredLength} characters`;
      case 'maxlength':
        return `Maximum length is ${errors['maxlength']?.requiredLength} characters`;
      default:
        return 'Invalid value';
    }
  }

  hasError(): boolean {
    return !!(this.control && this.control.invalid && this.control.touched);
  }

  isRequired(): boolean {
    // First check merged config
    if (this.mergedConfig.required === true) {
      return true;
    }
    
    // If not explicitly set, check form control validators
    if (this.control && this.control.validator) {
      const validator = this.control.validator({} as AbstractControl);
      return validator !== null && validator['required'] !== undefined;
    }
    
    return false;
  }
}
