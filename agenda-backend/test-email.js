require('dotenv').config();
const { sendEventEmail } = require('./api/emailService');

(async () => {
    try {
        console.log("Iniciando teste de envio de email...");
        console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL);
        console.log("CLIENT_ID:", process.env.AZURE_CLIENT_ID);
        
        await sendEventEmail(
            'jeancarlocaleffipedroso713@gmail.com', 
            "Jean Pedroso", 
            "Teste de Integração - Urgente", 
            "27/05/2026 às 12:00", 
            "https://agendaweb360.vercel.app"
        );
        console.log("Script finalizado.");
    } catch (e) {
        console.error("Erro fatal no teste:", e);
    }
})();
