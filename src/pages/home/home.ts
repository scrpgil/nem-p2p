import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonInput, IonFooter,
  ToastController,
} from '@ionic/angular/standalone';
import { NemProvider } from '../../providers/nem/nem';
import { Util } from '../../providers/util/util';
import { MetaData, Binary } from '../../models/file';
import { SanitaizerPipe } from '../../pipes/sanitaizer/sanitaizer';
import { ToJsonStringifyPipe } from '../../pipes/to-json-stringify/to-json-stringify';

@Component({
  selector: 'app-home',
  standalone: true,
  host: { class: 'ion-page' },
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonInput, IonFooter,
    SanitaizerPipe,
    ToJsonStringifyPipe,
  ],
  templateUrl: 'home.html',
  styleUrls: ['home.scss'],
})
export class HomePage {
  testmode = false;
  console: string[] = [];
  mode = true; // true: fetch, false: convert
  address = '';
  href = '#';
  encrypted = false;
  decryptPrivKey = '';
  base64 = '';
  fetched = 0; // 0:idle, 1:fetching, 2:complete
  metaData: MetaData | null = null;
  imageBase64 = '';
  audioBase64 = '';

  walletName = '';
  cAddress = '';
  privKey = '';
  cMetaData: MetaData | null = null;
  privateKey = '';
  binaries: Binary[] = [];
  convertProgress: string[] = [];
  sumFee = 0;
  fileToUpload: File | null = null;

  constructor(
    private toast: ToastController,
    private nem: NemProvider,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {
    const mode = Util.getQueryVariable('mode');
    if (mode === 'testnet') {
      this.testmode = true;
    }
    const address = Util.getQueryVariable('address');
    if (address) {
      this.address = address;
    }
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
    if (this.address === '') return;
    this.initFetch();
    this.fetched = 1;
    let loadingId: any;
    try {
      this.console.push('fetch from ' + this.address);
      this.console.push('get all transactions');
      this.cdr.detectChanges();

      const transactions = await this.nem.getAllTransactions(this.address);
      if (!transactions || transactions.length <= 0) {
        throw new Error('No transactions found');
      }

      this.console.push('find metadata');
      this.cdr.detectChanges();

      const metaData = this.nem.getMetaData(transactions, this.decryptPrivKey);
      if (!metaData) {
        throw new Error('No metadata found');
      }

      this.console.push('  name: ' + metaData.name);
      this.console.push('  type: ' + metaData.type);
      this.console.push('  size: ' + metaData.size);
      this.console.push('  lastModified: ' + metaData.lastModified);
      this.console.push('  length: ' + metaData.length);
      this.console.push('merge file');
      this.cdr.detectChanges();

      this.metaData = metaData;
      this.base64 = this.nem.mergeBinaryToBase64(transactions, metaData, this.decryptPrivKey) || '';

      if (metaData.isImage()) {
        this.imageBase64 = this.base64;
      } else if (metaData.isAudio()) {
        this.audioBase64 = this.base64;
      }
      this.fetched = 2;
      this.cdr.detectChanges();
    } catch (e: any) {
      this.fetched = 0;
      console.error(e);
      this.console.push('fetch failed! ' + (e?.message || ''));
      this.cdr.detectChanges();
    }
  }

  handleDownload() {
    if (!this.metaData) return;
    const blob = Util.toBlob(this.base64, this.metaData.type);
    if (blob) {
      this.href = window.URL.createObjectURL(blob);
    }
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileToUpload = input.files[0];
    }
  }

  initConverter() {
    this.cMetaData = null;
    this.convertProgress = [];
    this.binaries = [];
    this.sumFee = 0;
  }

  async convert() {
    if (!this.fileToUpload) return;
    this.initConverter();
    this.convertProgress.push('convert start');
    const fr = new FileReader();
    fr.onload = (evt: any) => {
      this.ngZone.run(() => {
        const base64Array = Util.splitByLength(evt.target.result, 950);
        this.cMetaData = new MetaData({
          v: '0.0.1',
          name: this.fileToUpload!.name,
          type: this.fileToUpload!.type,
          length: base64Array.length,
          size: this.fileToUpload!.size,
          lastModified: this.fileToUpload!.lastModified,
        });
        for (let i = 0; i < base64Array.length; i++) {
          const b = new Binary({ id: i, b: base64Array[i] });
          this.binaries.push(b);
          const fee = this.nem.calculateFee(base64Array[i].length);
          this.sumFee += fee;
        }
        this.convertProgress.push('convert complete');
      });
    };
    fr.readAsDataURL(this.fileToUpload);
  }

  copy(ev: MouseEvent) {
    const el = ev.target as HTMLElement;
    const text = el.textContent || '';
    Util.execCopy(text);
    this.toast.create({
      message: 'Text copied',
      duration: 600,
      position: 'top',
      buttons: ['Close'],
    }).then(t => t.present());
  }

  toggleMode() {
    this.mode = !this.mode;
  }
}
