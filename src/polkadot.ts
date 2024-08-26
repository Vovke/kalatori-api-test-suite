import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

export async function updateAccountBalance(api: ApiPromise, accountAddress: string, amount: bigint): Promise<void> {
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const transfer = api.tx.balances.transfer(accountAddress, amount);
  await transfer.signAndSend(alice);
}

export async function connectPolkadot(): Promise<ApiPromise> {
  const provider = new WsProvider('wss://polkadot.api.onfinality.io/public-ws');
  const api = await ApiPromise.create({ provider });
  await api.isReady;
  return api;
}

export async function transferFunds(api: ApiPromise, paymentAccount: string, amount: number, assetId?: number) {
  const keyring = new Keyring({ type: 'sr25519' });
  const sender = keyring.addFromUri('//Alice');

  await cryptoWaitReady();

  let transfer;
  if (assetId) {
    const adjustedAmount = amount * Math.pow(10, 12); // Assuming 12 decimals for the asset
    transfer = api.tx.assets.transfer(assetId, paymentAccount, adjustedAmount);
  } else {
    const adjustedAmount = amount * Math.pow(10, 10); // Assuming 10 decimals for DOT
    transfer = api.tx.balances.transfer(paymentAccount, adjustedAmount);
  }

  const unsub = await transfer.signAndSend(sender, ({ status }) => {
    if (status.isInBlock || status.isFinalized) {
      unsub();
    }
  });

  // Wait for transaction to be included in block
  await new Promise(resolve => setTimeout(resolve, 5000));
}
