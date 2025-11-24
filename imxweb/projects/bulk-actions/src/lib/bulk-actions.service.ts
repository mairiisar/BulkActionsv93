import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';
import { ExtService } from 'qbm';
import { DashboardPluginComponent } from './dashboard-plugin/dashboard-plugin.component';

@Injectable({
  providedIn: 'root'
})
export class BulkActionsService {

  constructor(
    private readonly extService: ExtService,
    private readonly router: Router
  ) { }

  public async onInit(routes: Route[]): Promise<void> {
    this.addRoutes(routes);

    this.extService.register('Dashboard-MediumTiles', { instance: DashboardPluginComponent });
  }

  private addRoutes(routes: Route[]): void {
    const config = this.router.config;
    routes.forEach(route => {
      config.unshift(route);
    });
    this.router.resetConfig(config);
  }

  downloadFile(data, colheaders, filename='data') {
    let csvData = this.ConvertToCSV(data, colheaders);
    console.log(csvData)
    let blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    let dwldLink = document.createElement("a");
    let url = URL.createObjectURL(blob);
    let isSafariBrowser = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
    if (isSafariBrowser) {
        dwldLink.setAttribute("target", "_blank");
    }
    dwldLink.setAttribute("href", url);
    dwldLink.setAttribute("download", filename + ".csv");
    dwldLink.style.visibility = "hidden";
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
}

ConvertToCSV(objArray, headerList) {
     let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
     let str = '';
     let row = '';

     for (let index in headerList) {
         row += headerList[index] + ',';
     }
     row = row.slice(0, -1);
     str += row + '\r\n';
     for (let i = 0; i < array.length; i++) {
         let line = '';
         for (let index in headerList) {
            let head = headerList[index];

             line += array[i][head] + ',' ;
         }
         line = line.slice(0, -1);
         str += line + '\r\n';
     }
     return str;
 }
}
