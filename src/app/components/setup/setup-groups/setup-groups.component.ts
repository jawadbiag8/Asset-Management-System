import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type GroupPermissionAction = 'create' | 'view' | 'edit' | 'delete' | 'view_report' | 'export';

interface PermissionModule {
  key: string;
  label: string;
  actions: GroupPermissionAction[];
}

interface GroupItem {
  id: number;
  name: string;
  description: string;
  ministries: string[];
  permissions: string[];
}

@Component({
  selector: 'app-setup-groups',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './setup-groups.component.html',
  styleUrl: './setup-groups.component.scss',
})
export class SetupGroupsComponent {
  readonly steps = ['Basic Info', 'Ministries', 'Permissions'] as const;
  currentStep = signal(0);

  groupName = signal('');
  description = signal('');
  searchTerm = signal('');

  readonly availableMinistries = [
    'Ministry of Information Technology',
    'Ministry of Finance',
    'Ministry of Interior',
    'Ministry of Commerce',
    'Ministry of Education',
    'Ministry of Health',
  ];

  readonly permissionModules: PermissionModule[] = [
    { key: 'asset_registry', label: 'Asset Registry', actions: ['create', 'view', 'edit', 'delete', 'view_report'] },
    { key: 'incidents', label: 'Incident Management', actions: ['create', 'view', 'edit', 'delete', 'export'] },
    { key: 'vendors', label: 'Vendor Management', actions: ['create', 'view', 'edit', 'delete'] },
    { key: 'reports', label: 'Reports', actions: ['view', 'view_report', 'export'] },
    { key: 'setup', label: 'Setup & Configurations', actions: ['view', 'edit'] },
  ];

  selectedMinistries = signal<string[]>([]);
  selectedPermissionKeys = signal<string[]>([]);

  groups = signal<GroupItem[]>([
    {
      id: 1,
      name: 'PDA Super Admin',
      description: 'Full access across all modules',
      ministries: ['Ministry of Information Technology', 'Ministry of Finance'],
      permissions: ['asset_registry.create', 'asset_registry.view', 'asset_registry.edit', 'asset_registry.delete'],
    },
    {
      id: 2,
      name: 'Ministry Operations Manager',
      description: 'Operational view and update access',
      ministries: ['Ministry of Interior'],
      permissions: ['asset_registry.view', 'asset_registry.edit', 'incidents.view', 'incidents.edit', 'reports.view_report'],
    },
  ]);

  readonly filteredGroups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.groups();
    }
    return this.groups().filter((g) => {
      return (
        g.name.toLowerCase().includes(term) ||
        g.description.toLowerCase().includes(term) ||
        g.ministries.some((m) => m.toLowerCase().includes(term))
      );
    });
  });

  readonly canMoveNext = computed(() => {
    if (this.currentStep() === 0) {
      return this.groupName().trim().length > 0;
    }
    if (this.currentStep() === 1) {
      return this.selectedMinistries().length > 0;
    }
    return true;
  });

  nextStep(): void {
    if (!this.canMoveNext()) return;
    this.currentStep.set(Math.min(this.currentStep() + 1, this.steps.length - 1));
  }

  prevStep(): void {
    this.currentStep.set(Math.max(this.currentStep() - 1, 0));
  }

  toggleMinistry(ministry: string): void {
    const selected = new Set(this.selectedMinistries());
    if (selected.has(ministry)) {
      selected.delete(ministry);
    } else {
      selected.add(ministry);
    }
    this.selectedMinistries.set(Array.from(selected));
  }

  hasMinistry(ministry: string): boolean {
    return this.selectedMinistries().includes(ministry);
  }

  togglePermission(moduleKey: string, action: GroupPermissionAction): void {
    const key = `${moduleKey}.${action}`;
    const selected = new Set(this.selectedPermissionKeys());
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    this.selectedPermissionKeys.set(Array.from(selected));
  }

  hasPermission(moduleKey: string, action: GroupPermissionAction): boolean {
    return this.selectedPermissionKeys().includes(`${moduleKey}.${action}`);
  }

  moduleAllSelected(module: PermissionModule): boolean {
    return module.actions.every((a) => this.hasPermission(module.key, a));
  }

  toggleModule(module: PermissionModule): void {
    const selected = new Set(this.selectedPermissionKeys());
    const shouldSelectAll = !this.moduleAllSelected(module);
    module.actions.forEach((action) => {
      const key = `${module.key}.${action}`;
      if (shouldSelectAll) {
        selected.add(key);
      } else {
        selected.delete(key);
      }
    });
    this.selectedPermissionKeys.set(Array.from(selected));
  }

  onSaveGroup(): void {
    if (!this.groupName().trim() || !this.selectedMinistries().length) return;
    const nextId = Math.max(0, ...this.groups().map((g) => g.id)) + 1;
    const newGroup: GroupItem = {
      id: nextId,
      name: this.groupName().trim(),
      description: this.description().trim(),
      ministries: [...this.selectedMinistries()],
      permissions: [...this.selectedPermissionKeys()],
    };
    this.groups.set([newGroup, ...this.groups()]);
    this.resetForm();
  }

  onDeleteGroup(id: number): void {
    this.groups.set(this.groups().filter((g) => g.id !== id));
  }

  private resetForm(): void {
    this.groupName.set('');
    this.description.set('');
    this.selectedMinistries.set([]);
    this.selectedPermissionKeys.set([]);
    this.currentStep.set(0);
  }
}
