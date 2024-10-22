import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export async function updateAccountBalance(api: ApiPromise, accountAddress: string, amount: bigint): Promise<void> {
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  const transfer = api.tx.balances.transfer(accountAddress, amount);
  await transfer.signAndSend(alice);
}

export async function connectPolkadot(rpcUrl: string): Promise<ApiPromise> {
  const provider = new WsProvider(rpcUrl);
  const api = await ApiPromise.create({ provider });
  await api.isReady;
  return api;
}

export async function transferFunds(rpcUrl: string, paymentAccount: string, amount: number, assetId?: number) {
  const provider = new WsProvider(rpcUrl);
  const api = await ApiPromise.create({ provider });
  const keyring = new Keyring({ type: 'sr25519' });
  const sender = keyring.addFromUri('//Alice');
  let transfer;
  let signerOptions = {};

  await cryptoWaitReady();

  if (assetId) {
    const adjustedAmount = amount * Math.pow(10, 6);

    transfer = api.tx.assets.transfer(assetId, paymentAccount, adjustedAmount);
    signerOptions = {
      tip: 0,
      assetId: { parents: 0, interior: { X2: [{ palletInstance: 50 }, { generalIndex: assetId }] } }
    };
  } else {
    const adjustedAmount = amount * Math.pow(10, 10);

    transfer = api.tx.balances.transferKeepAlive(paymentAccount, adjustedAmount);
  }

  const unsub = await transfer.signAndSend(sender, signerOptions, async ({ status }) => {
    if (status.isInBlock || status.isFinalized) {
      unsub();
    }
  });

  // Wait for transaction to be included in block
  await new Promise(resolve => setTimeout(resolve, 8000));
}
