require('dotenv').config();
const { getAuthUrl } = require('./api/graphClient');

(async () => {
    try {
        console.log("=== INSPECIONANDO CREDENCIAIS ===");
        console.log("AZURE_CLIENT_ID:", process.env.AZURE_CLIENT_ID);
        console.log("AZURE_CLIENT_SECRET:", process.env.AZURE_CLIENT_SECRET);
        console.log("AZURE_TENANT_ID:", process.env.AZURE_TENANT_ID);
        
        const url = await getAuthUrl();
        console.log("\n=== URL DE AUTENTICAÇÃO GERADA ===");
        console.log(url);
    } catch (e) {
        console.error("Erro ao gerar URL:", e);
    }
})();
