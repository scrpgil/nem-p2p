import { Injectable } from '@angular/core';
import {
  PlainMessage,
  TimeWindow,
  TransferTransaction,
  Account,
  TransactionHttp,
  Transaction,
  EmptyMessage,
  TransactionTypes,
  AccountHttp,
  Address,
  Password,
  SimpleWallet,
  NEMLibrary,
  NetworkTypes,
  XEM,
} from 'nem-library';
import { MetaData, Binary } from '../../models/file';
import { Util } from '../util/util';

@Injectable()
export class NemProvider {
  constructor() {
    const q = localStorage.getItem('q');
    const mode = Util.getQueryVariable('mode');
    if (mode === 'testnet') {
      NEMLibrary.bootstrap(NetworkTypes.TEST_NET);
    } else {
      NEMLibrary.bootstrap(NetworkTypes.MAIN_NET);
    }
  }

  async getAllTransactions(address: string) {
    try {
      let transactions = [];
      let loop = true;
      while (loop) {
        let hash = '';
        if (transactions.length > 0) {
          hash = transactions[transactions.length - 1].transactionInfo.hash.data;
        }
        const res = await this.allTransactions(address, hash).toPromise();
        if (res && res.length > 0) {
          transactions = transactions.concat(res);
        } else {
          loop = false;
        }
      }
      transactions = <TransferTransaction[]>transactions.filter(x => x.type == TransactionTypes.TRANSFER);
      return transactions.reverse();
    } catch (e) {
      return null;
    }
  }
  private allTransactions(address: string, hash: string = '') {
    const accountHttp = new AccountHttp();
    return accountHttp.allTransactions(new Address(address), { hash: hash, pageSize: 100 });
  }

  createTransactions(message: string = '', address: string = '') {
    if (address == '') {
      const wallet: any = this.createSimpleWallet();
      address = wallet.address.value;
    }
    const transferTransaction: Transaction = TransferTransaction.create(
      TimeWindow.createWithDeadline(),
      new Address(address),
      new XEM(0),
      PlainMessage.create(message),
    );
    return transferTransaction;
  }

  sendTransaction(transferTransaction, privateKey) {
    const transactionHttp = new TransactionHttp();
    const account = Account.createWithPrivateKey(privateKey);
    const signedTransaction = account.signTransaction(transferTransaction);
    transactionHttp.announceTransaction(signedTransaction).subscribe(x => console.log(x));
  }

  createSimpleWallet(name: string = '') {
    const password = new Password('password');
    for (let i = 0; i < 10000000; i++) {
      const simpleWallet = SimpleWallet.create('simple wallet', password);
      const address :any = simpleWallet.address;
      let a:string = address.value;
      if (name == '' || a.endsWith(name)) {
        return simpleWallet;
      }
    }
  }

  getPrivateKey(wallet) {
    const password = new Password('password');
    return wallet.encryptedPrivateKey.decrypt(password);
  }

  getMetaData(transaction, privKey: string = '') {
    try {
      for (const t of transaction) {
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
      console.log(e);
    }
    return null;
  }

  mergeBinaryToBase64(transaction, meta, privKey: string = ''): string {
    let binaries: Binary[] = [];
    const base64: string[] = new Array(meta.length);
    try {
      let cnt = 0;
      for (const t of transaction) {
        const msg = this.decodeMessage(t, privKey);
        if (msg !== '' && Util.isJson(msg)) {
          const obj = JSON.parse(msg);
          const binary = new Binary(obj);
          if (binary.valid()) {
            binaries.push(binary);
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
      console.log(e);
    }
    return null;
  }

  decodeMessage(transaction: TransferTransaction, privKey: string = '') {
    if (transaction.message.isPlain()) {
      const plainMessage = transaction.message as PlainMessage;
      return plainMessage.plain();
    } else if (transaction.message.isEncrypted()) {
      const password = new Password('password');
      const wallet = SimpleWallet.createWithPrivateKey('simple wallet', password, privKey);
      const account = wallet.open(password);
      const msg = account.decryptMessage(transaction.message, transaction.signer!).payload;
      return msg;
    }
  }
}
