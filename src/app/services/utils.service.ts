import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }

  getEnvironmentVariable(key: string): any {
    return (environment as any)[key];
  }

  getEnvironment(): typeof environment {
    return environment;
  }
}
