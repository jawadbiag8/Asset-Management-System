import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface SetupSidebarItem {
  label: string;
  route: string;
  icon?: 'grid' | 'building' | 'users' | 'settings';
}

@Component({
  selector: 'app-setup-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './setup-sidebar.component.html',
  styleUrl: './setup-sidebar.component.scss',
})
export class SetupSidebarComponent {
  @Input({ required: true }) user!: { name: string; role: string; avatarUrl?: string | null };
  @Input({ required: true }) items!: SetupSidebarItem[];

  initials(name: string): string {
    const n = (name || '').trim();
    if (!n) return 'U';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }

  trackByRoute = (_: number, it: SetupSidebarItem) => it.route;
}

