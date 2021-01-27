import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TextBoxDirective } from '@progress/kendo-angular-inputs';
@Injectable({
   providedIn: 'root'
})
export class ARService {

   apiURL = 'https://gallery.gunnersens.com.au:8094/Service/ForestOneDataService/AR';

   constructor(private httpClient: HttpClient) { }


   public GetEnvironmentDetails() {

      const dat = { 'FACI': '' };
      return this.httpClient.post(`${this.apiURL}/GetEnvironmentDetails/`, dat);

   }


   public GetUserData(USID: string) {

      const dat = { 'USID': USID };
      return this.httpClient.post(`${this.apiURL}/GetUserData/`, dat);

   }

   public GetAROrders(faci: string) {

      const dat = { 'FACI': faci };
      return this.httpClient.post(`${this.apiURL}/GetOrders/`, dat);

   }


   public GetInvoiceList(type: string, customer: string) {

      const dat = { 'PYNO': customer, 'RECO': type, "OFFSET": "20" };
      return this.httpClient.post(`${this.apiURL}/GetInvoices/`, dat);

   }

   public getLastPaidInvoices(type: string, customer: string, lastDate: string) {

      const dat = { 'PYNO': customer, 'RECO': type, "DATE": lastDate };
      return this.httpClient.post(`${this.apiURL}/GetLastPaidInvoices/`, dat);

   }

   public ReprintInvoice(year: string, invoiceNo: string, userName: string, password: string) {

      const dat = { "EXIN": year, "YEA4": invoiceNo, "UserName": userName, "Password": password };

      return this.httpClient.post(`${this.apiURL}/PostInvoiceReprint/`, dat);

   }

   public ReleaseOrder(ORNO: string, FACI: string, USID: string, CONO: string, DIVI: string) {

      const dat = { "ORNO": ORNO, "FACI": FACI, "USID": USID, "CONO": CONO, "DIVI": DIVI };

      return this.httpClient.post(`${this.apiURL}/ReleaseOrder/`, dat);

   }

   public ReleaseOrderManually(ORNO: string, FACI: string, Status: string, USID: string, CONO: string, DIVI: string) {

      const dat = { "ORNO": ORNO, "FACI": FACI, "Status": Status, "USID": USID, "CONO": CONO, "DIVI": DIVI };

      return this.httpClient.post(`${this.apiURL}/ReleaseOrderManually/`, dat);

   }


   public GetVoucherList(PYNO: string) {

      const dat = { "PYNO": PYNO };

      return this.httpClient.post(`${this.apiURL}/GetLastPaidVouchers/`, dat);

   }

   public GetVoucherListByDates(PYNO: string, FromDate: string, ToDate: string) {

      const dat = { "PYNO": PYNO, "FromDate": FromDate, "ToDate": ToDate };

      return this.httpClient.post(`${this.apiURL}/GetLastPaidVouchersByDate/`, dat);

   }

   public GetBackOrderValue(PYNO: string) {

      const dat = { "PYNO": PYNO };

      return this.httpClient.post(`${this.apiURL}/GetBackOrderValue/`, dat);

   }

   public GetLastPayINVList(VONO: string) {

      const dat = { "VONO": VONO };

      return this.httpClient.post(`${this.apiURL}/GetInvoiceByVoucher/`, dat);

   }

   public SplitToLines(TEXT: string, TXID: string, TXVR: string, LNCD: string, USID: string) {

      const dat = { "TEXT": TEXT, "TXID": TXID, "TXVR": TXVR, "LNCD": LNCD, "USID": USID };
      console.log(dat);
      return this.httpClient.post(`${this.apiURL}/SplitToLines/`, dat);

   }








}
