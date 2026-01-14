const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

let cachedSecrets = null;

/**
 * Get secrets from Azure Key Vault using Managed Identity
 * Caches secrets to avoid repeated Key Vault calls
 */
async function getSecrets() {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const keyVaultName = process.env.KEY_VAULT_NAME;
  if (!keyVaultName) {
    throw new Error("KEY_VAULT_NAME environment variable not set");
  }

  const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
  
  // Use DefaultAzureCredential which works with Managed Identity in Azure
  // and falls back to other auth methods locally (Azure CLI, etc.)
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUrl, credential);

  try {
    // Fetch all required secrets
    const [apiKey, endpoint, deployment, apiVersion] = await Promise.all([
      client.getSecret("AZURE-OPENAI-API-KEY"),
      client.getSecret("AZURE-OPENAI-ENDPOINT"),
      client.getSecret("AZURE-OPENAI-DEPLOYMENT"),
      client.getSecret("AZURE-OPENAI-API-VERSION")
    ]);

    cachedSecrets = {
      apiKey: apiKey.value,
      endpoint: endpoint.value,
      deployment: deployment.value,
      apiVersion: apiVersion.value
    };

    return cachedSecrets;
  } catch (error) {
    console.error("Error fetching secrets from Key Vault:", error);
    throw new Error("Failed to fetch secrets from Key Vault");
  }
}

module.exports = { getSecrets };
