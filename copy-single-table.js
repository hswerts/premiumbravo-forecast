/**
 * Script SIMPLIFICADO para copiar UMA tabela por vez
 * Mais fácil de testar e debugar
 */

const { Client } = require('pg');

// ===== CONFIGURE AQUI =====
const PROD_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.iohyiycjclqjxfhhewel.supabase.co:5432/postgres';
const DEV_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.oawlnwgxqigwdphshdjr.supabase.co:5432/postgres';

// Nome da tabela a copiar
const TABLE_NAME = 'projects'; // <-- MUDE AQUI

// ==========================

async function copyTable() {
  const prodClient = new Client({ connectionString: PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: DEV_DATABASE_URL });

  try {
    console.log(`\n🔌 Conectando aos bancos...`);
    await prodClient.connect();
    await devClient.connect();
    console.log(`✅ Conectado!\n`);

    // Contar registros
    console.log(`📊 Contando registros da tabela "${TABLE_NAME}" em produção...`);
    const countResult = await prodClient.query(`SELECT COUNT(*) FROM "${TABLE_NAME}"`);
    const totalRecords = parseInt(countResult.rows[0].count);
    
    console.log(`   Encontrados: ${totalRecords} registros\n`);

    if (totalRecords === 0) {
      console.log('⚠️  Tabela vazia! Nada a copiar.');
      return;
    }

    // Buscar dados
    console.log(`📦 Buscando dados de produção...`);
    const dataResult = await prodClient.query(`SELECT * FROM "${TABLE_NAME}"`);
    const rows = dataResult.rows;
    console.log(`✅ ${rows.length} registros carregados\n`);

    // Limpar tabela em DEV
    console.log(`🗑️  Limpando tabela em desenvolvimento...`);
    await devClient.query(`TRUNCATE TABLE "${TABLE_NAME}" CASCADE`);
    console.log(`✅ Tabela limpa\n`);

    // Inserir dados
    console.log(`⬆️  Inserindo dados...`);
    
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map((col, idx) => `$${idx + 1}`).join(', ');
      const params = columns.map(col => row[col]);
      
      await devClient.query(
        `INSERT INTO "${TABLE_NAME}" (${columnNames}) VALUES (${values})`,
        params
      );
      
      inserted++;
      if (inserted % 50 === 0) {
        console.log(`   Progresso: ${inserted}/${totalRecords}`);
      }
    }

    console.log(`\n✨ Sucesso! ${inserted} registros copiados para desenvolvimento.`);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await prodClient.end();
    await devClient.end();
    console.log(`\n🔌 Conexões encerradas.\n`);
  }
}

// Executar
console.log(`\n⚠️  Você vai copiar a tabela "${TABLE_NAME}" de PROD para DEV`);
console.log(`⚠️  Isso vai APAGAR todos os dados atuais da tabela em DEV!\n`);

copyTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
