import { Injectable } from '@angular/core';
import { MetaData, Binary } from '../../models/file';
import { Util } from '../util/util';

const NIS1_MAINNET_NODES = [
  'http://nis1.pasomi.net:7890',
  'http://eolia.nis1.harvestasya.com:7890',
  'http://nem01a.symbol-node.com:7890',
  'http://176.9.20.180:7890',
  'http://195.201.37.121:7890',
  'http://52.194.130.115:7890',
  'http://104.237.5.122:7890',
  'http://153.122.13.80:7890',
];

const NIS1_TESTNET_NODES = [
  'http://104.128.226.60:7890',
  'http://23.228.67.85:7890',
];

const TRANSFER_TYPE = 257;
const MULTISIG_TYPE = 4100;

@Injectable({ providedIn: 'root' })
export class NemProvider {
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
        const res = await fetch(`${node}/heartbeat`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          if (json.code === 1) {
            this.nodeUrl = node;
            this.initialized = true;
            console.log(`Connected to NIS1 node: ${node}`);
            return;
          }
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
    let hash = '';
    while (true) {
      let url = `${this.nodeUrl}/account/transfers/all?address=${address}&pageSize=100`;
      if (hash) {
        url += `&hash=${hash}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`NIS1 API error: ${res.status}`);
      const json = await res.json();
      if (!json.data || json.data.length === 0) break;
      transactions.push(...json.data);
      hash = json.data[json.data.length - 1].meta.hash.data;
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
    // Encrypted messages (type 2) require NEM-specific crypto
    // which is not available without nem-sdk
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
    // NIS1 fee calculation for 0 XEM transfer with message
    // Minimum transfer fee: 50000 microXEM
    // Message fee: ceil(messageLength / 32) * 50000 microXEM
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
