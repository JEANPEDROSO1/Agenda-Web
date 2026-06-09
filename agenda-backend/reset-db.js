// reset-db.js – wipe all data (eventos and usuarios) safely
// Run with: node reset-db.js

const db = require('./config/db');

async function resetDatabase() {
  // Disable foreign key checks to allow truncation order
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 0', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Delete rows from eventos and usuarios
  await new Promise((resolve, reject) => {
    db.query('DELETE FROM eventos', err => {
      if (err) return reject(err);
      console.log('All eventos cleared.');
      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.query('DELETE FROM usuarios', err => {
      if (err) return reject(err);
      console.log('All usuarios cleared.');
      resolve();
    });
  });

  // Re‑enable foreign key checks
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 1', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  console.log('Database reset complete.');
  process.exit(0);
}

resetDatabase().catch(err => {
  console.error('Error resetting database:', err);
  process.exit(1);
});
