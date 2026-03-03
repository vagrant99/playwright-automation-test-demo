const { test, expect } = require('@playwright/test');
const ApiClient = require('../../helpers/apiClient');

test.describe('JSONPlaceholder API Automation', () => {

  let api;
  let createdId;

  test.beforeAll(async () => {
    api = new ApiClient('https://jsonplaceholder.typicode.com');
    await api.init();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  // GET USERS
  test('GET - Users List', async () => {
    const response = await api.get('/users');

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log("BODY:", body);

    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);

    body.forEach(user => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
    });
  });

  // POST
  test('POST - Create Post', async () => {
    const response = await api.post('/posts', {
      title: 'Playwright API Test',
      body: 'Learning API automation',
      userId: 1
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    createdId = body.id;

    expect(body.title).toBe('Playwright API Test');
    expect(body.userId).toBe(1);
  });

  // PUT
  test('PUT - Update Post', async () => {
    const response = await api.put('/posts/1', {
      id: 1,
      title: 'Updated Title',
      body: 'Updated body content',
      userId: 1
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.title).toBe('Updated Title');
  });

  // DELETE
  test('DELETE - Remove Post', async () => {
    const response = await api.delete('/posts/1');

    expect(response.status()).toBe(200);
  });

});