const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');

/**
 * @returns {Promise<number>} Cantidad de índices verificados.
 */
async function ensureChatbotSearchIndexes() {
    const sqlPath = path.resolve(__dirname, '../migrations/migracion_busqueda_chatbot.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await sequelize.query(sql);

    const [indices] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%\\_trgm'`
    );

    console.log(`[schema] Índices de búsqueda del chatbot verificados: ${indices.length}`);
    return indices.length;
}

module.exports = { ensureChatbotSearchIndexes };