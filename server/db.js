// db.js — Pool de conexiones MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'helpdesk_itil',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  // Convierte automáticamente fechas MySQL a objetos Date de JS
  dateStrings:        false,
});

// Verificar conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado — base de datos:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('   Verifica las credenciales en el archivo .env');
    process.exit(1);
  });

module.exports = pool;
