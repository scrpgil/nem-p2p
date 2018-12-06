import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { NavController, ToastController } from 'ionic-angular';
import { NemProvider } from '../../providers/nem/nem';
import { Util } from '../../providers/util/util';
import { MetaData, Binary } from '../../models/file';
import { TransferTransaction } from 'nem-library';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {
  testmode: boolean = false;
  console: string[] = [];
  mode: boolean = true; // true: fetch, false: convert;
  address: string = '';
  href: string = '#';
  encrypted: boolean = false;
  decryptPrivKey: string = '';
  base64: string = '';
  fetched: number = 0; // 0:idle , 1:fetched , 3:complete
  metaData: MetaData;
  imageBase64: string = '';
  audioBase64: string = '';

  walletName: string = '';
  cAddress: string = '';
  privKey: string = '';
  cMetaData: MetaData;
  privateKey: string = '';
  binaries: Binary[] = [];
  convertProgress: string[] = [];
  sumFee: number = 0;
  fileToUpload: any = null;

  constructor(
    private _sanitizer: DomSanitizer,
    public toast: ToastController,
    public navCtrl: NavController,
    public nem: NemProvider,
  ) {
    const q = localStorage.getItem('q');
    const mode = Util.getQueryVariable('mode');
    if (mode === 'testnet') {
      this.testmode = true;
    }
    const address = Util.getQueryVariable('address');
    this.address = address;
  }

  initFetch() {
    this.console = [];
    this.href = '#';
    this.base64 = '';
    this.metaData = null;
    this.fetched = 0;
    this.imageBase64 = '';
    this.audioBase64 = '';
  }

  async fetch() {
    if (this.address === '') {
      return;
    }
    this.initFetch();
    this.fetched = 1;
    let id;
    try {
      this.console.push('fetch from ' + this.address);
      this.console.push('get all transactions');
      id = this.setConsoleLoading();
      const transactions = await this.nem.getAllTransactions(this.address);
      if (!transactions && transactions.length <= 0) {
        this.loadingStop(id);
        throw new Error('error');
      }
      this.loadingStop(id);
      this.console.push('find metadata');
      id = this.setConsoleLoading();
      const metaData = this.nem.getMetaData(transactions, this.decryptPrivKey);
      if (!metaData) {
        this.loadingStop(id);
        throw new Error('error');
      }
      this.loadingStop(id);
      this.console.push('　name: ' + metaData.name);
      this.console.push('　type: ' + metaData.type);
      this.console.push('　size: ' + metaData.size);
      this.console.push('　lastModified: ' + metaData.lastModified);
      this.console.push('　length: ' + metaData.length);
      this.console.push('merge file');
      this.metaData = metaData;
      id = this.setConsoleLoading();
      this.base64 = await this.nem.mergeBinaryToBase64(transactions, metaData, this.decryptPrivKey);
      this.loadingStop(id, '', true);
      if (metaData.isImage()) {
        this.imageBase64 = this.base64;
      } else if (metaData.isAudio()) {
        console.log('isAudio');
        this.audioBase64 = this.base64;
      }
      this.fetched = 2;
    } catch (e) {
      this.loadingStop(id);
      this.fetched = 0;
      console.log(e);
      this.console.push('fetch faild!');
      return;
    }
  }

  handleDownload() {
    const blob = Util.toBlob(this.base64, this.metaData.type);
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, this.metaData.name);
      window.navigator.msSaveOrOpenBlob(blob, this.metaData.name);
    } else {
      this.href = window.URL.createObjectURL(blob);
    }
  }

  setConsoleLoading() {
    const id = setInterval(async () => {
      this.console[this.console.length - 1] = (await this.console[this.console.length - 1]) + '.';
    }, 1000);
    return id;
  }

  loadingStop(id, text: string = '', clear: boolean = false) {
    if (clear) {
      this.console[this.console.length - 1] = '';
    } else {
      this.console[this.console.length - 1] = this.console[this.console.length - 1] + text;
    }
    clearInterval(id);
  }

  handleFileInput(files: FileList) {
    this.fileToUpload = files.item(0);
  }
  initConverter() {
    this.cMetaData = null;
    this.convertProgress = [];
    this.binaries = [];
    this.sumFee = 0;
  }

  async convert() {
    if (!this.fileToUpload) {
      return;
    }
    this.initConverter();
    this.convertProgress.push('convert start');
    const fr = new FileReader();
    fr.onload = (evt: any) => {
      console.log(evt.target.result);
      const base64Array = Util.splitByLength(evt.target.result, 950);
      this.cMetaData = new MetaData({
        v: '0.0.1',
        name: this.fileToUpload.name,
        type: this.fileToUpload.type,
        length: base64Array.length,
        size: this.fileToUpload.size,
        lastModified: this.fileToUpload.lastModified,
      });
      for (let i = 0; i < base64Array.length; i++) {
        const base64 = base64Array[i];
        const b = new Binary({
          id: i,
          b: base64,
        });
        this.binaries.push(b);
        const transaction = this.nem.createTransactions(base64);
        this.sumFee = this.sumFee + transaction.fee;
      }
    };
    fr.readAsDataURL(this.fileToUpload);
  }

  createTransaction() {
    if (this.cAddress == '') {
      return;
    }
    for (const binary of this.binaries) {
      const b = JSON.stringify(binary);
      const transaction = this.nem.createTransactions(b, this.cAddress);
      this.nem.sendTransaction(transaction, this.privateKey);
      Util.sleep(500);
      console.log(binary.id);
    }
  }

  copy(ev) {
    const el = ev.toElement;
    Util.execCopy(el);
    this.toast
      .create({
        message: 'Text copied',
        duration: 600,
        showCloseButton: true,
        position: 'top',
      })
      .present();
  }

  generate() {
    const wallet: any = this.nem.createSimpleWallet(this.walletName);
    this.cAddress = wallet.address.value;
    this.privKey = this.nem.getPrivateKey(wallet);
  }
}
