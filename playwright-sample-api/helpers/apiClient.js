// helpers/apiClient.js

const { request } = require('@playwright/test');

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.apiContext = null;
  }

  async init() {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  async get(url) {
    return await this.apiContext.get(url);
  }

  async post(url, data) {
    return await this.apiContext.post(url, { data });
  }

  async put(url, data) {
    return await this.apiContext.put(url, { data });
  }

  async delete(url) {
    return await this.apiContext.delete(url);
  }

  async dispose() {
    await this.apiContext.dispose();
  }
}

module.exports = ApiClient;