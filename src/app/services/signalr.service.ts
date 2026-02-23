import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { UtilsService } from './utils.service';

/** Topic names sent by server on DataUpdated; frontend joins these exact strings. */
export const TOPICS = {
  adminDashboardSummary: 'AdminDashboard.Summary',
  pmDashboardHeader: 'PMDashboard.Header',
  incident: (id: number | string) => `Incident.${id}`,
  assetControlPanel: (assetId: number | string) => `Asset.${assetId}.ControlPanel`,
  assetKpisLov: (assetId: number | string) => `Asset.${assetId}.KpisLov`,
} as const;

@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private readonly dataUpdated$ = new Subject<string>();
  private joinedTopics = new Set<string>();
  private connectPromise: Promise<void> | null = null;
  private destroyed = false;

  /** Emits topic string when server invokes DataUpdated(topic). Subscribe and refetch API for that topic. */
  readonly onDataUpdated: Observable<string> = this.dataUpdated$.asObservable();

  constructor(private utils: UtilsService) {}

  /** Build hub URL from config: signalRHubUrl if set, else server root + /hubs/data-update. */
  private getHubUrl(): string {
    const env = this.utils.getEnvironment();
    const explicit = (env as { signalRHubUrl?: string })?.signalRHubUrl;
    if (typeof explicit === 'string' && explicit.trim()) {
      return explicit.trim();
    }
    const apiUrl = env?.apiUrl as string | undefined;
    if (!apiUrl || typeof apiUrl !== 'string') {
      return '';
    }
    const base = apiUrl.replace(/\/api\/?$/, '') || apiUrl;
    return `${base}/hubs/data-update`;
  }

  private ensureConnection(): Promise<void> {
    if (this.destroyed) return Promise.reject(new Error('SignalR service destroyed'));
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }
    if (this.connectPromise) return this.connectPromise;

    const hubUrl = this.getHubUrl();
    if (!hubUrl) {
      return Promise.reject(new Error('SignalR hub URL not configured'));
    }

    const token = this.utils.getStorage<string>('token', false);
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => Promise.resolve(token ?? ''),
        // Omit cookies so CORS allows wildcard origin (Access-Control-Allow-Origin: *).
        // Auth is sent via accessTokenFactory (query/header), not cookies.
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('DataUpdated', (topic: string) => {
      this.dataUpdated$.next(topic);
    });

    this.hubConnection.onreconnected(() => {
      this.rejoinAllTopics();
    });

    this.connectPromise = this.hubConnection
      .start()
      .then(() => {
        this.rejoinAllTopics();
      })
      .catch((err) => {
        this.connectPromise = null;
        this.utils.showToast(
          err?.message ?? 'Real-time updates could not be connected.',
          'Connection',
          'warning',
        );
        throw err;
      });

    return this.connectPromise;
  }

  private async rejoinAllTopics(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) return;
    const topics = Array.from(this.joinedTopics);
    for (const topic of topics) {
      try {
        await this.hubConnection.invoke('JoinTopic', topic);
      } catch {
        // best effort
      }
    }
  }

  /**
   * Join a topic. When server sends DataUpdated(topic), onDataUpdated emits that topic.
   * Call from component ngOnInit; pair with leaveTopic in ngOnDestroy.
   */
  joinTopic(topic: string): Promise<void> {
    if (!topic?.trim()) return Promise.resolve();
    this.joinedTopics.add(topic);
    return this.ensureConnection().then(() => {
      const conn = this.hubConnection;
      if (conn?.state === signalR.HubConnectionState.Connected) {
        return conn.invoke('JoinTopic', topic).catch((err) => {
          this.utils.showToast(
            err?.message ?? 'Could not subscribe to updates.',
            'Updates',
            'warning',
          );
        });
      }
      return Promise.resolve();
    });
  }

  /**
   * Leave a topic. Call from component ngOnDestroy.
   */
  leaveTopic(topic: string): Promise<void> {
    if (!topic?.trim()) return Promise.resolve();
    this.joinedTopics.delete(topic);
    const conn = this.hubConnection;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      return conn.invoke('LeaveTopic', topic).catch(() => {});
    }
    return Promise.resolve();
  }

  /** Disconnect and clear state. Call on logout if desired. */
  async disconnect(): Promise<void> {
    this.joinedTopics.clear();
    this.connectPromise = null;
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
      } catch {}
      this.hubConnection = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.dataUpdated$.complete();
    this.disconnect();
  }
}
