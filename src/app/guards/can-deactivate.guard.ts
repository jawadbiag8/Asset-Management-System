import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../components/reusable/confirmation-dialog/confirmation-dialog.component';
import { UtilsService } from '../services/utils.service';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Observable<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateGuard implements CanDeactivate<CanComponentDeactivate> {
  constructor(
    private dialog: MatDialog,
    private utilsService: UtilsService
  ) { }

  canDeactivate(
    component: CanComponentDeactivate
  ): boolean | Observable<boolean> {
    // Logout must always succeed from any page (e.g. add/edit asset)
    if (this.utilsService.isLoggingOut()) {
      this.utilsService.setLoggingOut(false);
      return true;
    }

    // If component doesn't implement canDeactivate, allow navigation
    if (!component.canDeactivate) {
      return true;
    }

    const canDeactivate = component.canDeactivate();

    // If canDeactivate returns true, allow navigation
    if (canDeactivate === true) {
      return true;
    }

    // If canDeactivate returns Observable, return it
    if (canDeactivate instanceof Observable) {
      return canDeactivate;
    }

    // If canDeactivate returns false, show confirmation dialog
    const dialogData: ConfirmationDialogData = {
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
      confirmButtonText: 'Leave',
      cancelButtonText: 'Stay'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: true
    });

    return dialogRef.afterClosed();
  }
}
