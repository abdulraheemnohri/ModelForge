const axios = require('axios');

class ModelForgeClient {
  constructor(baseUrl, apiKey) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listModels() {
    const response = await this.client.get('/api/models');
    return response.data;
  }

  async chat(modelName, messages, stream = false) {
    const response = await this.client.post('/api/chat', {
      model: modelName,
      messages: messages,
      stream: stream
    });
    return response.data;
  }

  async getStats() {
    const response = await this.client.get('/api/stats');
    return response.data;
  }
}

module.exports = ModelForgeClient;
