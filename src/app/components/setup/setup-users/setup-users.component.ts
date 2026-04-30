import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

interface GroupOption {
  id: number;
  name: string;
  permissions: string[];
  ministries: string[];
}

interface UserItem {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  groups: string[];
  effectivePermissions: string[];
}

@Component({
  selector: 'app-setup-users',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './setup-users.component.html',
  styleUrl: './setup-users.component.scss',
})
export class SetupUsersComponent {
  fullName = signal('');
  email = signal('');
  phone = signal('');
  address = signal('');
  searchTerm = signal('');

  readonly groupsCatalog: GroupOption[] = [
    {
      id: 1,
      name: 'PDA Super Admin',
      permissions: ['asset_registry.create', 'asset_registry.view', 'asset_registry.edit', 'asset_registry.delete', 'reports.export'],
      ministries: ['Ministry of Information Technology', 'Ministry of Finance'],
    },
    {
      id: 2,
      name: 'Ministry Operations Manager',
      permissions: ['asset_registry.view', 'asset_registry.edit', 'incidents.view', 'incidents.edit'],
      ministries: ['Ministry of Interior'],
    },
    {
      id: 3,
      name: 'Reporting Analyst',
      permissions: ['reports.view', 'reports.view_report', 'reports.export'],
      ministries: ['Ministry of Commerce', 'Ministry of Health'],
    },
  ];

  selectedGroupIds = signal<number[]>([]);

  users = signal<UserItem[]>([
    {
      id: 1,
      fullName: 'Ayesha Khan',
      email: 'ayesha.khan@pda.gov.pk',
      phone: '+92 300 0000001',
      address: 'Islamabad',
      groups: ['PDA Super Admin'],
      effectivePermissions: ['asset_registry.create', 'asset_registry.view', 'reports.export'],
    },
    {
      id: 2,
      fullName: 'Usman Tariq',
      email: 'usman.tariq@pda.gov.pk',
      phone: '+92 300 0000002',
      address: 'Lahore',
      groups: ['Ministry Operations Manager', 'Reporting Analyst'],
      effectivePermissions: ['asset_registry.view', 'incidents.view', 'reports.view_report', 'reports.export'],
    },
  ]);

  readonly selectedGroups = computed(() => {
    const selected = new Set(this.selectedGroupIds());
    return this.groupsCatalog.filter((g) => selected.has(g.id));
  });

  readonly inheritedPermissions = computed(() => {
    const permissionSet = new Set<string>();
    this.selectedGroups().forEach((group) => group.permissions.forEach((p) => permissionSet.add(p)));
    return Array.from(permissionSet).sort();
  });

  readonly inheritedMinistries = computed(() => {
    const ministrySet = new Set<string>();
    this.selectedGroups().forEach((group) => group.ministries.forEach((m) => ministrySet.add(m)));
    return Array.from(ministrySet).sort();
  });

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter((u) => {
      return (
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.groups.some((g) => g.toLowerCase().includes(term))
      );
    });
  });

  toggleGroup(groupId: number): void {
    const selected = new Set(this.selectedGroupIds());
    if (selected.has(groupId)) {
      selected.delete(groupId);
    } else {
      selected.add(groupId);
    }
    this.selectedGroupIds.set(Array.from(selected));
  }

  isGroupSelected(groupId: number): boolean {
    return this.selectedGroupIds().includes(groupId);
  }

  onCreateUser(): void {
    if (!this.fullName().trim() || !this.email().trim() || this.selectedGroups().length === 0) return;

    const nextId = Math.max(0, ...this.users().map((u) => u.id)) + 1;
    const newUser: UserItem = {
      id: nextId,
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      address: this.address().trim(),
      groups: this.selectedGroups().map((g) => g.name),
      effectivePermissions: this.inheritedPermissions(),
    };

    this.users.set([newUser, ...this.users()]);
    this.resetForm();
  }

  onDeleteUser(id: number): void {
    this.users.set(this.users().filter((u) => u.id !== id));
  }

  private resetForm(): void {
    this.fullName.set('');
    this.email.set('');
    this.phone.set('');
    this.address.set('');
    this.selectedGroupIds.set([]);
  }
}
