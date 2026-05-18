const db = require('./config/db');

db.query('SELECT * FROM usuarios', (err, users) => {
    if (err) {
        console.error("Erro usuarios:", err);
    } else {
        console.log("=== USUÁRIOS NO BANCO ===");
        console.log(users);
    }
    
    db.query('SELECT * FROM eventos', (err, events) => {
        if (err) {
            console.error("Erro eventos:", err);
        } else {
            console.log("=== EVENTOS NO BANCO ===");
            console.log(events);
        }
        db.end();
    });
});
