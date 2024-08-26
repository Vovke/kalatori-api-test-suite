import request from 'supertest';

describe('Blackbox API Tests', () => {
  const baseUrl = 'http://127.0.0.1:16726';

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
    expect(response.body.supported_currencies).toEqual({}); // Expecting an empty object as per the response
  });
});
