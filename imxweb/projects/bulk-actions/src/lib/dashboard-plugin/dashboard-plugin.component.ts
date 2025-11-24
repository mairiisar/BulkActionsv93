import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MethodDescriptor, TimeZoneInfo } from '@imx-modules/imx-qbm-dbts';
import { AppConfigService } from 'qbm';
import { DashboardService } from 'qer';

@Component({
  templateUrl: './dashboard-plugin.component.html',
  styleUrls: ['./dashboard-plugin.component.scss'],
})
export class DashboardPluginComponent implements OnInit {
  dataSource: string[] = [];
  functionObjectsCount: number = 0;

  constructor(
    public readonly router: Router,
    private readonly dashboardSvc: DashboardService,
    private readonly config: AppConfigService,
  ) {}

  public async ngOnInit(): Promise<void> {
    const busy = this.dashboardSvc.beginBusy();
  
    try {
      this.dataSource = await this.config.apiClient.processRequest<string[]>(this.GetBulkActionsPermissions());
      this.calculateKeyCounts();
    } finally {
      busy.endBusy();
    }
  }

  public GoToCSVsync(): void {
    this.router.navigate(['/bulk-actions']);
  }

  calculateKeyCounts(): void {
    if (this.dataSource && this.dataSource.length > 0) {
      this.functionObjectsCount = this.dataSource.reduce((count, item) => {
        count += Object.keys(item).length;
        return count;
      }, 0);
    }
  }

  private GetBulkActionsPermissions(): MethodDescriptor<void> {
    const parameters = [];
    return {
      path: `/portal/bulkactions/permissions`,
      parameters,
      method: 'GET',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }
}
