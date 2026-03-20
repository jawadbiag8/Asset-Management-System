import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-setup-configurations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="setup-screen">
      <h2 class="title">Configurations</h2>
      <p class="subtitle">Manage system configuration settings.</p>

      <div class="panel">
        <div class="panel-title">Coming soon</div>
        <div class="panel-text">This screen will contain configuration modules.</div>
      </div>
    </section>
  `,
  styles: [
    `
      .setup-screen {
        padding: 8px 0;
        color: rgba(255, 255, 255, 0.9);
      }
      .title {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
        color: #ffffff;
      }
      .subtitle {
        margin: 0 0 18px 0;
        color: rgba(255, 255, 255, 0.65);
        font-size: 14px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        padding: 18px 16px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
      }
      .panel-title {
        font-weight: 700;
        margin-bottom: 6px;
      }
      .panel-text {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        line-height: 1.45;
      }
    `,
  ],
})
export class SetupConfigurationsComponent {}

