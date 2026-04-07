import { Component, Inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ApiResponse, ApiService, ServiceDetailAsset } from '../../../services/api.service';

export interface IntegrateApiDialogData {
  assets: ServiceDetailAsset[];
}

@Component({
  selector: 'app-integrate-api-dialog',
  templateUrl: './integrate-api-dialog.component.html',
  styleUrl: './integrate-api-dialog.component.scss',
  standalone: false,
})
export class IntegrateApiDialogComponent {
  downloadingAssetId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<IntegrateApiDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IntegrateApiDialogData,
    private readonly api: ApiService,
    private readonly toastr: ToastrService,
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  isDownloading(asset: ServiceDetailAsset): boolean {
    return this.downloadingAssetId === asset.assetId;
  }

  /** POST keys API; open returned file (PDF/binary or JSON+base64) in a new tab. */
  onDownloadKeys(asset: ServiceDetailAsset): void {
    const assetId = asset.assetId;
    if (assetId == null || !Number.isFinite(assetId)) {
      this.toastr.warning('Invalid asset.');
      return;
    }

    this.downloadingAssetId = assetId;
    this.api.postServiceCorrespondenceKeysBlob(assetId, true).subscribe({
      next: (res) => this.handleKeysBlobResponse(res),
      error: () => {
        this.downloadingAssetId = null;
        this.toastr.error('Could not retrieve file.');
      },
    });
  }

  private handleKeysBlobResponse(res: HttpResponse<Blob>): void {
    this.downloadingAssetId = null;
    const blob = res.body;
    if (!blob || blob.size === 0) {
      this.toastr.error('Empty response.');
      return;
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();

    if (ct.includes('application/json')) {
      blob.text().then((text) => {
        let parsed: ApiResponse<unknown>;
        try {
          parsed = JSON.parse(text) as ApiResponse<unknown>;
        } catch {
          this.toastr.error('Invalid JSON response.');
          return;
        }
        if (!parsed.isSuccessful) {
          this.toastr.error(parsed.message || 'Request failed.');
          return;
        }
        const opened = this.tryOpenFileFromApiData(parsed.data);
        if (opened) {
          this.toastr.success(parsed.message || 'Opened in new tab.');
        } else {
          this.toastr.success(parsed.message || 'Success.');
        }
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    this.toastr.success('Opened in new tab.');
  }

  /** Returns true if a tab was opened. */
  private tryOpenFileFromApiData(data: unknown): boolean {
    if (data == null) return false;

    if (typeof data === 'string') {
      return this.openBase64OrDataUrlInNewTab(data);
    }

    if (typeof data === 'object') {
      const o = data as Record<string, unknown>;
      const url = o['url'] ?? o['fileUrl'] ?? o['downloadUrl'];
      if (typeof url === 'string' && url.trim()) {
        const u = url.trim();
        window.open(
          /^https?:\/\//i.test(u) ? u : `https://${u}`,
          '_blank',
          'noopener,noreferrer',
        );
        return true;
      }

      const base64 =
        o['fileBase64'] ??
        o['file'] ??
        o['content'] ??
        o['pdfBase64'] ??
        o['base64'];
      const mime =
        (typeof o['mimeType'] === 'string' && o['mimeType']) ||
        (typeof o['contentType'] === 'string' && o['contentType']) ||
        'application/pdf';

      if (typeof base64 === 'string' && base64.length > 0) {
        return this.openBase64OrDataUrlInNewTab(base64, mime);
      }
    }

    return false;
  }

  private openBase64OrDataUrlInNewTab(raw: string, mimeType = 'application/pdf'): boolean {
    const trimmed = raw.trim();
    if (trimmed.startsWith('data:')) {
      window.open(trimmed, '_blank', 'noopener,noreferrer');
      return true;
    }

    try {
      let b64 = trimmed;
      const comma = b64.indexOf('base64,');
      if (comma !== -1) {
        b64 = b64.slice(comma + 'base64,'.length);
      }
      const binary = atob(b64.replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
      return true;
    } catch {
      this.toastr.error('Could not decode file data.');
      return false;
    }
  }
}
