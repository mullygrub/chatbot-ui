const { app } = require('@azure/functions');
const { getSecrets } = require('../shared/keyVaultHelper');

app.http('models', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'models',
  handler: async (request, context) => {
    try {
      // Get deployment name from Key Vault
      const secrets = await getSecrets();
      
      // Return a models list compatible with OpenAI API format
      // This tells chatbot-ui what model is available
      return {
        status: 200,
        jsonBody: {
          object: 'list',
          data: [
            {
              id: secrets.deployment,
              object: 'model',
              created: Date.now(),
              owned_by: 'azure-openai',
              permission: [],
              root: secrets.deployment,
              parent: null
            }
          ]
        }
      };
    } catch (error) {
      context.error('Error in models function:', error);
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
