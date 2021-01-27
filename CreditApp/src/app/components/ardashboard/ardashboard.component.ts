import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { ARService } from '../../services/ar.service';
import { CoreBase, MIRecord, IMIResponse, IMIRequest, IUserContext, } from '@infor-up/m3-odin';
import { MIService, UserService, FormService } from '@infor-up/m3-odin-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataStateChangeEvent, GridDataResult, GridComponent, GridItem, RowArgs, PageChangeEvent } from '@progress/kendo-angular-grid';
import { process, State } from '@progress/kendo-data-query';
import { IBookmark, IFormControlInfo } from '@infor-up/m3-odin';
import { Bookmark, IFormResponse } from '@infor-up/m3-odin/dist/form/base';
import { SohoMessageService } from 'ids-enterprise-ng';
import { DatePipe, formatDate } from '@angular/common'
import { TabStripComponent } from '@progress/kendo-angular-layout';
import { ApplicationService } from '@infor-up/m3-odin-angular';
import { Clipboard } from 'ts-clipboard';



@Component({
   selector: 'app-ardashboard',
   templateUrl: './ardashboard.component.html',
   encapsulation: ViewEncapsulation.None,
   styleUrls: ['./ardashboard.component.css', './pdf-styles.css', 'page-template.css']
})
export class ArdashboardComponent extends CoreBase implements OnInit {

   @ViewChild('tabstripInvoice') public tabstrip: TabStripComponent;

   company: string;
   currentCompany: string;
   division: string;
   currentDivision: string;
   language: string;
   currentLanguage: string;
   userContext = {} as IUserContext;
   isEnabledButtons: boolean;
   EnableCustomerTextBox: boolean = false;
   isSelected: boolean = true;

   FACI: string = "300";
   isBusyMyComponent = false;
   isBusyCustomerTextComponent = false;
   /**Grid Properties */
   private gridData: GridDataResult; // = process(this.OrderList, this.state);
   private gridCustomerData: GridDataResult; // = process(this.OrderList, this.state);
   private gridOpenInvoices: GridDataResult;
   private gridPaidInvoices: GridDataResult;
   private gridAllInvoices: GridDataResult;

   private state: State = {};
   private stateCustomer: State = {};
   private stateOpenInvoices: State = {};
   private statePaidInvoices: State = {};
   private stateAllInvoices: State = {};

   private OrderList; // Hold order list information
   private InvoiceListOpen; // Hold Invoice List Open list information
   private InvoiceListPaid; // Hold Invoice List Paid list information
   private InvoiceListAll; // Hold Invoice List All list information

   private selectedOrders: string[] = [];
   private selectedCustomers: string[] = [];
   private selectedPaidInvoices: string[] = [];
   private selectedOpenInvoices: string[] = [];
   private selectedAllInvoices: string[] = [];
   private selectedVoucher: string[] = [];

   private CurrentCustomerTXVR: string = "";
   private CurrentCustomerLNCD: string = "";
   private CurrentCustomerTXID: string = "";

   public IsTabCustomerDetailsSelected: Boolean = true;
   public IsTabCustomerDetailsUpdateSelected: Boolean = false;


   //**Iframe Properties */
   name = 'Set iframe source';
   url = 'https://lso.gunnersens.com.au:20008/mashup/web/ARCreditApp/ARDashboard';
   urlSafe: SafeResourceUrl;


   CustomerData;
   CUSName;
   CUSNo;
   CUSAddress1; CustomerFullAddress;
   CUSAddress2;
   CUSAddress3; CUSSales;
   CUSAddress4; CUSAccountContact; CUSAccountPhone; CUSGroup; CUSCreditLimit; CUSCRDLimit2; CUSCRDLimit3; CUSCRDLimit4;
   CUSPayer; CUSCurrency; CUSPersonalGuar; CUSPersonalGuarText; CUSCreatedDate; CUSLastPayment;
   CUSText: string = "";
   CUSTextNew;
   selectedCustomerID: string = "";
   selectedOrderID: string = "";
   public value: Date = new Date(2019, 5, 1, 22);
   public format: string = 'MM/dd/yyyy';

   //Control Tabs
   disableTabs = true;

   //Customer Update Variables
   UCUS_PHNO; UCUS_PHN2; UCUS_YREF; UCUS_YRE2; UCUS_CUNM; UCUS_CUA1;
   UCUS_CUA2; UCUS_CUA3; UCUS_CUA4; UCUS_PONO; UCUS_CSCD; UCUS_ECAR; UCUS_TXCO; UCUS_TOWN; UCUS_CFC5;
   CFC5Combine; UCUS_CRL1; UCUS_CRL2; UCUS_CRL3;



   constructor(private miService: MIService, private userService: UserService,
      public sanitizer: DomSanitizer, private arService: ARService, private readonly formService: FormService,
      private messageService: SohoMessageService, public datepipe: DatePipe, public appservice: ApplicationService) {
      super('ARDashboardComponent');
   }

   ngOnInit() {
      this.setBusy(true);
      this.userService.getUserContext().subscribe((userContext: IUserContext) => {
         this.setBusy(false);
         this.logInfo('onClickLoad: Received user context');
         this.userContext = userContext;

         this.updateUserValues(userContext);
      }, (error) => {
         this.setBusy(false);
         this.logError('Unable to get userContext ' + error);
         console.log('Unable to get userContext ' + error);
      });
      this.isEnabledButtons = true;
      this.dt = new Date();
      this.myDateFrom = new Date();
      this.myDateTo = new Date();

   }

   onFacilitySelected(FACI) {
      this.resetGlobleVar();
      this.FACI = FACI;
      this.setBusy(true);
      delete this.OrderList;
      this.ReloadOrdersInGrid();
   }


   ReloadOrdersInGrid() {

      delete this.gridData;
      this.arService.GetAROrders(this.FACI).subscribe((res) => {
         this.setBusy(false);
         this.OrderList = res;
         this.gridData = process(this.OrderList, this.state);
         // this.responce.forEach(element => { });

      });

   }

   /**Region UI Click Events */
   public onTabSelect(e) {
      console.log(e);
      this.disableTabs = true;
      //Change Invoice Tab to Aging
      this.tabstrip.selectTab(0);
      if (e.index == 1) {
         this.isEnabledButtons = true;
         this.resetGlobleVar();
      } else {
         this.isEnabledButtons = false;
         this.resetGlobleVar();
      }
   }


   public SaveCustomerDetails() {

      this.setBusyCustomerText(true);
      this.M3APICallCRS610MI_ChgBasicData();
      this.M3APICallCRS610MI_ChgFinancial();
      this.ClearCustomerDetails();


   }

