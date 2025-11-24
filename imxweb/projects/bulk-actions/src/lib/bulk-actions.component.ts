import { AfterViewInit, ChangeDetectorRef, Component, ErrorHandler, OnInit, ViewChild } from '@angular/core';
import { FormControl, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { EuiSelectOption } from '@elemental-ui/core';
import { MethodDescriptor, TimeZoneInfo } from '@imx-modules/imx-qbm-dbts';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService, AuthenticationService } from 'qbm';
import { BehaviorSubject, distinctUntilChanged, Subscription } from 'rxjs';
import { BulkActionsDialogComponent, BulkActionsDialogData, ProgressData } from './bulk-actions-dialog/bulk-actions-dialog.component';
import { BulkActionsService } from './bulk-actions.service';

export interface PeriodicElement {
  ActionAttributes?: any;
  ValidationAttributes?: any;
  permission?: boolean;
  message?: string;
}

export interface csvTpl {
  Column: string;
  Value: string;
}

export interface ValidationElement {
  rowIndex: number;
  colIndex: number;
  message: string;
}

export interface PreActionElement {
  ActionAttributes?: any;
  ValidationAttributes?: any;
  message: string;
  permission: boolean;
  collectImportData?: boolean;
}

export interface EndElement {
  message: string;
  allImported: boolean;
  collectImportData: boolean;
}

interface PostedData {
  fileName?: string | null,
  totalRows: number;
  SuccessfulRowsCount: number;
  ErrorRowsCount: number;
  SuccessfulRows: SuccessfulRowData[];
  ErrorRows: ErrorRowData[];
}

interface SuccessfulRowData {
  index: string;
  columns: SuccessfulColumnData[];
}

interface SuccessfulColumnData {
  column: string;
  value: string;
}

interface ErrorRowData {
  index: string;
  columns: ErrorColumnData[];
}

export interface PreActionMessage {
  permission?: boolean;
  message?: string;
}

interface ErrorColumnData {
  column: string;
  value: string;
  error?: string;
}

export interface EndActionMsg {
  message: string;
  allImported: boolean;
}

@Component({
  selector: 'imx-bulk-actions',
  templateUrl: './bulk-actions.component.html',
  styleUrls: ['./bulk-actions.component.scss'],
})
export class BulkActionsComponent implements OnInit, AfterViewInit {
  public ValidationAttributes: any;
  public ActionAttributes: any;
  public functionOptions: EuiSelectOption[] = [];
  public selectedOptionKeyControl = new FormControl();
  report: PostedData | null = null;
  collectImportData: boolean = false;
  dbExceptions: string[] = [];
  startValidateObj: object;
  startImportObj: object;
  endImportObj: object;
  preActionMsg: PreActionMessage = {};
  endActionMsg: EndActionMsg = { message: '', allImported: false };
  totalRows: number = 0;
  importErrorMsg: string = '';
  fileInput: HTMLInputElement;
  allRowsValidated: boolean = false;
  validationResults$ = new BehaviorSubject<ValidationElement[]>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  csvDataSource: MatTableDataSource<any> = new MatTableDataSource();
  csvData: any[] = [];
  csvTemplate;
  fileLoaded: boolean = false;
  dialogHide: boolean = true;
  hardError: string = '';
  headers: string[] = [];
  validationResponses: any[] = [];
  validationResults: ValidationElement[] = [];
  allvalidated: boolean = false;
  allImported: boolean = false;
  public noDataText = '#LDS#No data';
  public noDataIcon = 'content-alert';
  public visibleRows: any[] = [];
  processing: boolean = false;
  initializing: boolean = false;
  shouldValidate: boolean = false;
  preValidateDialog: boolean = false;
  validateDialog: boolean = false;
  numberOfErrors: number = 0;
  public searchControl = new UntypedFormControl();
  private subscriptions: Subscription[] = [];
  loadingValidation = false;
  loadingImport = false;
  showProgressBar = false;
  processedRows = 0;
  selectedOptionKey: string | null = '';
  dataSource: string[] = [];
  CsvImporter: any;
  functionObjectsCount: number = 0;
  public BulkActionsCofigParamCount: number;
  progress: number = 0;
  estimatedRemainingTime: string | null;
  importError: boolean = false;
  ShowErrors: boolean = true;
  cancelAction: boolean = false;
  importRowError: boolean = false;
  cancelCheck: boolean = false;
  initialPageEvent = new PageEvent();
  importTotalError: boolean = false;
  forceAction: boolean = false;
  uploadedFileName: string | null = null;
  progressData$ = new BehaviorSubject<ProgressData>({
    progress: 0,
    processedRows: 0,
    estimatedRemainingTime: null,
    totalRows: 0,
    preActionMsg: this.preActionMsg,
    loadingValidation: this.loadingValidation,
    loadingImport: this.loadingImport,
    validateDialog: this.validateDialog,
    fileLoaded: this.fileLoaded,
    allRowsValidated: this.allRowsValidated,
    processing: this.processing,
    initializing: this.initializing,
    hardError: this.hardError,
    numberOfErrors: this.numberOfErrors,
    allImported: this.allImported,
    importError: this.importError,
    importRowError: this.importRowError,
    importTotalError: this.importTotalError,
    endActionMsg: this.endActionMsg,
    importErrorMsg: this.importErrorMsg,
  });

