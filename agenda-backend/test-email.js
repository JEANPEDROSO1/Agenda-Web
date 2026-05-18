require('dotenv').config();
const { sendEventEmail } = require('./api/emailService');

(async () => {
    try {
        console.log("Iniciando teste de envio de email...");
        console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL);
        console.log("CLIENT_ID:", process.env.AZURE_CLIENT_ID);
        
        await sendEventEmail(
            'jeancarlocaleffipedroso713@gmail.com', 
            "Teste de Integração - Urgente", 
            "Agora", 
            "http://localhost:8082", 
            true
        );
        console.log("Script finalizado.");
    } catch (e) {
        console.error("Erro fatal no teste:", e);
    }
})();
