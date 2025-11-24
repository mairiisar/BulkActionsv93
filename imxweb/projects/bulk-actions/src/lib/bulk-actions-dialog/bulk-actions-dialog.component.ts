import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { EndActionMsg, PreActionMessage } from '../bulk-actions.component';

export interface ProgressData {
  progress: number;
  processedRows: number;
  estimatedRemainingTime: string | null;
  totalRows: number;
  preActionMsg: PreActionMessage;
  loadingValidation: boolean;
  loadingImport: boolean;
  validateDialog: boolean;
  fileLoaded: boolean;
  allRowsValidated: boolean;
  processing: boolean;
  initializing: boolean;
  hardError: string;
  numberOfErrors: number;
  allImported: boolean;
  importError: boolean;
  importRowError: boolean;
  importTotalError: boolean;
  endActionMsg: EndActionMsg;
  importErrorMsg: string;
}

export interface BulkActionsDialogData {
  progressData$: BehaviorSubject<ProgressData>;
}

@Component({
  selector: 'app-bulk-actions-dialog',
  templateUrl: './bulk-actions-dialog.component.html',
  styleUrls: ['./bulk-actions-dialog.component.scss'],
})
export class BulkActionsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BulkActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BulkActionsDialogData,
  ) {}

  onClose(): void {
    this.data.progressData$.value.progress = 0;
    this.dialogRef.close();
  }
}
