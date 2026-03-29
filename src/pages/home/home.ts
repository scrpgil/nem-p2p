import { Component, ChangeDetectorRef, NgZone, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonInput, IonFooter,
  ToastController,
} from '@ionic/angular/standalone';
import { NemProvider } from '../../providers/nem/nem';
import { Util } from '../../providers/util/util';
import { MetaData, Binary } from '../../models/file';
import { ToJsonStringifyPipe } from '../../pipes/to-json-stringify/to-json-stringify';

@Component({
  selector: 'app-home',
  standalone: true,
  host: { class: 'ion-page' },
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonInput, IonFooter,
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
  downloadUrl = '';
  encrypted = false;
  decryptPrivKey = '';
  fetched = 0; // 0:idle, 1:fetching, 2:complete
  metaData: MetaData | null = null;
  imageSrc: SafeUrl | null = null;
  showAudio = false;

  walletName = '';
  cAddress = '';
  privKey = '';
  cMetaData: MetaData | null = null;
  privateKey = '';
  binaries: Binary[] = [];
  convertProgress: string[] = [];
  sumFee = 0;
  fileToUpload: File | null = null;

  private pendingAudioSrc: string | null = null;
  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  constructor(
    private toast: ToastController,
    private nem: NemProvider,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer,
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
    this.downloadUrl = '';
    this.metaData = null;
    this.fetched = 0;
    this.imageSrc = null;
    this.showAudio = false;
    this.pendingAudioSrc = null;
  }

  async fetch() {
    if (this.address === '') return;
    this.initFetch();
    this.fetched = 1;
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

      const metaData = await this.nem.getMetaData(transactions, this.decryptPrivKey);
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
      const dataUrl = await this.nem.mergeBinaryToBase64(transactions, metaData, this.decryptPrivKey) || '';

      const blob = Util.toBlob(dataUrl, metaData.type);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        this.downloadUrl = blobUrl;
        if (metaData.isImage()) {
          this.imageSrc = this.sanitizer.bypassSecurityTrustUrl(blobUrl);
        } else if (metaData.isAudio()) {
          this.showAudio = true;
          this.pendingAudioSrc = blobUrl;
        }
      }
      this.fetched = 2;
      this.cdr.detectChanges();

      // Set audio src directly on the DOM element after view updates
      if (this.pendingAudioSrc) {
        setTimeout(() => {
          if (this.audioPlayerRef?.nativeElement) {
            this.audioPlayerRef.nativeElement.src = this.pendingAudioSrc!;
            this.audioPlayerRef.nativeElement.load();
          }
        });
      }
    } catch (e: any) {
      this.fetched = 0;
      console.error(e);
      this.console.push('fetch failed! ' + (e?.message || ''));
      this.cdr.detectChanges();
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
