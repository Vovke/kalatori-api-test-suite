import request from 'supertest';

describe('Blackbox API Tests', () => {
  const baseUrl = process.env.DAEMON_HOST;
  if (!baseUrl) {
    throw new Error('DAEMON_HOST environment variable is not defined');
  }

  it('should return server status with valid server_info and supported_currencies', async () => {
    const response = await request(baseUrl).get('/v2/status');

    expect(response.status).toBe(200);

    // Validate server_info properties
    expect(response.body).toHaveProperty('server_info');
    expect(response.body.server_info).toHaveProperty('version');
    expect(response.body.server_info).toHaveProperty('instance_id');
    expect(response.body.server_info).toHaveProperty('debug');
    expect(response.body.server_info.debug).toBe(true);
    expect(response.body.server_info).toHaveProperty('kalatori_remark');

    // Validate supported_currencies properties
    expect(response.body).toHaveProperty('supported_currencies');

    const expectedCurrencies = {
      DOT: {
        chain_name: 'polkadot',
        decimals: 10,
        kind: 'native',
        rpc_url: 'wss://1rpc.io/dot',
        ss58: 0,
      },
      USDC: {
        asset_id: 1337,
        chain_name: 'statemint',
        decimals: 6,
        kind: 'asset',
        rpc_url: 'wss://statemint-rpc.dwellir.com',
        ss58: 0,
      },
      USDt: {
        asset_id: 1984,
        chain_name: 'statemint',
        decimals: 6,
        kind: 'asset',
        rpc_url: 'wss://statemint-rpc.dwellir.com',
        ss58: 0,
      },
    };

    for (const currency in expectedCurrencies) {
      if (expectedCurrencies.hasOwnProperty(currency)) {
        const currencyKey = currency as keyof typeof expectedCurrencies;
        expect(response.body.supported_currencies).toHaveProperty(currency);
        expect(response.body.supported_currencies[currency]).toHaveProperty('chain_name', expectedCurrencies[currencyKey].chain_name);
        expect(response.body.supported_currencies[currency]).toHaveProperty('decimals', expectedCurrencies[currencyKey].decimals);
        expect(response.body.supported_currencies[currency]).toHaveProperty('rpc_url');

        // Check if asset_id exists in the expected currency and then validate it
        if ('asset_id' in expectedCurrencies[currencyKey]) {
          expect(response.body.supported_currencies[currency]).toHaveProperty('asset_id', expectedCurrencies[currencyKey].asset_id);
        }

        expect(response.body.supported_currencies[currency]).toHaveProperty('ss58', expectedCurrencies[currencyKey].ss58);
      }
    }
  });
});
