import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MetaData, Binary } from '../../models/file';
import { Util } from '../util/util';

const NIS1_MAINNET_NODES = [
  'https://eolia.nis1.harvestasya.com:7891',
  'https://finnel.nis1.harvestasya.com:7891',
  'https://sakia.nis1.harvestasya.com:7891',
  'https://nem01a.symbol-node.com:7891',
  'https://nem02.symbol-node.com:7891',
  'https://nem03.symbol-node.com:7891',
  'https://nem04.symbol-node.com:7891',
  'https://nem05.symbol-node.com:7891',
];

const NIS1_TESTNET_NODES = [
  'http://104.128.226.60:7890',
  'http://23.228.67.85:7890',
];

const TRANSFER_TYPE = 257;
const MULTISIG_TYPE = 4100;

@Injectable({ providedIn: 'root' })
export class NemProvider {
  private http = inject(HttpClient);
  private nodeUrl = '';
  private isTestnet = false;
  private initialized = false;

  constructor() {
    const mode = Util.getQueryVariable('mode');
    this.isTestnet = mode === 'testnet';
  }

  private async ensureNode(): Promise<void> {
    if (this.initialized && this.nodeUrl) return;
    const nodes = this.isTestnet ? NIS1_TESTNET_NODES : NIS1_MAINNET_NODES;
    for (const node of nodes) {
      try {
        const json: any = await firstValueFrom(
          this.http.get(`${node}/heartbeat`, { responseType: 'json' })
        );
        if (json.code === 1) {
          this.nodeUrl = node;
          this.initialized = true;
          console.log(`Connected to NIS1 node: ${node}`);
          return;
        }
      } catch {
        // try next node
      }
    }
    throw new Error('No NIS1 node available. Please try again later.');
  }

  async getAllTransactions(address: string): Promise<any[]> {
    await this.ensureNode();
    const transactions: any[] = [];
    let lastId = -1;
    while (true) {
      let url = `${this.nodeUrl}/account/transfers/all?address=${address}&pageSize=100`;
      if (lastId >= 0) {
        url += `&id=${lastId}`;
      }
      const json: any = await firstValueFrom(
        this.http.get(url, { responseType: 'json' })
      );
      if (!json.data || json.data.length === 0) break;
      transactions.push(...json.data);
      lastId = json.data[json.data.length - 1].meta.id;
    }
    return transactions
      .filter((t) => {
        const type = t.transaction.type;
        if (type === TRANSFER_TYPE) return true;
        if (type === MULTISIG_TYPE && t.transaction.otherTrans?.type === TRANSFER_TYPE) return true;
        return false;
      })
      .reverse();
  }

  private getTransaction(raw: any): any {
    if (raw.transaction.type === MULTISIG_TYPE) {
      return raw.transaction.otherTrans;
    }
    return raw.transaction;
  }

  decodeMessage(raw: any, _privKey: string = ''): string {
    const tx = this.getTransaction(raw);
    if (!tx.message || !tx.message.payload) return '';
    if (tx.message.type === 1) {
      return this.hexToUtf8(tx.message.payload);
    }
    console.warn('Encrypted message decryption is not supported in this version.');
    return '';
  }

  private hexToUtf8(hex: string): string {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  calculateFee(messageLength: number): number {
    const messageFee = Math.max(1, Math.ceil(messageLength / 32)) * 50000;
    return 50000 + messageFee;
  }

  getMetaData(transactions: any[], privKey: string = ''): MetaData | null {
    try {
      for (const t of transactions) {
        const msg = this.decodeMessage(t, privKey);
        if (msg !== '' && Util.isJson(msg)) {
          const obj = JSON.parse(msg);
          const metaData = new MetaData(obj);
          if (metaData.valid()) {
            return metaData;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  mergeBinaryToBase64(transactions: any[], meta: MetaData, privKey: string = ''): string | null {
    const base64: string[] = new Array(meta.length);
    try {
      for (const t of transactions) {
        const msg = this.decodeMessage(t, privKey);
        if (msg !== '' && Util.isJson(msg)) {
          const obj = JSON.parse(msg);
          const binary = new Binary(obj);
          if (binary.valid()) {
            if (0 <= binary.id && binary.id < meta.length) {
              if (!base64[binary.id]) {
                base64[binary.id] = binary.b;
              }
            }
          }
        }
      }
      return base64.join('');
    } catch (e) {
      console.error(e);
    }
    return null;
  }
}