  constructor(
    private readonly translator: TranslateService,
    private readonly errorHandler: ErrorHandler,
    private readonly config: AppConfigService,
    private readonly authentication: AuthenticationService,
    private csvExportTemplate: BulkActionsService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {
    this.initSearchControl();
  }

  public filter(option: EuiSelectOption, searchInputValue: string): boolean {
    return option.display.toString().toUpperCase().trim().includes(searchInputValue.toUpperCase().trim());
  }

  public async ngOnInit(): Promise<void> {
    this.selectedOptionKey = null;
    this.numberOfErrors = 0;
    this.loadingValidation = false;
    this.loadingImport = false;

    this.processing = true;

    this.allvalidated = false;
    await this.BulkActionsPermissions();
    this.calculateKeyCounts();
    const rawValues = this.getObjectValues2();
    this.functionOptions = rawValues.map((value) => ({
      display: this.translator.instant(value),
      value: this.getReversedKey(value),
    }));
    this.subscriptions.push(
      this.selectedOptionKeyControl.valueChanges.subscribe(key =>
        this.updateForceAction(key)
      )
    );

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.uploadedFileName = null;
    this.validationResults$.complete();
    this.progressData$.complete();
    this.dialog.closeAll();
    this.importTotalError = false;
    this.progress = 0;
    this.totalRows = 0;
    this.processedRows = 0;
    this.selectedOptionKey = null;
    this.allRowsValidated = false;
    this.dbExceptions = [];
    this.allImported = false;
    this.collectImportData = false;
    this.report = null;
    this.validationResults$.next([]);
    this.csvDataSource = new MatTableDataSource();
    this.csvData = [];
    this.fileLoaded = false;
    this.headers = [];
    this.validationResponses = [];
    this.validationResults = [];
    this.CsvImporter = [];
    this.allvalidated = false;
    this.visibleRows = [];
    this.ValidationAttributes = null;
    this.ActionAttributes = null;
    this.processing = false;
    this.initializing = false;
    this.shouldValidate = false;
    this.numberOfErrors = 0;
    this.preActionMsg = { message: '', permission: false };
    this.endActionMsg = { message: '', allImported: false };
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private updateForceAction(key: string | null): void {
    const entry: any = (this.dataSource as any[]).find(o => o && (o as any)[key as string]);
    this.forceAction = !!entry?.[key as string]?.some((m: any) => m.ForceAction === '1');
  }


  openDialog(): void {
    const dialogData: BulkActionsDialogData = {
      progressData$: this.progressData$,
    };

    const dialogRef = this.dialog.open(BulkActionsDialogComponent, {
      width: '40%',
      data: dialogData,
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe(() => {
      this.endActionMsg.message = '';
      if (this.processing) {
        this.cancelAction = true;
        this.cancelCheck = true;
      } else {
        this.cancelCheck = false;
      }
      if (this.importTotalError) {
        this.importTotalError = false;
      }
      this.importError = false;
      this.importErrorMsg = '';
      this.dialogHide = true;
      this.progress = 0;
      this.processedRows = 0;
      this.estimatedRemainingTime = null;
      this.processing = false;
      this.loadingValidation = false;
      this.loadingImport = false;

      this.cdr.detectChanges();
    });
  }

  private initSearchControl(): void {
    this.searchControl.setValue('');
    this.subscriptions.push(
      this.searchControl.valueChanges.pipe(distinctUntilChanged()).subscribe(async (value) => {
        this.applyFilter();
      }),
    );
  }

  removeCsv() {
    this.uploadedFileName = null;
    this.ValidationAttributes = null;
    this.ActionAttributes = null;
    this.searchControl.setValue('');
    this.importTotalError = false;
    this.cancelAction = false;
    this.importRowError = false;
    this.cancelCheck = false;
    this.progress = 0;
    this.importError = false;
    this.hardError = '';
    this.importErrorMsg = '';
    this.csvDataSource.paginator?._changePageSize(20);
    this.dbExceptions = [];
    this.totalRows = 0;
    this.processedRows = 0;
    this.fileLoaded = false;
    this.allvalidated = false;
    this.collectImportData = false;
    this.report = null;
    this.allImported = false;
    this.allRowsValidated = false;
    this.processing = false;

    this.csvData = [];
    this.headers = [];
    this.csvDataSource.data = [];
    this.validationResponses = [];
    this.validationResults = [];
    this.validationResults$.next([]);

    this.numberOfErrors = 0;
    this.visibleRows = [];
    this.shouldValidate = false;
    this.searchControl.disable();
    this.preActionMsg = { message: '', permission: false };
    this.endActionMsg = { message: '', allImported: false };
    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  public formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  checkAllRowsValidated(): boolean {  
    if (this.forceAction) {
      return true;
    } else {
      return this.numberOfErrors === 0;
    }
  }

  exportErrorRows(): void {
    if (!this.report?.ErrorRows?.length) {
      return;
    }

    const csvRows = this.report.ErrorRows.map(errRow => {
      const rowObj: { [key: string]: string } = {};
      errRow.columns.forEach(col => {
        let errorText = col.error ?? '';
        if (errorText && typeof errorText === 'string' && errorText.startsWith('#LDS#')) {
          errorText = this.translator.instant(errorText);
        }

        rowObj[col.column] = col.value + (errorText ? `(error: ${errorText})` : '');
      });
      return rowObj;
    });

    const headers = this.headers.slice(1);
    this.csvExportTemplate.downloadFile(csvRows, headers, 'errorRows');
  }

  ngAfterViewInit() {
    this.initializing = true;

    this.processing = true;
    setTimeout(() => {
      this.csvDataSource.paginator = this.paginator;

      this.cdr.detectChanges();
      if (this.paginator) {

        this.initialPageEvent.pageIndex = 0;
        this.initialPageEvent.pageSize = this.paginator.pageSize;
        this.initialPageEvent.length = this.csvDataSource.data.length;

        this.pageChanged(this.initialPageEvent);
        this.paginator.page.subscribe((event) => {
          this.pageChanged(event);
        });
      } else {
        console.warn('Paginator is not available');
      }
      this.initializing = false;
    }, 800);
  }

  applyFilter() {
    const filterValue = this.searchControl.value;
    this.csvDataSource.filter = (filterValue ?? '').trim().toLowerCase();

    if (this.csvDataSource.paginator) {
      this.csvDataSource.paginator.firstPage();
    }
    this.cdr.detectChanges();
  }

  toggleErrors() {
    this.ShowErrors = !this.ShowErrors;
  }

  getErrorRowsAndHeaders(): string {
    const errorInfos = this.validationResults.map((result) => {
      const headerName = this.headers[result.colIndex];
      return `At row ${result.rowIndex + 1} the value of ${headerName}`;
    });
    return errorInfos.join(', ');
  }

  isRowError(rowIndex: number): boolean {
    const adjustedRowIndex = this.csvDataSource.filteredData[rowIndex + this.paginator.pageIndex * this.paginator.pageSize]?.[0] - 1;
    return this.validationResults.some((result) => result.rowIndex === adjustedRowIndex);
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
      this.uploadedFileName = file.name;
    }
    this.cdr.detectChanges();
  }

  onDragOver(event: any) {
    event.preventDefault();
    if (event.target) {
      event.target.classList.add('dragover');
    }
  }

  onDragLeave(event: any) {
    event.preventDefault();
    if (event.target) {
      event.target.classList.remove('dragover');
    }
  }

  triggerFileUpload() {
    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    this.fileInput = fileInput;
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  onDrop(event: any) {
    event.preventDefault();
    let files = event.dataTransfer.files;
    if (files.length > 0) {
      let file = files[0];
      if (file.type.match(/.csv/)) {
        this.processFile(file);
        this.uploadedFileName = file.name;
      }
    }
  }

  private processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const delimiter = this.guessDelimiter(data);
      const rows = this.parseCSV(data, delimiter);

      if (rows.length > 0 && file.type.match(/.csv/)) {
        const headers = rows[0].map((header) => header.trim());
        try {
          const parsedData = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index].trim()])));
          this.headers = ['Index', ...headers];
          this.csvData = parsedData.map((row, index) => [index + 1, ...Object.values(row)]);
          this.csvDataSource.data = this.csvData;
          this.fileLoaded = true;
          this.totalRows = parsedData.length;
        } catch (error) {
          this.fileLoaded = false;
          const errorMsg = 'Invalid CSV format. Please upload a valid CSV.';
          this.errorHandler.handleError(this.translator.instant(errorMsg));
        }
      }
    };
    this.searchControl.enable();
    reader.readAsText(file, 'UTF-8');
    this.allvalidated = false;
  }

  public guessDelimiter(data: string, potentialDelimiters: string[] = [';;', ',', ';', '\t', '|']): string {
    let guessedDelimiter = ',';
    let bestScore = -1;
    const lines = data.split('\n');

    for (const delimiter of potentialDelimiters) {
      let scores = new Map();
      for (const line of lines) {
        const count = line.split(delimiter).length - 1;
        scores.set(count, (scores.get(count) || 0) + 1);
      }

      let maxCount = 0;
      let modeFrequency = 0;
      for (const [count, frequency] of scores) {
        if (frequency > modeFrequency) {
          modeFrequency = frequency;
          maxCount = count;
        }
      }

      let score = modeFrequency;
      if (score > bestScore && maxCount > 0) {
        bestScore = score;
        guessedDelimiter = delimiter;
      } else if (score == bestScore && maxCount > 0 && delimiter == ';;') {
        guessedDelimiter = delimiter;
      }
    }
    return guessedDelimiter;
  }

  private parseCSV(data: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let insideQuote = false;
    let isCommentLine = false;

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const nextChar = i < data.length - 1 ? data[i + 1] : null;
      if ((char === '\n' || char === '\r') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (currentRow.length === 0 && currentValue.trim().startsWith('#')) {
          isCommentLine = true;
        }
        if (!isCommentLine) {
          currentRow.push(currentValue);
          if (currentRow.some((cell) => cell.trim() !== '')) {
            rows.push(currentRow);
          }
        }
        currentRow = [];
        currentValue = '';
        isCommentLine = false;
        continue;
      }

      if (isCommentLine) {
        continue;
      }

      if (delimiter === ';;') {
        if (data.substring(i, i + 2) === ';;' && !insideQuote) {
          if (currentValue.trim() !== '') {
            currentRow.push(currentValue);
          }
          currentValue = '';
          i++;
          continue;
        }
      }

      if (char === '"' && insideQuote && nextChar === '"') {
        currentValue += '"';
        i++;
      } else if (char === '"' && insideQuote) {
        if (nextChar !== null && nextChar !== delimiter && nextChar !== '\n' && nextChar !== '\r') {
          currentValue += char;
        } else {
          insideQuote = false;
        }
      } else if (char === '"' && !insideQuote) {
        insideQuote = true;
        if (currentValue !== '') {
          currentValue += char;
        }
      } else if (char === delimiter && !insideQuote) {
        currentRow.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    if (!isCommentLine && (currentValue !== '' || currentRow.length > 0)) {
      currentRow.push(currentValue);
      rows.push(currentRow);
    }

    return rows;
  }

  getValidationResult(rowIndex: number, colIndex: number): string | undefined {
    const adjustedRowIndex = this.csvDataSource.filteredData[rowIndex + this.paginator.pageIndex * this.paginator.pageSize]?.[0] - 1;
    const validationResult = this.validationResults.find((result) => result.rowIndex === adjustedRowIndex && result.colIndex === colIndex);
    return validationResult?.message;
  }

  isValidationError(rowIndex: number, colIndex: number): boolean {
    return this.getValidationResult(rowIndex, colIndex) !== undefined;
  }

  public pageChanged(event: PageEvent): void {
    const startIndex = event.pageIndex * event.pageSize;
    let endIndex = startIndex + event.pageSize;

    if (endIndex > this.csvDataSource.data.length) {
      endIndex = this.csvDataSource.data.length;
    }

    this.visibleRows = this.csvDataSource.data.slice(startIndex, endIndex);
    this.cdr.detectChanges();
  }

  public async validateRowBeforeImport(endpoint: string, csvRow: any): Promise<boolean> {
    let isValid: boolean = true;
    let rowToValidate: any = {
      fileName: this.uploadedFileName,
      headerNames: this.headers.slice(1),
      index: csvRow[0].toString(),
      columns: [],
    };

    if (this.ValidationAttributes) {
      rowToValidate = {
        fileName: this.uploadedFileName,
        headerNames: this.headers.slice(1),
        index: csvRow[0].toString(),
        columns: [],
        ValidationAttributes: this.ValidationAttributes,
      };
    }

    for (let colIndex = 1; colIndex < csvRow.length; colIndex++) {
      const header = this.headers[colIndex];
      const value = csvRow[colIndex];

      rowToValidate.columns.push({
        column: header,
        value: value ? value.trim() : '',
      });
    }

    try {
      let validationResponse: any = await this.config.apiClient.processRequest(this.validateRow(endpoint, rowToValidate));
      for (const responseItem of validationResponse) {
        const column = responseItem.column;
        const errorMsg = responseItem.errorMsg;
        if (responseItem.ValidationAttributes) {
          this.ValidationAttributes = responseItem.ValidationAttributes;
        }

        for (let colIndex = 1; colIndex < this.headers.length; colIndex++) {
          const header = this.headers[colIndex];
          if (column === header && errorMsg) {
            this.validationResults.push({ rowIndex: csvRow[0] - 1, colIndex, message: errorMsg });
            this.allvalidated = false;
            this.numberOfErrors++;
            isValid = false;
          }
        }
      }

      return isValid;
    } catch (error) {
      return isValid;
    }
  }

  public async importToDatabase(endpoint: string): Promise<PeriodicElement[]> {
    if (this.forceAction) {
      this.dbExceptions = [];
      this.validationResults = [];
    }
    this.loadingImport = true;
    const csvData = this.csvDataSource.data;
    const results: PeriodicElement[] = [];
    this.processing = true;
    let totalTimeTaken = 0;
    let estimatedRemainingSecs = 0;

    if (this.collectImportData) {
      this.report = this.report ?? {
        fileName: this.uploadedFileName,
        totalRows: csvData.length,
        SuccessfulRowsCount: 0,
        ErrorRowsCount: 0,
        SuccessfulRows: [],
        ErrorRows: [],
      };
    }

    for (const [rowIndex, csvRow] of csvData.entries()) {
      if (this.cancelAction) {
        break;
      }
      let inputParameter: any = {
        columns: [],
      };
      inputParameter.fileName = this.uploadedFileName,
      inputParameter.index = csvRow[0].toString();
      const csvRowValues = this.headers.map((header, index) => {
        const cleanCellValue = typeof csvRow[index] === 'string' ? csvRow[index].replace(/[\r\n]+/g, '').trim() : csvRow[index];
        inputParameter.columns.push({
          column: header,
          value: cleanCellValue.toString(),
        });
        return cleanCellValue.toString();
      });

      const startTime = performance.now();
      const isValidRow = await this.validateRowBeforeImport(endpoint, csvRowValues);
      if (this.ValidationAttributes) {
        inputParameter.ValidationAttributes = this.ValidationAttributes;
      }
      if (this.ActionAttributes) {
        inputParameter.ActionAttributes = this.ActionAttributes;
      }
      if (isValidRow) {
        try {
          let data: any = await this.config.apiClient.processRequest(this.PostObject(endpoint, inputParameter));
          if (Array.isArray(data)) {
            for (const responseItem of data) {
              if (responseItem.ActionAttributes) {
                this.ActionAttributes = responseItem.ActionAttributes;
              }
              if (responseItem.ValidationAttributes) {
                this.ValidationAttributes = responseItem.ValidationAttributes;
              }
            }
          }

          if (this.collectImportData && this.report) {
            this.report.SuccessfulRows.push({
              index: csvRowValues[0].toString(),
              columns: csvRowValues.slice(1).map((value, colIndex) => ({
                column: this.headers[colIndex + 1],
                value: value,
              })),
            });

            this.report.SuccessfulRowsCount++;
          }

          results.push(data);
        } catch (error) {
          this.validationResults.push({ rowIndex: parseInt(csvRowValues[0]) - 1, colIndex: -1, message: '' });
          this.allvalidated = false;
          this.dbExceptions.push(`Error submitting row ${csvRowValues[0]}: ${error}`);

          if (this.collectImportData && this.report) {
            this.report.ErrorRows.push({
              index: csvRowValues[0].toString(),
              columns: this.createErrorColumns(csvRowValues, `${error}`),
            });

            this.report.ErrorRowsCount++;
          }
        } finally {
          this.processedRows++;
          const endTime = performance.now();
          const timeTaken = endTime - startTime;
          totalTimeTaken += timeTaken;
          const averageTimePerRow = totalTimeTaken / this.processedRows;
          estimatedRemainingSecs = (averageTimePerRow * (this.totalRows - this.processedRows)) / 1000;
          this.progress = (this.processedRows / this.totalRows) * 100;
          this.estimatedRemainingTime = this.formatTime(estimatedRemainingSecs);
          this.progressData();
        }
      } else {
        this.importRowError = true;

        if (this.collectImportData && this.report) {
          const allColumnsWithErrorInfo = csvRowValues.slice(1).map((value, colIndex) => {
            const header = this.headers[colIndex + 1];
            const errorInfo = this.validationResults.find(
              (vr) => vr.rowIndex === parseInt(csvRowValues[0]) - 1 && vr.colIndex === colIndex + 1,
            );

            return {
              column: header,
              value: value,
              error: errorInfo ? errorInfo.message : undefined,
            };
          });

          this.report.ErrorRows.push({
            index: csvRowValues[0].toString(),
            columns: allColumnsWithErrorInfo,
          });

          this.report.ErrorRowsCount++;
        }
      }
    }

    this.allRowsValidated = false;
    this.allImported = true;
    this.processing = false;

    setTimeout(() => {
      this.loadingImport = false;
      this.progressData();
    });

    return results;
  }

  private createErrorColumns(csvRow: any[], errorMessage: string): ErrorColumnData[] {
    return csvRow.slice(1).map((value, colIndex) => ({
      column: this.headers[colIndex + 1],
      value: value,
      error: errorMessage,
    }));
  }

  private PostObject(endpoint: string, inputParameterName: any): MethodDescriptor<PeriodicElement> {
    return {
      path: `/portal/webportalplus/${endpoint}/action`,
      parameters: [
        {
          name: 'inputParameterName',
          value: inputParameterName,
          in: 'body',
        },
      ],
      method: 'POST',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }

  convertObjectValuesToStrings(obj: { [key: string]: any }): { [key: string]: string } {
    const convertedObj: { [key: string]: string } = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        convertedObj[key] = String(obj[key]);
      }
    }
    return convertedObj;
  }

  public progressData(): void {
    this.progressData$.next({
      progress: this.progress,
      processedRows: this.processedRows,
      estimatedRemainingTime: this.estimatedRemainingTime,
      totalRows: this.totalRows,
      preActionMsg: this.preActionMsg,
      loadingValidation: this.loadingValidation,
      loadingImport: this.loadingImport,
      validateDialog: this.validateDialog,
      fileLoaded: this.fileLoaded,
      allRowsValidated: this.allRowsValidated,
      processing: this.processing,
      initializing: this.initializing,
      hardError: this.hardError,
      numberOfErrors: this.numberOfErrors,
      allImported: this.allImported,
      importError: this.importError,
      importRowError: this.importRowError,
      importTotalError: this.importTotalError,
      endActionMsg: this.endActionMsg,
      importErrorMsg: this.importErrorMsg,
    });
  }

  public async onExport(endpoint: string) {
    let csvTemplate = this.getCsvTpl(endpoint);
  }

  public check(obj) {
    obj.map((item) => {
      this.csvTemplate = {};
      item.forEach((subitem) => {
        this.csvTemplate[subitem.Column] = this.csvTemplate[subitem.Value];
      });
    });
  }

  public async onValidate(endpoint: string): Promise<void> {
    this.ValidationAttributes = null;
    this.ActionAttributes = null;
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
    this.endActionMsg = { message: '', allImported: false };
    this.loadingValidation = true;
    this.report = null;
    this.dbExceptions = [];
    this.allRowsValidated = false;
    this.importRowError = false;
    this.shouldValidate = true;

    this.startValidateObj = this.getStartValidateData(endpoint, { totalRows: this.totalRows, headerNames: this.headers, fileName: this.uploadedFileName });
    this.progressData();
  }

  public async onSubmit(endpoint: string): Promise<void> {
    this.report = null;
    this.progress = 0;
    this.processedRows = 0;
    this.estimatedRemainingTime = null;
    this.shouldValidate = true;
    this.preValidateDialog = true;
    if (this.ValidationAttributes) {
      this.startImportObj = this.getStartImportData(endpoint, {
        fileName: this.uploadedFileName,
        totalRows: this.totalRows,
        headerNames: this.headers,
        ValidationAttributes: this.ValidationAttributes,
      });
    }
    if (!this.ValidationAttributes) {
      this.startImportObj = this.getStartImportData(endpoint, { fileName: this.uploadedFileName, totalRows: this.totalRows, headerNames: this.headers });
    }
    this.progressData();
  }

  public async beginValidation(endpoint: string): Promise<void> {
    this.preValidateDialog = false;
    this.shouldValidate = true;
    this.progressData();
    await this.validate(endpoint);
  }

  public async beginImport(endpoint: string): Promise<void> {
    this.shouldValidate = true;
    this.progressData();

    await this.importToDatabase(endpoint);
    if (!this.collectImportData) {
      this.endImportObj = this.getEndImportData(endpoint, { fileName: this.uploadedFileName, totalRows: this.totalRows });
    } else {
      this.endImportObj = this.getEndImportData(endpoint, this.report);
    }
    this.progressData();
  }

  public async validate(endpoint: string): Promise<void> {
    this.cancelAction = false;
    this.processing = false;
    this.processing = true;
    this.allImported = false;

    this.loadingValidation = true;
    if (this.initializing || !this.shouldValidate) {
      setTimeout(() => {
        this.loadingValidation = false;
      });
      return;
    }
    this.validationResults = [];
    this.allvalidated = true;
    this.numberOfErrors = 0;
    let totalTimeTaken = 0;
    let estimatedRemainingSecs = 0;
    this.cancelAction = false;
    this.progressData();

    for (const [rowIndex, csvRow] of this.csvData.entries()) {
      if (this.cancelAction) {
        break;
      }

      let rowToValidate: any = {
        fileName: this.uploadedFileName,
        headerNames: this.headers.slice(1),
        index: (rowIndex + 1).toString(),
        columns: [],
      };

      if (this.ValidationAttributes) {
        rowToValidate = {
          fileName: this.uploadedFileName,
          headerNames: this.headers.slice(1),
          index: (rowIndex + 1).toString(),
          columns: [],
          ValidationAttributes: this.ValidationAttributes,
        };
      }

      for (let colIndex = 1; colIndex < csvRow.length; colIndex++) {
        const header = this.headers[colIndex];

        rowToValidate.columns.push({
          column: header,
          value: csvRow[colIndex],
        });
      }

      const startTime = performance.now();
      try {
        let validationResponse: any = await this.config.apiClient.processRequest(this.validateRow(endpoint, rowToValidate));
        for (const responseItem of validationResponse) {
          const column = responseItem.column;
          const errorMsg = responseItem.errorMsg;
          if (responseItem.ValidationAttributes) {
            this.ValidationAttributes = responseItem.ValidationAttributes;
          }
          for (let colIndex = 1; colIndex < this.headers.length; colIndex++) {
            const header = this.headers[colIndex];
            if (column === header && errorMsg) {
              this.validationResults.push({ rowIndex, colIndex, message: errorMsg });
              this.allvalidated = false;
              this.numberOfErrors++;
            }
          }
        }
      } catch (error) {
        this.allvalidated = false;
        this.validationResults$.next(this.validationResults);
      } finally {
        this.processedRows = Math.min(this.processedRows + 1, this.totalRows);
        const endTime = performance.now();
        const timeTaken = endTime - startTime;
        totalTimeTaken += timeTaken;
        const averageTimePerRow = totalTimeTaken / this.processedRows;
        estimatedRemainingSecs = Math.max(0, (averageTimePerRow * (this.totalRows - this.processedRows)) / 1000);
        this.progress = (this.processedRows / this.totalRows) * 100;
        this.estimatedRemainingTime = this.formatTime(estimatedRemainingSecs);
        this.progressData();
      }
    }

    this.cancelAction = false;
    this.processing = false;
    this.csvDataSource.paginator?._changePageSize(this.totalRows);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.loadingValidation = false;
      this.progressData();
    });
    this.allRowsValidated = this.checkAllRowsValidated();
  }

  public async val(endpoint: string, rowToValidate: any): Promise<object> {
    const val = await this.config.apiClient.processRequest(this.validateRow(endpoint, rowToValidate));
    return val;
  }

  private validateRow(endpoint: string, rowToValidate: any): MethodDescriptor<ValidationElement> {
    return {
      path: `/portal/webportalplus/${endpoint}/validate`,
      parameters: [
        {
          name: 'rowToValidate',
          value: rowToValidate,
          in: 'body',
        },
      ],
      method: 'POST',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }

  public async getCsvTpl(endpoint: string): Promise<csvTpl[]> {
    const data = await this.config.apiClient.processRequest(this.csvTpl(endpoint));

    this.csvTemplate = [{}];
    let csvHeaders: string[] = [];

    data.forEach((item) => {
      this.csvTemplate[0][item.Column] = item.Value;
      csvHeaders.push(item.Column);
    });

    this.csvExportTemplate.downloadFile(this.csvTemplate, csvHeaders, 'csvTemplate');
    return data;
  }

  public async getStartValidateData(endpoint: string, startobject: any): Promise<object> {
    const msg = await this.config.apiClient.processRequest(this.startValidateMethod(endpoint, startobject));
    if (msg.ValidationAttributes) {
      this.ValidationAttributes = msg.ValidationAttributes;
    }
    this.preActionMsg = msg;
    this.progressData();

    if (msg.permission === true) {
      this.beginValidation(endpoint);
    }
    this.dialogHide = false;
    this.progressData();

    this.openDialog();
    return msg;
  }

  public async getStartImportData(endpoint: string, startobject: any): Promise<object> {
    const msg = await this.config.apiClient.processRequest(this.startImportMethod(endpoint, startobject));
    this.preActionMsg = msg;
    this.progressData();
    if (msg.ValidationAttributes) {
      this.ValidationAttributes = msg.ValidationAttributes;
    }
    if (msg.ActionAttributes) {
      this.ActionAttributes = msg.ActionAttributes;
    }
    if (msg.collectImportData) {
      this.collectImportData = true;
    }
    if (msg.permission === true) {
      this.beginImport(endpoint);
    }
    this.dialogHide = false;
    this.progressData();

    this.openDialog();
    return msg;
  }

  public async getEndImportData(endpoint: string, startobject: any): Promise<object> {
    if (this.ActionAttributes) {
      startobject.ActionAttributes = this.ActionAttributes;
    }
    if (this.ValidationAttributes) {
      startobject.ValidationAttributes = this.ValidationAttributes;
    }
    const msg = await this.config.apiClient.processRequest(this.endImportMethod(endpoint, startobject));

    this.endActionMsg = msg;

    if (!this.cancelCheck) {
      this.progressData();
    }

    if (!msg.allImported && !this.cancelAction) {
      this.importError = true;
      this.importErrorMsg = msg.message;
      this.importTotalError = true;
    }

    this.progressData();

    return msg;
  }

  private startValidateMethod(endpoint: string, startobject: any): MethodDescriptor<PreActionElement> {
    return {
      path: `/portal/webportalplus/${endpoint}/startvalidate`,
      parameters: [
        {
          name: 'startobject',
          value: startobject,
          in: 'body',
        },
      ],
      method: 'POST',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }

  private startImportMethod(endpoint: string, startobject: any): MethodDescriptor<PreActionElement> {
    return {
      path: `/portal/webportalplus/${endpoint}/startaction`,
      parameters: [
        {
          name: 'startobject',
          value: startobject,
          in: 'body',
        },
      ],
      method: 'POST',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }

  private endImportMethod(endpoint: string, startobject: any): MethodDescriptor<EndElement> {
    return {
      path: `/portal/webportalplus/${endpoint}/endaction`,
      parameters: [
        {
          name: 'startobject',
          value: startobject,
          in: 'body',
        },
      ],
      method: 'POST',
      headers: {
        'imx-timezone': TimeZoneInfo.get(),
      },
      credentials: 'include',
      observe: 'response',
      responseType: 'json',
    };
  }

  private csvTpl(endpoint: string): MethodDescriptor<csvTpl[]> {
    const parameters = [];
    return {
      path: `/portal/webportalplus/${endpoint}/csvtemplate`,
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

  getObjectValues2(): string[] {
    return this.dataSource
      .flatMap((item) => {
        const key = Object.keys(item)[0];
        return item[key].filter((subItem: any) => subItem.DisplayName).map((subItem: any) => subItem.DisplayName);
      })
      .sort((a, b) => a.localeCompare(b));
  }

  getReversedKey(displayName: string): string {
    let keyFound = '';

    for (const item of this.dataSource) {
      const key = Object.keys(item)[0];
      const found = item[key].find((val: any) => val.DisplayName === displayName);

      if (found) {
        keyFound = key;
        break;
      }
    }

    return keyFound;
  }

  calculateKeyCounts(): void {
    if (this.dataSource && this.dataSource.length > 0) {
      this.functionObjectsCount = this.dataSource.reduce((count, item) => {
        count += Object.keys(item).length;
        return count;
      }, 0);
    }
  }

  public async BulkActionsPermissions(): Promise<void> {
    const CsvImporter = await this.config.apiClient.processRequest<string[]>(this.GetBulkActionsPermissions());
    this.dataSource = CsvImporter;
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
