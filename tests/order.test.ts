import request from 'supertest';
import { connectPolkadot, transferFunds } from '../src/polkadot';
import { ApiPromise } from '@polkadot/api';

describe('Order Endpoint Blackbox Tests', () => {
  let api: ApiPromise;
  const baseUrl = process.env.DAEMON_HOST;
  if (!baseUrl ) {
    throw new Error('check all environment variables are defined');
  }
  const dotOrderData = {
    amount: 1,
    currency: 'DOTL',
    callback: 'https://example.com/callback'
  };
  const usdcOrderData = {
    amount: 1,
    currency: 'USDC',
    callback: 'https://example.com/callback'
  };

  const checkOrder = (orderId: any, orderResponseObject:any, orderData: any) => {
    expect(orderResponseObject).toHaveProperty('order', orderId);
    expect(orderResponseObject).toHaveProperty('message', '');
    expect(orderResponseObject).toHaveProperty('recipient');
    expect(orderResponseObject).toHaveProperty('server_info');
    expect(orderResponseObject).toHaveProperty('withdrawal_status', 'waiting');
    expect(orderResponseObject).toHaveProperty('payment_status', 'pending');
    expect(orderResponseObject).toHaveProperty('amount', orderData.amount);

    expect(orderResponseObject).toHaveProperty('callback', orderData.callback);
    expect(orderResponseObject).toHaveProperty('transactions');
    expect(Array.isArray(orderResponseObject.transactions)).toBe(true);
    expect(orderResponseObject).toHaveProperty('payment_account');
    expect(orderResponseObject).toHaveProperty('death');
    expect(orderResponseObject).toHaveProperty('payment_page', '');
    expect(orderResponseObject).toHaveProperty('redirect_url', '');

    expect(orderResponseObject.server_info).toHaveProperty('version');
    expect(orderResponseObject.server_info).toHaveProperty('instance_id');
    expect(orderResponseObject.server_info).toHaveProperty('debug', true);
  }

  const generateRandomOrderId = () => {
    return `order_${Math.random().toString(36).substring(2, 15)}`;
  }

  const createOrder = async (orderId: string, orderData: any) => {
    const response = await request(baseUrl)
      .post(`/v2/order/${orderId}`)
      .send(orderData);
    expect(response.status).toBe(201);

    return response.body;
  };

  const getOrderDetails = async (orderId: string) => {
    const response = await request(baseUrl)
      .post(`/v2/order/${orderId}`);
    expect(response.status).toBe(200);
    return response.body;
  };

  beforeAll(async () => {
    api = await connectPolkadot();
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it('should create a new DOT order', async () => {
    const orderId = generateRandomOrderId();
    const createdOrder = await createOrder(orderId, dotOrderData);
    checkOrder(orderId, createdOrder, dotOrderData);

    expect(createdOrder).toHaveProperty('currency');
    expect(createdOrder.currency).toHaveProperty('currency', dotOrderData.currency);
    expect(createdOrder.currency).toHaveProperty('chain_name', 'rococo');
    expect(createdOrder.currency).toHaveProperty('kind', 'native');
    expect(createdOrder.currency).toHaveProperty('decimals', 10);
    expect(createdOrder.currency).toHaveProperty('rpc_url');
  });

  it('should create a new USDC order', async () => {
    const orderId = generateRandomOrderId();
    const createdOrder = await createOrder(orderId, usdcOrderData);
    checkOrder(orderId, createdOrder, usdcOrderData);

    expect(createdOrder).toHaveProperty('currency');
    expect(createdOrder.currency).toHaveProperty('currency', usdcOrderData.currency);
    expect(createdOrder.currency).toHaveProperty('chain_name', 'statemint');
    expect(createdOrder.currency).toHaveProperty('kind', 'asset');
    expect(createdOrder.currency).toHaveProperty('decimals', 6);
    expect(createdOrder.currency).toHaveProperty('rpc_url');
    expect(createdOrder.currency).toHaveProperty('asset_id', 1337);
  });

  it('should get DOT order details', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);

    checkOrder(orderId, orderDetails, dotOrderData);

    expect(orderDetails).toHaveProperty('currency');
    expect(orderDetails.currency).toHaveProperty('currency', dotOrderData.currency);
    expect(orderDetails.currency).toHaveProperty('chain_name', 'rococo');
    expect(orderDetails.currency).toHaveProperty('kind', 'native');
    expect(orderDetails.currency).toHaveProperty('decimals', 10);
    expect(orderDetails.currency).toHaveProperty('rpc_url');
  });

  it('should get USDC order details', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    checkOrder(orderId, orderDetails, usdcOrderData);

    expect(orderDetails).toHaveProperty('currency');
    expect(orderDetails.currency).toHaveProperty('currency', usdcOrderData.currency);
    expect(orderDetails.currency).toHaveProperty('chain_name', 'statemint');
    expect(orderDetails.currency).toHaveProperty('kind', 'asset');
    expect(orderDetails.currency).toHaveProperty('decimals', 6);
    expect(orderDetails.currency).toHaveProperty('rpc_url');
    expect(orderDetails.currency).toHaveProperty('asset_id', 1337);
  });

  it('should return 404 for non-existing order on get order', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(baseUrl)
      .post(`/v2/order/${nonExistingOrderId}`);
    expect(response.status).toBe(404);
  });

  it('should create, repay, and automatically withdraw an order in DOT', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.payment_account;
    expect(paymentAccount).toBeDefined();

    await transferFunds(orderDetails.currency.rpc_url, paymentAccount, dotOrderData.amount);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.payment_status).toBe('paid');
    expect(repaidOrderDetails.withdrawal_status).toBe('completed');
  }, 30000);

  it('should create, repay, and automatically withdraw an order in USDC', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.payment_account;
    expect(paymentAccount).toBeDefined();

    await transferFunds(
      orderDetails.currency.rpc_url,
      paymentAccount,
      usdcOrderData.amount,
      orderDetails.currency.asset_id
    );

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.payment_status).toBe('paid');
    expect(repaidOrderDetails.withdrawal_status).toBe('completed');
  }, 30000);

  it('should not automatically withdraw an order until fully repaid', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.payment_account;
    expect(paymentAccount).toBeDefined();

    const halfAmount = orderDetails.amount/2;

    // Partial repayment
    await transferFunds(
      orderDetails.currency.rpc_url,
      paymentAccount,
      halfAmount,
      orderDetails.currency.asset_id
    );
    let repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.payment_status).toBe('pending');
    expect(repaidOrderDetails.withdrawal_status).toBe('waiting');

    // Full repayment
    await transferFunds(
      orderDetails.currency.rpc_url,
      paymentAccount,
      halfAmount,
      orderDetails.currency.asset_id
    );
    repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.payment_status).toBe('paid');
    expect(repaidOrderDetails.withdrawal_status).toBe('completed');
  }, 30000);

  it('should not update order if received payment in wrong currency', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.payment_account;
    expect(paymentAccount).toBeDefined();

    const assetId = 1984; // Different asset ID to simulate wrong currency
    await transferFunds(
      orderDetails.currency.rpc_url,
      paymentAccount,
      usdcOrderData.amount,
      assetId
    );

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.payment_status).toBe('pending');
    expect(repaidOrderDetails.withdrawal_status).toBe('waiting');
  }, 30000);

  it('should return 404 for non-existing order on force withdrawal', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(baseUrl)
      .post(`/v2/order/${nonExistingOrderId}/forceWithdrawal`);
    expect(response.status).toBe(404);
  });
});
