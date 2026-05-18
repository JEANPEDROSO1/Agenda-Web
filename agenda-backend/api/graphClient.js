const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs');
const path = require('path');
require('isomorphic-fetch');
require('dotenv').config();

const cachePath = path.join(__dirname, 'tokenCache.json');

// Plugin para persistir os tokens localmente
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
        authority: 'https://login.microsoftonline.com/consumers',
        clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
    cache: {
        cachePlugin
    }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);
const redirectUri = "http://localhost:5000/auth/microsoft/callback";

// Gera a URL para o usuário fazer login
const getAuthUrl = async () => {
    const authCodeUrlParameters = {
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
    };
    return cca.getAuthCodeUrl(authCodeUrlParameters);
};

// Resgata o Token usando o código retornado pela Microsoft
const acquireTokenByCode = async (code) => {
    const tokenRequest = {
        code: code,
        scopes: ["user.read", "mail.send", "offline_access"],
        redirectUri: redirectUri,
    };
    const response = await cca.acquireTokenByCode(tokenRequest);
    return response;
};

// Pega o cliente do Graph autenticado silenciosamente
const getGraphClient = async () => {
    const accounts = await cca.getTokenCache().getAllAccounts();
    if (accounts.length === 0) {
        throw new Error("Nenhuma conta autenticada encontrada. Faça login em http://localhost:5000/auth/microsoft");
    }

    return Client.init({
        authProvider: async (done) => {
            try {
                const silentRequest = {
                    account: accounts[0],
                    scopes: ["user.read", "mail.send", "offline_access"],
                };
                const response = await cca.acquireTokenSilent(silentRequest);
                done(null, response.accessToken);
            } catch (error) {
                console.error("Erro ao adquirir token silent no authProvider:", error);
                done(error, null);
            }
        }
    });
};

module.exports = { getAuthUrl, acquireTokenByCode, getGraphClient };