   private M3APICallCRS610MI_ChgBasicData() {

      const request: IMIRequest = {
         program: 'CRS610MI',
         transaction: 'ChgBasicData',
         outputFields: ['CUNO'],
         maxReturnedRecords: 10,
      };

      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('CUNO', this.selectedCustomerID);
      inputRecord.setString('CUNM', this.UCUS_CUNM);
      inputRecord.setString('CUA1', this.UCUS_CUA1);
      inputRecord.setString('CUA2', this.UCUS_CUA2);
      inputRecord.setString('CUA3', this.UCUS_CUA3);
      inputRecord.setString('CUA4', this.UCUS_CUA4);

      inputRecord.setString('PONO', this.UCUS_PONO);
      inputRecord.setString('TOWN', this.UCUS_TOWN);
      inputRecord.setString('ECAR', this.UCUS_ECAR);

      inputRecord.setString('PHNO', this.UCUS_PHNO);
      inputRecord.setString('PHN2', this.UCUS_PHN2);
      inputRecord.setString('YREF', this.UCUS_YREF);
      inputRecord.setString('YRE2', this.UCUS_YRE2);
      inputRecord.setString('CFC5', this.UCUS_CFC5);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {

         if (!response.hasError()) {
            this.GetCustomerDataByMI(this.selectedCustomerID);
         }
      }, (error) => {

         this.logError('Unable to execute API : getCustomerList> ' + error);
      });
   }


   private M3APICallCRS610MI_ChgFinancial() {

      const request: IMIRequest = {
         program: 'CRS610MI',
         transaction: 'ChgFinancial',
         outputFields: [''],
         maxReturnedRecords: 10,
      };

      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('CUNO', this.selectedCustomerID);
      inputRecord.setString('CRL2', this.UCUS_CRL2);
      inputRecord.setString('CRL3', this.UCUS_CRL3);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusyCustomerText(false);
         if (!response.hasError()) {
            this.GetCustomerDataByMI(this.selectedCustomerID);
         }
      }, (error) => {
         this.setBusyCustomerText(false);
         // Handle error
         this.logError('Unable to execute API : getCustomerList> ' + error);
      });
   }

   public ClearCustomerDetails() {

      this.IsTabCustomerDetailsUpdateSelected = false;
      this.IsTabCustomerDetailsSelected = true;

   }

   public UpdateCustomerDetails() {


      this.IsTabCustomerDetailsUpdateSelected = true;
      this.IsTabCustomerDetailsSelected = false;

   }


   public onTabSelectAginSection(e) {
      let reco: string = "";//reco is whether of not the customer has paided 0 = not payed. 9 = payed
      if (this.selectedCustomerID.length == 0 && e.index != 0) {
         alert("Please select a customer!");

      } else {
         console.log(e.index);
         if (e.index == 0) { // Load Agin Data

         } else if (e.index == 1) {   // Load Open Invoices
            this.getInvoicesByRestAPI("0", this.selectedCustomerID, e.index + "")

         } else if (e.index == 2) {   // Load Paid Invoices
            this.getInvoicesByRestAPI("9", this.selectedCustomerID, e.index + "")

         } else if (e.index == 3) {   // Load All Invoices
            this.getInvoicesByRestAPI("3", this.selectedCustomerID, e.index + "")
         }
         else if (e.index == 4) {   // Load All Invoices
            // this.getInvoicesByRestAPI("4", this.selectedCustomerID, e.index + "")
         }
      }

   }

   m; y;
   PFMonth1 = "-"; PFMonth2 = "-"; PFMonth3 = "-"; AGMonth1 = "-"; AGMonth2 = "-"; AGMonth3 = "-";
   myDate: Date;
   public onSelectedOrderChange(e) {

      this.IsAgingDataLoaded = false;
      this.resetGlobleVar();
      this.disableTabs = false;
      //Change Invoice Tab to Aging
      this.tabstrip.selectTab(0);

      this.dt = new Date();
      this.value = new Date(); //this.datepipe.transform(this.dt, 'dd-MM-yyyy');
      this.isEnabledButtons = false;
      const len = this.selectedOrders.length;
      const _cuno = e[0].slice(0, e[0].indexOf('-'));

      var xx = e + '';
      var splitted = xx.split("-", 3);

      this.selectedOrderID = splitted[2];
      this.selectedCustomerID = _cuno;
      this.selectedCustomerID = this.selectedCustomerID.trim();
      console.log("onSelectedOrderChange:" + this.selectedCustomerID);
      this.GetCustomerDataByMI(_cuno);
      this.getCustomerCreatedDate(_cuno);
      //this.urlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
      this.GetCustomerText(_cuno);
      this.GetVoucherList(_cuno);

      //Get Date
      this.m = this.GetAgeDistrib();
      this.y = this.GetPmtForcast();

      this.LoadForcastData();
   }

   IsAgingDataLoaded: boolean = true;
   public onSelectedCustomerChange(e) {

      this.IsAgingDataLoaded = false;
      this.resetGlobleVar();

      this.disableTabs = false;
      //Change Invoice Tab to Aging
      this.tabstrip.selectTab(0);

      this.dt = new Date();
      this.myDate = new Date(this.datepipe.transform(this.dt, 'dd-MM-yyyy'));

      const len = this.selectedCustomers.length;
      const _cuno = e[0].slice(0, e[0].indexOf('-'));
      this.selectedCustomerID = _cuno;
      this.selectedCustomerID = this.selectedCustomerID.trim();
      this.GetCustomerDataByMI(_cuno);
      this.getCustomerCreatedDate(_cuno);
      this.GetCustomerText(_cuno);
      this.GetVoucherList(_cuno);

      this.m = this.GetAgeDistrib();
      this.y = this.GetPmtForcast();
      this.setOpenTabTo = true;

      this.LoadForcastData();

   }


   setOpenTabTo = true;
   myDateTo;
   myDateFrom;
   filterDateFrom;
   filterDateTo;
   public OnDateChangesFromDate(e) {
      var dt = new Date(e);
      this.myDateTo = this.datepipe.transform(dt, 'yyyy-MM-dd');
   }
   public OnDateChangesToDate(e) {
      var dt = new Date(e);
      this.myDateFrom = this.datepipe.transform(dt, 'yyyy-MM-dd');
   }

   dateChangedFrom(eventDate: string): Date | null {
      this.myDateFrom = eventDate;
      return !!eventDate ? new Date(eventDate) : null;
   }
   dateChangedTo(eventDate: string): Date | null {
      this.myDateTo = eventDate;
      return !!eventDate ? new Date(eventDate) : null;
   }

   searchInvoicesFromDate() {

      var _fromDate = new Date(this.myDateFrom);
      var _toDate = new Date(this.myDateTo);
      if (this.selectedCustomerID.length > 0) {

         if (_fromDate < _toDate) {
            var s_fromDate = this.datepipe.transform(this.myDateFrom, 'yyyyMMdd');
            var s__toDate = this.datepipe.transform(this.myDateTo, 'yyyyMMdd');



            this.GetVoucherListByDates(this.selectedCustomerID, s_fromDate, s__toDate);
         } else {
            alert("Invalid date range!");
         }
      } else {
         alert("Please select a valid customer!");
      }


   }

   //** Data State Change Functions for Grids */
   public dataStateChange(state: DataStateChangeEvent): void {
      this.state = state;
      this.gridData = process(this.OrderList, this.state);
   }
   public dataStateChangeCustomer(state: DataStateChangeEvent): void {
      var stateCustomerFilter = state.filter.filters;
      var arryStateCustomerFilter: any = {};
      arryStateCustomerFilter = stateCustomerFilter[0];

      console.log("**************************");
      console.log(arryStateCustomerFilter.value);
      var filterValue = arryStateCustomerFilter.value.toUpperCase();
      var arryStateCustomerFilterValue = filterValue;
      this.stateCustomer = state;
      this.getCustomerList(arryStateCustomerFilterValue);
   }
   public dataStateChangeOpenInvoices(state: DataStateChangeEvent): void {
      this.stateOpenInvoices = state;
      this.gridOpenInvoices = process(this.InvoiceListOpen, this.stateOpenInvoices);
   }
   public dataStateChangePaidInvoices(state: DataStateChangeEvent): void {
      this.statePaidInvoices = state;
      this.gridPaidInvoices = process(this.InvoiceListPaid, this.statePaidInvoices);
   }
   public dataStateChangeAllInvoices(state: DataStateChangeEvent): void {
      this.stateAllInvoices = state;
      this.gridAllInvoices = process(this.InvoiceListAll, this.stateAllInvoices);
   }
   //** Set Grid Selected Keys */
   public selectedCustomerKey(context: RowArgs): string {
      return context.dataItem.CUNO + '-' + context.index;
   }
   public selectedOrdersKey(context: RowArgs): string {
      return context.dataItem.OAPYNO + '-' + context.index + '-' + context.dataItem.OAORNO;
   }
   public selectedVoucherKey(context: RowArgs): string {
      return context.dataItem.ESVONO; '-' + context.index;//+ '-' + context.dataItem.OAORNO;
   }

   public selectedOrdersKeyInvoice(context: RowArgs): string {

      return context.dataItem.ESCINO;// + '-' + context.index + '-' + context.dataItem.OAORNO;
   }
   public selectedOpenInvoiceKey(context: RowArgs): string {
      return context.dataItem.ESCINO;// + '-' + context.index;
   }
   public selectedPaidInvoiceKey(context: RowArgs): string {
      return context.dataItem.ESCINO;// + '-' + context.index;
   }
   public selectedAllInvoiceKey(context: RowArgs): string {
      return context.dataItem.CUNO + '-' + context.index;
   }

   public selectedAllVoucherInvoiceKey(context: RowArgs): string {

      return context.dataItem.ESCINO + '-' + context.index;
   }

   //**End of Grid functions */



   getCustomerList(key) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CRS610MI',
         transaction: 'LstByNumber',
         outputFields: ['CUNO', 'CUNM', 'STAT', 'WHLO', 'PYNO'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('CUNO', key);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         if (!response.hasError()) {

            this.gridCustomerData = process(response.items, this.stateCustomer);

         }
      }, (error) => {
         this.setBusy(false);
         // Handle error
         this.logError('Unable to execute API : getCustomerList> ' + error);
      });

   }

   //**Get Customer Create Date */
   getCustomerCreatedDate(key) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CMS100MI',
         transaction: 'LstCusCrtDate',
         outputFields: ['OKRGDT'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('OKCUNO', key);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         if (!response.hasError()) {

            this.CUSCreatedDate = response.items[0].OKRGDT;

         }
      }, (error) => {
         this.setBusy(false);
         // Handle error
         this.logError('Unable to execute API : getCustomerCreatedDate> ' + error);
      });

   }

   //**Get Customer Last Paid Invoices */
   GetLastInvoicePayment(cusNo, DateRangeF, DateRangeT) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CMS100MI',
         transaction: 'LstLastPaidInvs',
         outputFields: ['ESPYNO', 'ESCINO', 'ESINYR', 'ESCUNO', 'ESTRCD', 'ESYEA4', 'ESJRNO', 'ESRECO', 'ESCUAM'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('FRECO', '0');
      inputRecord.setString('TRECO', '0');
      // inputRecord.setString('F&REDE', DateRangeF);
      // inputRecord.setString('T&REDE', DateRangeT);
      // inputRecord.setString('F&ACDT', DateRangeF);
      // // inputRecord.setString('T&ACDT', DateRangeT);
      inputRecord.setString('ESPYNO', cusNo);
      console.log("DateRangeF>" + DateRangeF + " | DateRangeT>" + DateRangeT + "  | cusNo" + cusNo);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         if (!response.hasError()) {

            this.CUSLastPayment = response.items[0].ESCUAM;

         }
      }, (error) => {
         this.setBusy(false);
         // Handle error
         this.logError('Unable to execute API : getCustomerCreatedDate> ' + error);
      });

   }



   //**Get Invoices By API  ** NOT IN USE */
   getInvoices(_type, _customer, _tab) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CMS100MI',
         transaction: 'LstInvsByType',
         outputFields: ['ESDIVI', 'ESPYNO', 'ESCINO', 'ESINYR', 'ESCUNO', 'ESTRCD', 'ESYEA4', 'ESJRNO', 'ESRECO'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('F_RECO', _type);
      inputRecord.setString('T_RECO', _type);
      inputRecord.setString('F_TRCD', '10');
      inputRecord.setString('T_TRCD', '10');
      inputRecord.setString('ESPYNO', _customer);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         if (!response.hasError()) {

            switch (_tab) {
               case "0":

                  break;
               case "1":
                  this.gridOpenInvoices = process(response.items, this.stateOpenInvoices);
                  break;
               case "2":
                  this.gridPaidInvoices = process(response.items, this.statePaidInvoices);
                  break;
               case "3":
                  this.gridAllInvoices = process(response.items, this.stateAllInvoices);
                  break;
            }

         }
      }, (error) => {
         this.setBusy(false);
         // Handle error
         this.logError('Unable to execute API ' + error);
      });

   }

   //**Get Invoices By Rest API */
   getInvoicesByRestAPI(_type, _customer, _tab) {

      this.setBusy(true);
      this.arService.GetInvoiceList(_type, _customer).subscribe((res) => {
         this.setBusy(false);
         console.log(res);

         switch (_tab) {
            case "0":

               break;
            case "1":

               this.OpenInvoiceList = res;
               this.loadItemsOpenInvoice();
               break;
            case "2":
               this.PaidInvoiceList = res;
               this.loadItemsPaidInvoice();
               break;
            case "3":
               this.AllinvoiceList = res;
               //this.gridAllInvoices = process(AllInvoiceResponce[0], this.stateAllInvoices);
               this.loadItemsAllInvoice();
               break;
            case "4":
               this.LastPaymentInvoiceList = res;
               //this.gridAllInvoices = process(AllInvoiceResponce[0], this.stateAllInvoices);
               this.loadItemsLastPaymentInvoice();
               break;
         }


      });

   }

   //Get Last Paid Invoice
   getLastPaidInvoices(VON) {

      this.setBusy(true);
      this.arService.GetLastPayINVList(VON).subscribe((res) => {
         this.setBusy(false);
         console.log("wwwwwwwwwwwwww");
         console.log(res);


         this.LastPaymentInvoiceList = res;

         this.loadItemsLastPaymentInvoice();


      });

   }



   /**All Invoice List - Data Grid */
   AllinvoiceList;
   public gridViewAllInvoice: GridDataResult;
   public pageSizeAllInvoice = 10;
   public skipAllInvoice = 0;

   public pageChangeAllInvoice(event: PageChangeEvent): void {
      this.skipAllInvoice = event.skip;
      this.loadItemsAllInvoice();
   }

   private loadItemsAllInvoice(): void {
      console.log(this.AllinvoiceList.length);
      this.gridViewAllInvoice = {
         data: this.AllinvoiceList.slice(this.skipAllInvoice, this.skipAllInvoice + this.pageSizeAllInvoice),
         total: this.AllinvoiceList.length
      };
   }

   /**Paid Invoice List - Data Grid gridViewPaidInvoice */
   PaidInvoiceList;
   public gridViewPaidInvoice: GridDataResult;
   public pageSizePaidInvoice = 10;
   public skipPaidInvoice = 0;

   public pageChangePaidInvoice(event: PageChangeEvent): void {
      this.skipPaidInvoice = event.skip;
      this.loadItemsPaidInvoice();
   }

   private loadItemsPaidInvoice(): void {
      this.gridViewPaidInvoice = {
         data: this.PaidInvoiceList.slice(this.skipPaidInvoice, this.skipPaidInvoice + this.pageSizePaidInvoice),
         total: this.PaidInvoiceList.length
      };
   }

   /**Open Invoice List - Data Grid gridViewPaidInvoice */
   OpenInvoiceList;
   public gridViewOpenInvoice: GridDataResult;
   public pageSizeOpenInvoice = 10;
   public skipOpenInvoice = 0;

   public pageChangeOpenInvoice(event: PageChangeEvent): void {
      this.skipOpenInvoice = event.skip;
      this.loadItemsOpenInvoice();
   }

   private loadItemsOpenInvoice(): void {
      this.gridViewOpenInvoice = {
         data: this.OpenInvoiceList.slice(this.skipOpenInvoice, this.skipOpenInvoice + this.pageSizeOpenInvoice),
         total: this.OpenInvoiceList.length
      };
   }
   /**END Of Open Invoice List - Data Grid gridViewPaidInvoice */

   /**LastPayment Invoice List Data Grid */
   LastPaymentInvoiceList;
   public gridViewLastPaymentInvoice: GridDataResult;
   public pageSizeLastPaymentInvoice = 10;
   public skipLastPaymentInvoice = 0;

   public pageChangeLastPaymentInvoice(event: PageChangeEvent): void {
      this.skipOpenInvoice = event.skip;
      //this.loadItemsLastPaymentInvoice();
   }

   private loadItemsLastPaymentInvoice(): void {

      this.gridViewLastPaymentInvoice = {
         data: this.LastPaymentInvoiceList.slice(this.skipLastPaymentInvoice, this.skipLastPaymentInvoice + this.pageSizeLastPaymentInvoice),
         total: this.LastPaymentInvoiceList.length
      };
   }
   /**END OfLastPayment Invoice List Data Grid */
   VoucherSelected;
   onSelectedVoucherChange(e) {
      delete this.LastPaymentInvoiceList;
      delete this.gridViewLastPaymentInvoice;
      this.VoucherSelected = e[0];
      console.log(this.VoucherSelected);

      this.getLastPaidInvoices(this.VoucherSelected);
   }

   resetGlobleVar() {

      delete this.filterDateFrom;
      delete this.filterDateTo;
      this.isSelected = true;
      delete this.gridDataVoucherList;
      delete this.gridViewLastPaymentInvoice;
      this.ReprintInvoiceNo = "";
      delete this.CustomerData;
      delete this.CUSName;
      delete this.CUSNo;
      delete this.CUSAddress1; delete this.CustomerFullAddress;
      delete this.CUSAddress2;
      delete this.CUSAddress3; delete this.CUSSales;
      delete this.CUSAddress4; delete this.CUSAccountContact; delete this.CUSAccountPhone; delete this.CUSGroup; delete this.CUSCreditLimit; delete this.CUSCRDLimit2;
      delete this.CUSCRDLimit3; delete this.CUSCRDLimit4;
      delete this.CUSPayer; delete this.CUSCurrency; delete this.CUSPersonalGuar; delete this.CUSPersonalGuarText; delete this.CUSCreatedDate; delete this.CUSLastPayment;
      delete this.CUSText;
      delete this.CUSTextNew;

      delete this.CurrentCustomerTXVR;
      delete this.CurrentCustomerLNCD;
      delete this.CurrentCustomerTXID;
      delete this.selectedOrderID;

      delete this.TOSB; delete this.TDUE; delete this.ACRT; delete this.CRL1; delete this.CRL2; delete this.TTUR; delete this.PTUR;
      delete this.LIDT; delete this.TTEV; delete this.PTEV; delete this.LPDT;
      delete this.TNOI; delete this.PNOI; delete this.BackOrderValue;
      delete this.CR01; delete this.CR02; delete this.CR03;
      delete this.CRA1; delete this.CRA2; delete this.CRA3;
      delete this.PFMonth1; delete this.PFMonth2; delete this.PFMonth3;
      delete this.AGMonth1; delete this.AGMonth2; delete this.AGMonth3;

      delete this.UCUS_PHNO;
      delete this.UCUS_PHN2;
      delete this.UCUS_YREF;
      delete this.UCUS_YRE2;
      delete this.UCUS_CUNM;
      delete this.UCUS_CUA1;
      delete this.UCUS_CUA2;
      delete this.UCUS_CUA3;
      delete this.UCUS_CUA4;
      delete this.UCUS_PONO;
      delete this.UCUS_CSCD;
      delete this.UCUS_ECAR;
      delete this.UCUS_CFC5;
      delete this.UCUS_TOWN;
      delete this.UCUS_CRL1;
      delete this.UCUS_CRL3;
      delete this.UCUS_CRL2;
      delete this.CFC5Combine;

   }


   ReprintInvoiceNo = "";
   IsReprintBtnEnable: boolean = false;
   /**Invoice Reprint */
   onSelectedInvoiceChange(e) {

      this.ReprintInvoiceNo = e[0]
   }

   onSelectedOpenInvoiceChange(e) {

      this.ReprintInvoiceNo = e[0]
   }

   onSelectedPaidInvoiceChange(e) {

      this.ReprintInvoiceNo = e[0]

   }
   onSelectedPaidInvoiceVoucherChange(e) {
      console.log(e);
      console.log(e[0]);
      var splitted = e[0].split("-", 1);
      console.log(splitted);
      this.ReprintInvoiceNo = splitted;
      console.log(this.ReprintInvoiceNo);
   }

   link: string = "OIS680";

   reprintInvoice() {


      try {
         console.log(this.ReprintInvoiceNo);
         Clipboard.copy(this.ReprintInvoiceNo);
         this.appservice.launch("OIS680");

      } catch (error) {

      }


      /*if (this.ReprintInvoiceNo.length > 0) {

         if (this.ReprintInvoiceNo.length < 10) {
            alert("Invoice number is not valid!");
         } else {

            this.setBusy(true);

            this.arService.ReprintInvoice("2021", this.ReprintInvoiceNo, "", "").subscribe((res) => {

               console.log(res);
            });
         }
      } else {
         this.setBusy(false);
         alert("Please select an Invoice to reprint!");
      }
      this.setBusy(false);*/
   }

   public gridDataVoucherList;

   GetVoucherList(cuno) {
      this.arService.GetVoucherList(cuno).subscribe((res) => {
         console.log(res);
         this.gridDataVoucherList = res;
      });
      this.setBusy(false);
   }

   GetVoucherListByDates(cuno, Fdate, Tdate) {
      this.arService.GetVoucherListByDates(cuno, Fdate, Tdate).subscribe((res) => {
         console.log(res);
         this.gridDataVoucherList = res;
      });
      this.setBusy(false);
   }

   BackOrderValue;
   GetBackOrder(cuno) {
      this.setBusy(true);
      this.arService.GetBackOrderValue(cuno).subscribe((res) => {
         console.log(res);
         this.BackOrderValue = res;
         this.setBusy(false);

      });

   }




   GetCustomerDataByMI(_CUNO) {


      this.setBusyCustomerText(true);

      const request: IMIRequest = {
         program: 'CRS610MI',
         transaction: 'LstByNumber',
         outputFields: ['CUNO', 'CUNM', 'CUA1', 'CUA2', 'CUA3', 'CUA4', 'YREF', 'YRE2', 'PHNO', 'CUCL', 'SMCD', 'CRLM', 'CRL2', 'CRL3', 'ODUD', 'PYNO', 'CUCD', 'CFC5', 'PHN2', 'TOWN', 'ECAR', 'CSCD', 'PONO'],
         maxReturnedRecords: 10,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('CUNO', _CUNO);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusyCustomerText(false);
         if (!response.hasError()) {

            this.CustomerData = response.items[0];
            console.log('API result', this.CustomerData);
            this.CUSName = this.CustomerData.CUNM;
            this.CUSAddress1 = this.CustomerData.CUA1;
            this.CUSAddress2 = this.CustomerData.CUA2;
            this.CUSAddress3 = this.CustomerData.CUA3;
            this.CUSAddress4 = this.CustomerData.CUA4;

            this.CustomerFullAddress = this.CUSAddress1.toString().trim();

            if (this.CUSAddress2.toString().length > 0) {
               this.CustomerFullAddress = this.CustomerFullAddress + ",   " + this.CUSAddress2.toString().trim();
            }
            if (this.CUSAddress3.toString().length > 0) {
               this.CustomerFullAddress = this.CustomerFullAddress + ",  " + this.CUSAddress3.toString().trim();
            }
            if (this.CUSAddress4.toString().length > 0) {
               this.CustomerFullAddress = this.CustomerFullAddress + ",   " + this.CUSAddress4.toString().trim();
            }

            if (this.CustomerData.YREF.length == 0) {
               this.CustomerData.YREF = "(Not available)";
            }

            if (this.CustomerData.PHNO.length == 0) {
               this.CustomerData.YREF = "(Not available)";
            }
            this.CUSAccountContact = this.CustomerData.YREF + ' - ' + this.CustomerData.PHNO;
            this.CUSAccountPhone = this.CustomerData.PHNO;
            this.CUSGroup = this.CustomerData.CUCL;
            var _CUSCreditLimit = this.CustomerData.CRLM;  // Logic to be implement
            this.CUSCreditLimit = _CUSCreditLimit;// "0";// _CUSCreditLimit.substring(0, 1);
            switch (this.CUSCreditLimit) {
               case "0":
                  this.CUSCreditLimit += "-Not Blocked";
                  break;
               case "1":
                  this.CUSCreditLimit += "-Block CO";
                  break;
               case "3":
                  this.CUSCreditLimit += "-Block CO,EQM";
                  break;
            }
            this.CUSCRDLimit2 = this.CustomerData.CRL2;
            this.CUSCRDLimit3 = this.CustomerData.CRL3;
            this.UCUS_CRL2 = this.CUSCRDLimit2;
            this.UCUS_CRL3 = this.CUSCRDLimit3;


            this.CUSCRDLimit4 = this.CustomerData.ODUD;
            this.CUSSales = this.CustomerData.SMCD;

            this.CUSPayer = this.CustomerData.PYNO;
            this.CUSCurrency = this.CustomerData.CUCD;
            this.CUSPersonalGuar = this.CustomerData.CFC5;
            this.UCUS_CFC5 = this.CustomerData.CFC5;
            switch (this.CUSPersonalGuar) {
               case "Y":
                  this.CUSPersonalGuarText = "Guarantee Provided";
                  break;
               case "N":
                  this.CUSPersonalGuarText = "No Guarantee";
                  break;
               default:
                  this.CUSPersonalGuarText = "Unspecified";
            }

            this.CFC5Combine = this.CUSPersonalGuar + " - " + this.CUSPersonalGuarText;

            this.UCUS_PHNO = this.CustomerData.PHNO;
            this.UCUS_PHN2 = this.CustomerData.PHN2;
            this.UCUS_YREF = this.CustomerData.YREF;
            this.UCUS_YRE2 = this.CustomerData.YRE2;
            this.UCUS_CUNM = this.CustomerData.CUNM;
            this.UCUS_CUA1 = this.CustomerData.CUA1;
            this.UCUS_CUA2 = this.CustomerData.CUA2;
            this.UCUS_CUA3 = this.CustomerData.CUA3;
            this.UCUS_CUA4 = this.CustomerData.CUA4;
            this.UCUS_PONO = this.CustomerData.PONO;
            this.UCUS_CSCD = this.CustomerData.CSCD;
            this.UCUS_ECAR = this.CustomerData.ECAR;
            // this.UCUS_TXCO = this.CustomerData.TXCO;
            this.UCUS_TOWN = this.CustomerData.TOWN;


         }
      }, (error) => {
         this.setBusyCustomerText(false);
         // Handle error
         this.logError('Unable to execute API ' + error);
      });

   }

   onCFC5Change(cfc5) {
      this.UCUS_CFC5 = cfc5;
      switch (this.UCUS_CFC5) {
         case "Y":
            this.CUSPersonalGuarText = "Guarantee Provided";
            break;
         case "N":
            this.CUSPersonalGuarText = "No Guarantee";
            break;
         default:
            this.CUSPersonalGuarText = "Unspecified";
      }
      this.CFC5Combine = this.UCUS_CFC5 + " - " + this.CUSPersonalGuarText;

   }


   dt;
   SelectedDateForInvoice(x) {
      this.dt = x;
      console.log(x);
   }

   updateUserValues(userContext: IUserContext) {
      this.company = userContext.company;
      this.division = userContext.division;
      this.language = userContext.language;

      this.currentCompany = userContext.currentCompany;
      this.currentDivision = userContext.currentDivision;
      this.currentLanguage = userContext.currentLanguage;
      this.currentDivision = '300';
      this.setBusy(true);
      this.arService.GetAROrders(this.FACI).subscribe((res) => {
         this.setBusy(false);
         this.OrderList = res;
         this.gridData = process(this.OrderList, this.state);
         // this.responce.forEach(element => { });

      });


   }

   private setBusy(isBusy: boolean) {
      this.isBusyMyComponent = isBusy;
   }

   private setBusyCustomerText(isBusy: boolean) {
      this.isBusyCustomerTextComponent = isBusy;
   }

   //***Region Retrive Customer Text***
   private GetCustomerText(_CUNO) {
      //List of MI's to get the textbox linked to a customer
      //This one gets the TextID


      const request: IMIRequest = {
         program: 'CRS980MI',
         transaction: 'GetTextID',
         outputFields: ['TXID'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('FILE', 'OCUSMA00');
      inputRecord.setString('KV01', '100');
      inputRecord.setString('KV02', _CUNO);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {

         if (!response.hasError()) {
            //Check row count
            this.CurrentCustomerTXID = response.item.TXID;

            this.GetCustomerTextLan(this.CurrentCustomerTXID, _CUNO);
         } else {

         }


      }, (error) => {
         this.setBusy(false);
         // Handle error

      });
   }

   private GetCustomerTextLan(_TXID, _CUNO) {

      //List of MI's to get the textbox linked to a customer
      //This one gets the TextID

      const request: IMIRequest = {
         program: 'CRS980MI',
         transaction: 'LstTxtBlocks',
         outputFields: ['TXVR', 'LNCD'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('TXID', _TXID);
      inputRecord.setString('TFIL', 'OSYTXH');
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {

         if (!response.hasError()) {
            //Check row count

            this.CurrentCustomerLNCD = response.item.LNCD;
            this.CurrentCustomerTXVR = response.item.TXVR;

            this.GetCustomerTextLines(_TXID, this.CurrentCustomerTXVR, this.CurrentCustomerLNCD);
         } else {

         }


      }, (error) => {

         // Handle error

      });
   }

   private GetCustomerTextLines(_TXID, _TXVR_, _LNCD) {
      this.CUSText = "";
      //List of MI's to get the textbox linked to a customer
      //This one gets the TextID
      delete this.CUSText;
      this.CUSText = "";

      const request: IMIRequest = {
         program: 'CRS980MI',
         transaction: 'SltTxtBlock',
         outputFields: ['TX60'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('TXID', _TXID);
      inputRecord.setString('TXVR', _TXVR_);
      inputRecord.setString('LNCD', _LNCD);
      inputRecord.setString('TFIL', 'OSYTXH');
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {

         if (!response.hasError()) {
            //Check row count
            response.items.forEach(element => {

               this.CUSText = this.CUSText + element.TX60 + '\n'

            });


         } else {

         }


      }, (error) => {

      });
   }

   //***Region Save Customer Text***
   isCustomerTextSaved: boolean = true;
   responceTextList;
   aa = 0;
   SaveCustomerText() {
      //when button save is pressed it will get the textbox from the bottom richtextbox, split it into 60 chars per line,Add each line to the MI
      this.setBusyCustomerText(true);

      this.CUSTextNew = this.CUSTextNew + "\n";
      this.arService.SplitToLines(this.CUSTextNew, this.CurrentCustomerTXID, this.CurrentCustomerTXVR, this.CurrentCustomerLNCD, this.userContext.USID).subscribe((res) => {

         this.setBusyCustomerText(false);
         delete this.CUSTextNew;
         this.GetCustomerText(this.selectedCustomerID);

      });

   }





   EditCustomerText() {
      this.EnableCustomerTextBox = true;
      this.CUSTextNew = this.CUSText;
   }

   shorten(text, max) {
      return text && text.length > max ? text.slice(0, max).split(' ').slice(0, -1).join(' ') : text
   }
   remaining(text, max) {
      return text && text.length > max ? text.slice(0, max) : text
   }

   //**Region Add Review Check */
   AddReveive() {

      if (this.selectedOrderID == "" || this.selectedOrderID == "undefined") {
         alert("Please select a order to continue!");
      } else {
         this.CheckCredReviewCheck();
      }

   }

   ReleaseOrder() {

      this.setBusy(true);
      if (this.selectedOrderID == "" || this.selectedOrderID == "undefined") {
         this.setBusy(false);
         alert("Please select an order!")

      } else {
         this.arService.ReleaseOrder(this.selectedOrderID, this.FACI, this.userContext.USID, this.userContext.CONO, this.userContext.DIVI).subscribe((res) => {
            this.setBusy(false);
            alert(res);
            this.OrderList = this.OrderList.filter(obj => obj.OAORNO !== this.selectedOrderID);
            this.gridData = process(this.OrderList, this.state);
            this.resetGlobleVar();


         });
      }

   }

   ChangeCOStopManually(value) {

      if (value == "NO") {

      } else {
         this.selectedOrderID = this.selectedOrderID.trim();
         if (this.selectedOrderID == "" || this.selectedOrderID == "undefined") {

            alert("Please select an order!")

         } else {


            var c = confirm("Are you sure you want to update Co stop of " + this.selectedOrderID + " order?");

            if (c == true) {
               this.setBusy(true);
               this.arService.ReleaseOrderManually(this.selectedOrderID, this.FACI, value, this.userContext.USID, this.userContext.CONO, this.userContext.DIVI).subscribe((res) => {

                  console.log(res);
                  this.setBusy(false);
                  this.ReloadOrdersInGrid();
                  alert(res);
               }, (error) => {
                  this.setBusy(false);
                  // Handle error
                  console.log('Error occurd when ChangeCOStopManually');
               });
            } else {

            }


         }



      }

   }




   private DelCredReviewCheck(key) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CUSEXTMI',
         transaction: 'DelFieldValue',
         outputFields: [],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('FILE', 'OIS100E');
      inputRecord.setString('PK01', key);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         console.log('Call : DelCredReviewCheck');

         if (!response.hasError()) {

            alert(this.selectedOrderID + " Order reviewed successfully!");
         } else {
            alert(this.selectedOrderID + " Order reviewed failed!");
         }




      }, (error) => {
         this.setBusy(false);
         // Handle error
         //this.logError('Unable to execute API ' + error);
         console.log('Call : DelCredReviewCheck Error ');
      });

   }
   private AddCreditReviewCheck(key) {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CUSEXTMI',
         transaction: 'AddFieldValue',
         outputFields: [],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('FILE', 'OIS100E');
      inputRecord.setString('PK01', key);
      inputRecord.setString('A030', "1");
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         console.log('Call : AddCreditReviewCheck');
         if (!response.hasError()) {
            console.log('Call : AddCreditReviewCheck successed');
            alert(this.selectedOrderID + " Order reviewed successfully!");
         } else {
            console.log('Call : AddCreditReviewCheck error');
            alert(this.selectedOrderID + " Order reviewed failed!");
         }


      }, (error) => {
         this.setBusy(false);
         // Handle error
         console.log('Call : AddCreditReviewCheck error');
      });

   }

   private CheckCredReviewCheck() {

      this.setBusy(true);

      const request: IMIRequest = {
         program: 'CMS100MI',
         transaction: 'LstCreditStatus',
         outputFields: ['F1PK02'],
         maxReturnedRecords: 100,
      };

      // represent input records
      const inputRecord: MIRecord = new MIRecord();
      inputRecord.setString('F1FILE', 'OIS100E');
      inputRecord.setString('F1PK01', this.selectedOrderID);
      request.record = inputRecord;

      this.miService.execute(request).subscribe((response: IMIResponse) => {
         this.setBusy(false);
         console.log('Call1 : CheckCredReviewCheck');
         if (!response.hasError()) {
            //Check row count
            if (response.items.length > 0) {
               console.log('Call1 : CheckCredReviewCheck > has Rows' + response.items);
               console.log(response.items.length);
               this.DelCredReviewCheck(this.selectedOrderID);
            } else {
               this.AddCreditReviewCheck(this.selectedOrderID);
            }

         } else {
            console.log('Call1 : CheckCredReviewCheck > Responce has Error');
         }

      }, (error) => {
         this.setBusy(false);
         // Handle error
         //this.logError('Unable to execute API ' + error);
         console.log('Call : CheckCredReviewCheck > Error and Try to Add Review Check');

      });

   }

   //**Region Load Invoice List Details LstFSLEDG */


   //#region Load Agin Data from ARS260 Panel (Using a bookmark)

   //**Load ForacstData on click */

   LoadForcastData() {

      this.setBusy(true);
      console.log('******* Call Open*********');
      this.selectedCustomerID; // V1
      var _QTTP = "1";
      var _TODT = "";
      var _CRSL = this.m;
      var _CRAG = this.y;
      var _PYNO = this.selectedCustomerID;
      //
      let xx = new Date();
      _TODT = this.datepipe.transform(xx, 'ddMMyy');
      this.CallBackForcastData(_QTTP, _TODT, _CRSL, _CRAG, _PYNO);



   }

   private getMyBookmark(_QTTP, _TODT, _CRSL, _CRAG, _PYNO): IBookmark {
      return {
         program: 'ARS260',
         table: 'FSLEDG',
         startPanel: 'E',
         keyNames: 'ESCONO,ESDIVI,ESYEA4,ESJRNO,ESJSNO',
         fieldNames: 'WWTODT,WWQTTP,WWPYNO,WWCRSL,WWCRAG',
         fields: 'WWTODT,WWQTTP,WWPYNO,WWCRSL,WWCRAG',
         values: {
            WWQTTP: _QTTP,
            WWTODT: _TODT,
            WWPYNO: _PYNO,
            WWCRSL: _CRSL,
            WWCRAG: _CRAG,
         },
         panel: 'E',
         isStateless: true
      };
   }
   fieldNames = ['WWCRL2', 'WWTTUR', 'WWTTEV', 'WWTNOI', 'WWPTUR', 'WWPTEV', 'WWPNOI', 'WWLIDT', 'WWLPDT', 'WWTDUE', 'WWCRL1', 'WWCRL2', 'WWTOSB', 'WWACRT', 'WWCRA1', 'WWCRA2', 'WWCRA3', 'WWCR01', 'WWCR02'];
   controlInfos: IFormControlInfo[];

   public CallBackForcastData(_QTTP, _TODT, _CRSL, _CRAG, _PYNO) {

      const bookmark = this.getMyBookmark(_QTTP, _TODT, _CRSL, _CRAG, _PYNO);
      // this.setBusy(true);

      this.formService.executeBookmark(bookmark).subscribe((r) => {
         //
         this.onBookmarkResponse(r);
         this.IsAgingDataLoaded = true;
      }, (r) => {
         //this.onError(r);
      });
      //Load Back Order Data
      this.GetBackOrder(this.selectedCustomerID);

   }
   LableData;
   CL;
   TTUR; TTEV; TNOI; PTUR; PTEV; PNOI; LIDT; LPDT;
   TDUE; CRL1; CRL2; TOSB; ACRT; CRA1; CRA2; CRA3; CR01; CR02; CR03
   private onBookmarkResponse(response: IFormResponse): void {

      if (response.result !== 0) {
         this.onError();
         return;
      }

      const panel = response.panel;
      if (panel) {
         this.controlInfos = panel.getControlInfos(this.fieldNames);
         this.TTUR = this.controlInfos[1].control.value;
         this.TTEV = this.controlInfos[2].control.value;
         this.TNOI = this.controlInfos[3].control.value;
         this.PTUR = this.controlInfos[4].control.value;
         this.PTEV = this.controlInfos[5].control.value;
         this.PNOI = this.controlInfos[6].control.value;
         this.LIDT = this.controlInfos[7].control.value;
         this.LPDT = this.controlInfos[8].control.value;
         this.TDUE = this.controlInfos[9].control.value;
         this.CRL1 = this.controlInfos[10].control.value;
         this.CRL2 = this.controlInfos[11].control.value;
         this.TOSB = this.controlInfos[12].control.value;
         this.ACRT = this.controlInfos[13].control.value;
         this.CRA1 = this.controlInfos[14].control.value;
         this.CRA2 = this.controlInfos[15].control.value;
         this.CRA3 = this.controlInfos[16].control.value;
         this.CR01 = this.controlInfos[17].control.value;
         this.CR02 = this.controlInfos[18].control.value;


         var c = 0;
         this.CL = panel.controlList;

         console.log('******* Call Close*********');
         this.setBusy(false);
      }


   }
   private onError(): void {
      const message = "Message" || 'Unable to open bookmark';
      const buttons = [{ text: 'OK', click: (e, modal) => { modal.close(); } }];
      this.messageService.error()
         .title('Bookmark error')
         .message(message)
         .buttons(buttons)
         .open();

      this.canExecute = true;
   }
   //#endregion

   /** Test Function to Bookmark  */
   LoadaProgram() {


   }

   bookmark: Bookmark = {
      program: 'CRS610',
      table: 'OCUSMA',
      keyNames: 'OKCONO,OKCUNO',
      fieldNames: 'WFSLCT,WTSLCT',
      isStateless: true,
      values: {
         OKCUNO: 'CUSTOMER1',
         WFSLCT: '10',
         WTSLCT: '20',
      }
   };





   /** END of Test Function to Bookmark  */



   canExecute = false;
   //#region Set the date parameters for buckets
   public GetAgeDistrib(): string {
      var AgeDist;
      var _month = new Date().getMonth() + 1;

      this.AGMonth1 = this.getMonthText(_month - 1);
      this.AGMonth2 = this.getMonthText(_month - 2);
      this.AGMonth3 = this.getMonthText(_month - 3);

      this.y = new Date().getFullYear().toString();
      switch (_month) {
         case 1:
            AgeDist = "13";
            this.AGMonth1 = this.getMonthText(12);
            this.AGMonth2 = this.getMonthText(11);
            this.AGMonth3 = this.getMonthText(10);
            break;
         case 2:
            AgeDist = "15";
            this.AGMonth1 = this.getMonthText(1);
            this.AGMonth2 = this.getMonthText(12);
            this.AGMonth3 = this.getMonthText(11);
            break;
         case 3:
            AgeDist = "17";
            this.AGMonth1 = this.getMonthText(2);
            this.AGMonth2 = this.getMonthText(1);
            this.AGMonth3 = this.getMonthText(12);
            break;
         case 4:
            AgeDist = "19";

            break;
         case 5:
            AgeDist = "21";

            break;
         case 6:
            AgeDist = "23";

            break;
         case 7:
            AgeDist = "01";

            break;
         case 8:
            AgeDist = "03";

            break;
         case 9:
            AgeDist = "05";

            break;
         case 10:
            AgeDist = "07";

            break;
         case 11:
            AgeDist = "09";

            break;
         case 12:
            AgeDist = "11";

            break;
      }

      return AgeDist;
   }
   public GetPmtForcast(): string {
      var PmtForcast = "";
      var _month = new Date().getMonth() + 1;
      this.PFMonth1 = this.getMonthText(_month);
      this.PFMonth2 = this.getMonthText(_month + 1);
      this.PFMonth3 = this.getMonthText(_month + 2);
      switch (_month) {
         case 1:
            PmtForcast = "11";

            break;
         case 2:
            PmtForcast = "13";

            break;
         case 3:
            PmtForcast = "15";
            break;
         case 4:
            PmtForcast = "17";
            break;
         case 5:
            PmtForcast = "19";
            break;
         case 6:
            PmtForcast = "21";
            break;
         case 7:
            PmtForcast = "23";
            break;
         case 8:
            PmtForcast = "01";
            break;
         case 9:
            PmtForcast = "03";
            break;
         case 10:
            PmtForcast = "05";
            break;
         case 11:
            PmtForcast = "07";
            this.PFMonth1 = this.getMonthText(11);
            this.PFMonth2 = this.getMonthText(12);
            this.PFMonth3 = this.getMonthText(1);
            break;
         case 12:
            PmtForcast = "09";
            this.PFMonth1 = this.getMonthText(12);
            this.PFMonth2 = this.getMonthText(1);
            this.PFMonth3 = this.getMonthText(2);
            break;
      }

      return PmtForcast;
   }

   public getMonthText(_no): string {
      var month = "";

      switch (_no) {
         case 1:
            month = "January";

            break;
         case 2:
            month = "February";
            break;
         case 3:
            month = "March";
            break;
         case 4:
            month = "April";
            break;
         case 5:
            month = "May";
            break;
         case 6:
            month = "June";
            break;
         case 7:
            month = "July";
            break;
         case 8:
            month = "August";
            break;
         case 9:
            month = "September";
            break;
         case 10:
            month = "October";
            break;
         case 11:
            month = "November";
            break;
         case 12:
            month = "December";
            break;
      }
      return month;
   }
}
