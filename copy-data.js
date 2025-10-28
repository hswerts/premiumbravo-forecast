/**
 * Script para copiar dados do banco de PRODUÇÃO para DESENVOLVIMENTO
 * 
 * IMPORTANTE: 
 * - Execute este script apenas quando necessário
 * - Certifique-se de que a estrutura das tabelas já está criada no banco de dev
 * - Este script vai SUBSTITUIR os dados existentes no dev
 */

const { Client } = require('pg');

// Configurações dos bancos
const PROD_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.iohyiycjclqjxfhhewel.supabase.co:5432/postgres';
const DEV_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.oawlnwgxqigwdphshdjr.supabase.co:5432/postgres';

// Lista de tabelas a copiar (na ordem correta para respeitar foreign keys)
// AJUSTE esta lista com suas tabelas reais
const TABLES_TO_COPY = [
  'projects',
  'people',
  'timesheets',
  'assignments',
  // Adicione suas tabelas aqui na ordem correta
];

// Tabelas que você NÃO quer copiar (ex: logs, sessões, etc)
const TABLES_TO_SKIP = [
  //'sessions',
  //'verification_tokens',
  // Adicione tabelas que não devem ser copiadas
];

async function copyData() {
  const prodClient = new Client({ connectionString: PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: DEV_DATABASE_URL });

  try {
    console.log('🔌 Conectando aos bancos de dados...\n');
    await prodClient.connect();
    await devClient.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Se TABLES_TO_COPY estiver vazio, buscar todas as tabelas
    let tablesToCopy = TABLES_TO_COPY;
    
    if (tablesToCopy.length === 0) {
      console.log('📋 Buscando lista de tabelas...');
      const result = await prodClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      tablesToCopy = result.rows
        .map(row => row.table_name)
        .filter(table => !TABLES_TO_SKIP.includes(table));
      
      console.log(`\n📊 Encontradas ${tablesToCopy.length} tabelas:`);
      tablesToCopy.forEach(table => console.log(`   - ${table}`));
      console.log('');
    }

    // Desabilitar triggers e constraints temporariamente no dev
    console.log('⚙️  Desabilitando constraints no banco de desenvolvimento...');
    await devClient.query('SET session_replication_role = replica;');

    let totalRecords = 0;

    for (const table of tablesToCopy) {
      try {
        console.log(`\n📦 Processando tabela: ${table}`);
        
        // Contar registros em produção
        const countResult = await prodClient.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countResult.rows[0].count);
        
        if (count === 0) {
          console.log(`   ⚠️  Tabela vazia - pulando`);
          continue;
        }

        console.log(`   📊 ${count} registros encontrados`);

        // Buscar todos os dados da tabela em produção
        const dataResult = await prodClient.query(`SELECT * FROM "${table}"`);
        const rows = dataResult.rows;

        if (rows.length === 0) continue;

        // Limpar tabela em desenvolvimento
        console.log(`   🗑️  Limpando tabela em desenvolvimento...`);
        await devClient.query(`TRUNCATE TABLE "${table}" CASCADE`);

        // Obter colunas
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        
        // Inserir dados em lotes para melhor performance
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map((col, idx) => `$${idx + 1}`).join(', ');
            const params = columns.map(col => row[col]);
            
            await devClient.query(
              `INSERT INTO "${table}" (${columnNames}) VALUES (${values})`,
              params
            );
          }
          
          inserted += batch.length;
          console.log(`   ⬆️  Inseridos ${inserted}/${rows.length} registros...`);
        }

        totalRecords += rows.length;
        console.log(`   ✅ Tabela "${table}" copiada com sucesso!`);

      } catch (error) {
        console.error(`   ❌ Erro ao copiar tabela "${table}":`, error.message);
        // Continua com a próxima tabela
      }
    }

    // Reabilitar constraints
    console.log('\n⚙️  Reabilitando constraints...');
    await devClient.query('SET session_replication_role = DEFAULT;');

    // Atualizar sequences (auto-increment)
    console.log('\n🔄 Atualizando sequences...');
    for (const table of tablesToCopy) {
      try {
        await devClient.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1),
            true
          );
        `);
      } catch (error) {
        // Ignora se a tabela não tem campo id ou sequence
      }
    }

    console.log(`\n✨ Cópia concluída com sucesso!`);
    console.log(`📊 Total de registros copiados: ${totalRecords}`);

  } catch (error) {
    console.error('\n❌ Erro durante a cópia:', error);
    throw error;
  } finally {
    await prodClient.end();
    await devClient.end();
    console.log('\n🔌 Conexões encerradas.');
  }
}

// Confirmar antes de executar
console.log('⚠️  ATENÇÃO: Este script vai SUBSTITUIR todos os dados no banco de DESENVOLVIMENTO!');
console.log('⚠️  Certifique-se de que:');
console.log('   1. As URLs dos bancos estão corretas');
console.log('   2. A estrutura das tabelas já foi copiada');
console.log('   3. Você realmente quer fazer isso\n');

// Executar
copyData()
  .then(() => {
    console.log('\n✅ Processo finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Processo falhou:', error);
    process.exit(1);
  });
