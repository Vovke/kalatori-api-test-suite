import request from 'supertest';

describe('Blackbox API Tests', () => {
  const baseUrl = process.env.DAEMON_HOST;
  if (!baseUrl) {
    throw new Error('DAEMON_HOST environment variable is not defined');
  }

  it('should return server status with valid server_info properties', async () => {
    const response = await request(baseUrl).get('/v2/status');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('description');
    expect(response.body.description).toBe('tododododododo');

    expect(response.body).toHaveProperty('server_info');
    expect(response.body.server_info).toHaveProperty('version');
    expect(response.body.server_info.version).toBe('0.2.0-rc3');
    expect(response.body.server_info).toHaveProperty('instance_id');
    expect(response.body.server_info).toHaveProperty('debug');
    expect(response.body.server_info.debug).toBe(true);

    expect(response.body).toHaveProperty('supported_currencies');

    expect(response.body.supported_currencies).toEqual({
      "DOTL": {
        "chain_name": "rococo",
        "decimals": 10,
        "kind": "native",
        "rpc_url": "wss://node-polkadot.zymologia.fi",
      },
      "USDC": {
        "asset_id": 1337,
        "chain_name": "statemint",
        "decimals": 6,
        "kind": "asset",
        "rpc_url": "wss://node-polkadot-ah.zymologia.fi",
      },
      "USDt": {
        "asset_id": 1984,
        "chain_name": "statemint",
        "decimals": 6,
        "kind": "asset",
        "rpc_url": "wss://node-polkadot-ah.zymologia.fi",
      },
    });
  });
});
