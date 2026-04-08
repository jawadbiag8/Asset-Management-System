import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SetupSidebarComponent, type SetupSidebarItem } from './setup-sidebar/setup-sidebar.component';
import { UtilsService } from '../../services/utils.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SetupSidebarComponent],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
})
export class SetupComponent {
  user = signal<{ name: string; role: string; avatarUrl?: string | null }>({ name: '', role: 'Admin' });

  sidebarItems: SetupSidebarItem[] = [
    { label: 'Dashboard', route: '/setup', icon: 'grid' },
    { label: 'Ministries', route: '/setup/ministries', icon: 'building' },
    { label: 'Vendors', route: '/setup/vendors', icon: 'users' },
  ];

  constructor(private utilsService: UtilsService) {
    const userData = this.utilsService.getStorage<{
      username?: string;
      name?: string;
      role?: string;
    }>('user');

    this.user.set({
      name: userData?.name || userData?.username || 'Username',
      role: userData?.role || 'Admin',
      avatarUrl: null,
    });
  }
}
