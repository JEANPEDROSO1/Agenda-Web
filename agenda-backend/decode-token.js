require('dotenv').config();
const msal = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');

const cachePath = path.join(__dirname, 'api', 'tokenCache.json');

const cachePlugin = {
    beforeCacheAccess: async (cacheContext) => {
        if (fs.existsSync(cachePath)) {
            cacheContext.tokenCache.deserialize(fs.readFileSync(cachePath, "utf-8"));
        }
    },
    afterCacheAccess: async (cacheContext) => {
        if (cacheContext.cacheHasChanged) {
            fs.writeFileSync(cachePath, cacheContext.tokenCache.serialize());
        }
    }
};

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
    cache: {
        cachePlugin
    }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

(async () => {
    try {
        const accounts = await cca.getTokenCache().getAllAccounts();
        if (accounts.length > 0) {
            const silentRequest = {
                account: accounts[0],
                scopes: ["user.read", "mail.send", "offline_access"],
            };
            const response = await cca.acquireTokenSilent(silentRequest);
            const token = response.accessToken;
            
            // Decodificar JWT
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = Buffer.from(parts[1], 'base64').toString('utf8');
                const decoded = JSON.parse(payload);
                console.log("=== TOKEN DECODIFICADO ===");
                console.log("Audiência (aud):", decoded.aud);
                console.log("Escopos (scp):", decoded.scp);
                console.log("Nome (name):", decoded.name);
                console.log("Email (upn/email):", decoded.upn || decoded.email || decoded.preferred_username);
                console.log("Tenant ID (tid):", decoded.tid);
            } else {
                console.log("Token não é um JWT válido.");
            }
        } else {
            console.log("Nenhuma conta encontrada.");
        }
    } catch (e) {
        console.error("Erro:", e);
    }
})();
