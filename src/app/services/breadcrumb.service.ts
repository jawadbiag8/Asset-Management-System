import { Injectable, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem } from '../components/reusable/reusable-breadcrum/reusable-breadcrum.component';

const BREADCRUMB_HIDDEN_KEY = 'breadcrumb-hidden-path';

export interface BreadcrumbConfig {
  label: string;
  parentPath?: string;
}

/**
 * Maps route paths (or path prefixes) to breadcrumb label and optional parent path.
 * More specific paths should come before generic ones when using prefix matching.
 */
const BREADCRUMB_CONFIG: { path: string; config: BreadcrumbConfig }[] = [
  { path: '/dashboard', config: { label: 'Dashboards' } },
  { path: '/asset', config: { label: 'Assets', parentPath: '/dashboard' } },
  { path: '/ministries', config: { label: 'Ministries', parentPath: '/dashboard' } },
  { path: '/ministry-detail', config: { label: 'Ministry Detail', parentPath: '/ministries' } },
  { path: '/asset-control-panel', config: { label: 'Asset Control Panel', parentPath: '/asset' } },
  { path: '/asset-audit-log', config: { label: 'Audit Logs', parentPath: '/asset' } },
  { path: '/view-assets-detail', config: { label: 'Asset Detail', parentPath: '/asset' } },
  { path: '/add-digital-assets', config: { label: 'Add Digital Asset', parentPath: '/asset' } },
  { path: '/edit-digital-asset', config: { label: 'Edit Digital Asset', parentPath: '/asset' } },
  { path: '/incidents/', config: { label: 'Incident Details', parentPath: '/incidents' } },
  { path: '/incidents', config: { label: 'Incidents', parentPath: '/dashboard' } },
  { path: '/pm-dashboard', config: { label: 'Executive Dashboard', parentPath: '/dashboard' } },
];

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly breadcrumbs = signal<BreadcrumbItem[]>([]);
  private navigatingFromHeader = false;

  /** Dynamic breadcrumbs for the current route; use in template with async or signal. */
  readonly currentBreadcrumbs = computed(() => this.breadcrumbs());

  /** Optional override for the last (current) breadcrumb label (e.g. entity name). */
  private lastLabelOverride = signal<string | null>(null);

  constructor(private router: Router) {
    this.buildBreadcrumbs(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.onNavigationEnd(event.urlAfterRedirects));
  }

  /** Call before navigating from header (Dashboard, Assets, Ministries, Incidents). Breadcrumb will hide and stay hidden on reload. */
  navigateFromHeader(): void {
    this.navigatingFromHeader = true;
  }

  private onNavigationEnd(url: string): void {
    const path = url.split('?')[0];
    if (this.navigatingFromHeader) {
      this.navigatingFromHeader = false;
      try {
        sessionStorage.setItem(BREADCRUMB_HIDDEN_KEY, path);
      } catch {}
      this.breadcrumbs.set([]);
      return;
    }
    this.buildBreadcrumbs(url);
  }

  /** Set a custom label for the current page (e.g. "Ministry Name", "Asset Name"). */
  setCurrentLabel(label: string | null): void {
    this.lastLabelOverride.set(label);
    this.buildBreadcrumbs(this.router.url);
  }

  /** Routes where breadcrumb is never shown (e.g. Executive Dashboard). */
  private static readonly BREADCRUMB_HIDDEN_ROUTES = ['/pm-dashboard'];

  private buildBreadcrumbs(url: string): void {
    const path = url.split('?')[0];
    const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

    if (BreadcrumbService.BREADCRUMB_HIDDEN_ROUTES.some((r) => normalizedPath === r || normalizedPath.startsWith(r + '/'))) {
      this.breadcrumbs.set([]);
      return;
    }

    try {
      const hiddenPath = sessionStorage.getItem(BREADCRUMB_HIDDEN_KEY);
      if (hiddenPath === normalizedPath || hiddenPath === path) {
        this.breadcrumbs.set([]);
        return;
      }
      sessionStorage.removeItem(BREADCRUMB_HIDDEN_KEY);
    } catch {}

    const trail: BreadcrumbItem[] = [];
    const override = this.lastLabelOverride();

    const config = this.getConfigForPath(path);
    if (!config) {
      this.breadcrumbs.set([{ label: 'Dashboards', path: '/dashboard' }]);
      return;
    }

    const chain: { path: string; label: string }[] = [];
    let current: BreadcrumbConfig | undefined = config;
    let currentPath = path;

    while (current) {
      const label = chain.length === 0 && override ? override : current.label;
      chain.unshift({ path: currentPath, label });
      if (!current.parentPath) break;
      currentPath = current.parentPath;
      current = this.getConfigForPath(currentPath);
    }

    if (!chain.length) {
      this.breadcrumbs.set([{ label: 'Dashboards', path: '/dashboard' }]);
      return;
    }

    trail.push({ label: chain[0].label, path: chain[0].path });
    for (let i = 1; i < chain.length; i++) {
      trail.push({
        label: chain[i].label,
        path: i === chain.length - 1 ? undefined : chain[i].path,
      });
    }

    const last = trail[trail.length - 1];
    if (override && last) {
      trail[trail.length - 1] = { ...last, label: override };
    }

    this.breadcrumbs.set(trail);
  }

  private getConfigForPath(path: string): BreadcrumbConfig | undefined {
    const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const exact = BREADCRUMB_CONFIG.find((c) => c.path === normalized);
    if (exact) return exact.config;
    // Prefix match: for config paths ending with / use startsWith(path), else startsWith(path + '/')
    const prefix = BREADCRUMB_CONFIG.find((c) =>
      c.path.endsWith('/') ? normalized.startsWith(c.path) : normalized.startsWith(c.path + '/'),
    );
    return prefix?.config;
  }
}
