import request from 'supertest';
import { connectPolkadot, transferFunds } from '../src/polkadot';
import { ApiPromise } from '@polkadot/api';

describe('Order Endpoint Blackbox Tests', () => {
  let api: ApiPromise;
  const baseUrl = 'http://127.0.0.1:16726'; // Assuming API is running here
  const dotOrderData = {
    amount: 100,
    currency: 'DOT',
    callback: 'https://example.com/callback'
  };
  const usdcOrderData = {
    amount: 100,
    currency: 'USDC',
    callback: 'https://example.com/callback'
  };
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

  it('should create a new order', async () => {
    const orderId = generateRandomOrderId();
    const createdOrder = await createOrder(orderId, dotOrderData);
    expect(createdOrder).toHaveProperty('order', orderId);
    expect(createdOrder).toHaveProperty('amount', dotOrderData.amount);
    expect(createdOrder).toHaveProperty('currency.currency', dotOrderData.currency);
    expect(createdOrder).toHaveProperty('callback', dotOrderData.callback);
    expect(createdOrder).toHaveProperty('payment_account');
    expect(createdOrder.payment_status).toBe('pending');
    expect(createdOrder.withdrawal_status).toBe('waiting');
    expect(createdOrder).toHaveProperty('server_info');
    expect(createdOrder.server_info).toHaveProperty('version');
    expect(createdOrder.server_info).toHaveProperty('instance_id');
  });

  it('should get order details', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);
    expect(orderDetails).toHaveProperty('order', orderId);
    expect(orderDetails).toHaveProperty('amount', dotOrderData.amount);
    expect(orderDetails).toHaveProperty('currency.currency', dotOrderData.currency);
    expect(orderDetails).toHaveProperty('callback', dotOrderData.callback);
    expect(orderDetails).toHaveProperty('payment_account');
    expect(orderDetails.payment_status).toBe('pending');
    expect(orderDetails.withdrawal_status).toBe('waiting');
    expect(orderDetails).toHaveProperty('server_info');
    expect(orderDetails.server_info).toHaveProperty('version');
    expect(orderDetails.server_info).toHaveProperty('instance_id');
  });

  it('should return 404 for non-existing order on get order', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(baseUrl)
      .post(`/v2/order/${nonExistingOrderId}`);
    expect(response.status).toBe(404);
  });

  xit('should create, repay, and automatically withdraw an order in DOT', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, dotOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    await transferFunds(api, paymentAccount, dotOrderData.amount);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(dotOrderData.amount);
  });

  xit('should create, repay, and automatically withdraw an order in USDC', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    const assetId = 1337; // Example asset ID
    await transferFunds(api, paymentAccount, usdcOrderData.amount, assetId);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(usdcOrderData.amount);
  });

  xit('should not automatically withdraw an order until fully repaid', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    const assetId = 1337;
    const halfAmount = 50;

    // Partial repayment
    await transferFunds(api, paymentAccount, halfAmount, assetId);
    let repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('pending');
    expect(repaidOrderDetails.withdrawalStatus).toBe('waiting');
    expect(repaidOrderDetails.repaidAmount).toBe(halfAmount);

    // Full repayment
    await transferFunds(api, paymentAccount, halfAmount, assetId);
    repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('paid');
    expect(repaidOrderDetails.withdrawalStatus).toBe('completed');
    expect(repaidOrderDetails.repaidAmount).toBe(usdcOrderData.amount);
  });

  xit('should not update order if received payment in wrong currency', async () => {
    const orderId = generateRandomOrderId();
    await createOrder(orderId, usdcOrderData);
    const orderDetails = await getOrderDetails(orderId);
    const paymentAccount = orderDetails.paymentAccount;
    expect(paymentAccount).toBeDefined();

    const assetId = 1984; // Different asset ID to simulate wrong currency
    await transferFunds(api, paymentAccount, usdcOrderData.amount, assetId);

    const repaidOrderDetails = await getOrderDetails(orderId);
    expect(repaidOrderDetails.paymentStatus).toBe('pending');
    expect(repaidOrderDetails.withdrawalStatus).toBe('waiting');
    expect(repaidOrderDetails.repaidAmount).toBe(0);
  });

  xit('should return 404 for non-existing order on force withdrawal', async () => {
    const nonExistingOrderId = 'nonExistingOrder123';
    const response = await request(baseUrl)
      .post(`/v2/order/${nonExistingOrderId}/forceWithdrawal`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });
});
