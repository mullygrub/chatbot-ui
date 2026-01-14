# CalleoGPT API Backend

Azure Functions backend for CalleoGPT that uses Managed Identity and Key Vault for secure access to Azure OpenAI.

## Architecture

```
Frontend (chatbot-ui) → Azure Functions API → Key Vault → Azure OpenAI
                              ↑
                        Managed Identity
```

## Setup Instructions

### Prerequisites

- Azure CLI installed
- Node.js 18+ installed
- Azure Functions Core Tools v4

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Authenticate with Azure:**
   ```bash
   az login
   ```

3. **Ensure `local.settings.json` has correct Key Vault name:**
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsStorage": "",
       "KEY_VAULT_NAME": "calleo-gpt-kv-1768388685"
     }
   }
   ```

4. **Grant yourself Key Vault access (if not already done):**
   ```bash
   az role assignment create \
     --role "Key Vault Secrets User" \
     --assignee $(az ad signed-in-user show --query id -o tsv) \
     --scope $(az keyvault show --name calleo-gpt-kv-1768388685 --query id -o tsv)
   ```

5. **Start the local Functions:**
   ```bash
   npm start
   ```

Functions will be available at:
- `http://localhost:7071/api/chat` (POST)
- `http://localhost:7071/api/models` (GET)

### Deploy to Azure

1. **Create Function App:**
   ```bash
   az functionapp create \
     --resource-group calleo-gpt-rg \
     --consumption-plan-location australiaeast \
     --runtime node \
     --runtime-version 18 \
     --functions-version 4 \
     --name calleo-gpt-api \
     --storage-account <storage-account-name> \
     --os-type Linux
   ```

2. **Enable Managed Identity:**
   ```bash
   az functionapp identity assign \
     --name calleo-gpt-api \
     --resource-group calleo-gpt-rg
   ```

3. **Grant Managed Identity access to Key Vault:**
   ```bash
   FUNCTION_PRINCIPAL_ID=$(az functionapp identity show \
     --name calleo-gpt-api \
     --resource-group calleo-gpt-rg \
     --query principalId -o tsv)
   
   az role assignment create \
     --role "Key Vault Secrets User" \
     --assignee $FUNCTION_PRINCIPAL_ID \
     --scope $(az keyvault show --name calleo-gpt-kv-1768388685 --query id -o tsv)
   ```

4. **Configure Function App settings:**
   ```bash
   az functionapp config appsettings set \
     --name calleo-gpt-api \
     --resource-group calleo-gpt-rg \
     --settings KEY_VAULT_NAME=calleo-gpt-kv-1768388685
   ```

5. **Deploy the code:**
   ```bash
   func azure functionapp publish calleo-gpt-api
   ```

## API Endpoints

### POST /api/chat
Chat completion endpoint compatible with OpenAI API format.

**Request body:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": false
}
```

### GET /api/models
Returns list of available models.

## Security

- **No secrets in code**: All secrets stored in Azure Key Vault
- **Managed Identity**: Function App uses Managed Identity to access Key Vault
- **RBAC**: Fine-grained access control via Azure RBAC
- **Audit**: All secret access logged in Key Vault audit logs

## Troubleshooting

### "Failed to fetch secrets from Key Vault"
- Ensure Managed Identity is enabled on Function App
- Verify RBAC role assignment for Key Vault
- Check KEY_VAULT_NAME environment variable is set

### Authentication errors locally
- Run `az login` to authenticate
- Ensure you have "Key Vault Secrets User" role on the Key Vault

### Module not found errors
- Run `npm install` to install dependencies
- Ensure package.json is in the correct directory
