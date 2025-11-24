import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule, Routes } from '@angular/router';
import { EuiCoreModule, EuiMaterialModule } from '@elemental-ui/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  CdrModule,
  ClassloggerService,
  DataSourceToolbarModule,
  DataTableModule,
  DataTilesModule,
  DataTreeModule,
  FkAdvancedPickerModule,
  LdsReplaceModule,
  QbmModule,
  RouteGuardService,
  TileModule,
} from 'qbm';
import { TilesModule } from 'qer';
import { BulkActionsDialogComponent } from './bulk-actions-dialog/bulk-actions-dialog.component';
import { BulkActionsComponent } from './bulk-actions.component';
import { BulkActionsService } from './bulk-actions.service';
import { DashboardPluginComponent } from './dashboard-plugin/dashboard-plugin.component';

const routes: Routes = [
  {
    path: 'bulk-actions',
    component: BulkActionsComponent,
    canActivate: [RouteGuardService],
    resolve: [RouteGuardService],
  },
];

@NgModule({
  declarations: [BulkActionsComponent, DashboardPluginComponent, BulkActionsDialogComponent],
  imports: [
    MatProgressBarModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    CdrModule,
    LdsReplaceModule,
    DataSourceToolbarModule,
    DataTableModule,
    DataTilesModule,
    QbmModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTableModule,
    MatDialogModule,
    RouterModule.forChild(routes),
    TranslateModule,
    CommonModule,
    TilesModule,
    EuiCoreModule,
    EuiMaterialModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    TileModule,
    DataTreeModule,
    FkAdvancedPickerModule,
  ],
  exports: [BulkActionsComponent],
})
export class BulkActionsModule {
  constructor(
    private readonly initializer: BulkActionsService,
    private readonly logger: ClassloggerService,
  ) {
    this.initializer.onInit(routes);
    this.logger.info(this, '🔥 bulk-actions loaded');
    this.logger.info(this, '▶️ bulk-actions initialized');
  }
}
