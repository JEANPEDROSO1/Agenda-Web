const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs');
const path = require('path');
require('isomorphic-fetch');
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
  require('dotenv').config();
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });
}

const db = require('../config/db');

// Plugin para persistir os tokens no banco de dados MySQL
const cachePlugin = {
    beforeCacheAccess: async (cacheContext) => {
        return new Promise((resolve) => {
            db.query('SELECT cache_data FROM msal_cache WHERE id = 1', (err, results) => {
                if (err) {
                    console.error('[MSAL DB Cache] Erro ao carregar cache do DB:', err);
                } else if (results.length > 0) {
                    try {
                        cacheContext.tokenCache.deserialize(results[0].cache_data);
                        console.log('[MSAL DB Cache] Cache de tokens Microsoft carregado do banco 🛡️');
                    } catch (e) {
                        console.error('[MSAL DB Cache] Erro ao deserializar cache do DB:', e);
                    }
                }
                resolve();
            });
        });
    },
    afterCacheAccess: async (cacheContext) => {
        if (cacheContext.cacheHasChanged) {
            return new Promise((resolve) => {
                const serialized = cacheContext.tokenCache.serialize();
                db.query(
                    'INSERT INTO msal_cache (id, cache_data) VALUES (1, ?) ON DUPLICATE KEY UPDATE cache_data = ?',
                    [serialized, serialized],
                    (err) => {
                        if (err) {
                            console.error('[MSAL DB Cache] Erro ao salvar cache no DB:', err);
                        } else {
                            console.log('[MSAL DB Cache] Cache de tokens Microsoft salvo no banco com sucesso 🛡️');
                        }
                        resolve();
                    }
                );
            });
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
const redirectUri = process.env.REDIRECT_URI || "http://localhost:5000/auth/microsoft/callback";

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
