import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-setup-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="setup-home">
      <div class="welcome">Welcome {{ username() }}</div>

      <div class="kpi-row" role="list">
        <div class="kpi-card" role="listitem">
          <div class="kpi-value">46</div>
          <div class="kpi-label">Total Ministries</div>
        </div>
        <div class="kpi-card" role="listitem">
          <div class="kpi-value">125</div>
          <div class="kpi-label">Total Departments</div>
        </div>
        <div class="kpi-card" role="listitem">
          <div class="kpi-value">46</div>
          <div class="kpi-label">Total Vendors</div>
        </div>
        <div class="kpi-card" role="listitem">
          <div class="kpi-value">3</div>
          <div class="kpi-label">Hosting Classification</div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .setup-home {
        padding: 8px 0;
        color: rgba(255, 255, 255, 0.9);
      }

      .welcome {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin: 6px 0 18px 0;
      }

      .kpi-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
        width: 100%;
      }

      .kpi-card {
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        padding: 18px 18px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
        min-height: 78px;
      }

      .kpi-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 6px;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .kpi-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      @media (max-width: 1200px) {
        .kpi-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .kpi-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SetupHomeComponent {
  username = signal<string>('Username');

  constructor(private utilsService: UtilsService) {
    const userData = this.utilsService.getStorage<{ username?: string; name?: string }>('user');
    this.username.set(userData?.name || userData?.username || 'Username');
  }
}

