const { app } = require('@azure/functions');
const { getSecrets } = require('../shared/keyVaultHelper');
const { AzureOpenAI } = require('openai');

app.http('chat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: async (request, context) => {
    try {
      // Get secrets from Key Vault
      const secrets = await getSecrets();
      
      // Parse request body
      const body = await request.json();
      const { messages, model, temperature, max_tokens, stream } = body;

      // Validate required fields
      if (!messages || !Array.isArray(messages)) {
        return {
          status: 400,
          jsonBody: { error: 'Messages array is required' }
        };
      }

      // Initialize Azure OpenAI client
      const client = new AzureOpenAI({
        apiKey: secrets.apiKey,
        endpoint: secrets.endpoint,
        apiVersion: secrets.apiVersion,
        deployment: secrets.deployment
      });

      // Handle streaming vs non-streaming
      if (stream) {
        // For streaming, we need to handle Server-Sent Events
        const completion = await client.chat.completions.create({
          model: secrets.deployment,
          messages: messages,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 2000,
          stream: true
        });

        // Create readable stream for SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of completion) {
                const data = JSON.stringify(chunk);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: stream
        };
      } else {
        // Non-streaming response
        const completion = await client.chat.completions.create({
          model: secrets.deployment,
          messages: messages,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 2000,
          stream: false
        });

        return {
          status: 200,
          jsonBody: completion
        };
      }
    } catch (error) {
      context.error('Error in chat function:', error);
      return {
        status: 500,
        jsonBody: { 
          error: 'Internal server error',
          message: error.message 
        }
      };
    }
  }
});
