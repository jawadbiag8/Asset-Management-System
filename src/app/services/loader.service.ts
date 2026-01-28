import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private count = 0;

  show(): void {
    this.count++;
    setTimeout(() => this.loadingSubject.next(this.count > 0), 0);
  }

  hide(): void {
    if (this.count > 0) {
      this.count--;
    }
    setTimeout(() => this.loadingSubject.next(this.count > 0), 0);
  }
}
