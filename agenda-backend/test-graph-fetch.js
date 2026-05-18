require('dotenv').config();
const msal = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');
const fetch = require('isomorphic-fetch');

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
        authority: 'https://login.microsoftonline.com/consumers',
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
        if (accounts.length === 0) {
            console.log("Nenhuma conta encontrada no cache.");
            return;
        }

        const silentRequest = {
            account: accounts[0],
            scopes: ["user.read", "mail.send", "offline_access"],
        };
        const response = await cca.acquireTokenSilent(silentRequest);
        const token = response.accessToken;
        console.log("Token obtido com sucesso!");

        console.log("Enviando e-mail de teste via direct FETCH...");
        const sendMailBody = {
            message: {
                subject: "Teste Direct Fetch",
                body: {
                    contentType: 'HTML',
                    content: "<h1>Funcionou via Fetch!</h1>"
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: "agenda-web@outlook.com"
                        }
                    }
                ]
            },
            saveToSentItems: false
        };

        const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(sendMailBody)
        });

        if (res.status === 202 || res.status === 200) {
            console.log("🎉 E-mail enviado com sucesso via FETCH!");
        } else {
            const errText = await res.text();
            console.log(`❌ Erro no envio (${res.status}):`, errText);
        }
    } catch (e) {
        console.error("Erro fatal:", e);
    }
})();
