/**
 * Script DEFINITIVO para copiar ENUMs e dados da tabela projects
 * Corrige problemas de encoding e acentuação
 */

const { Client } = require('pg');

// ===== CONFIGURE AQUI =====
const PROD_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.iohyiycjclqjxfhhewel.supabase.co:5432/postgres';
const DEV_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.oawlnwgxqigwdphshdjr.supabase.co:5432/postgres';
// ==========================

async function finalFix() {
  const prodClient = new Client({ connectionString: PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: DEV_DATABASE_URL });

  try {
    console.log('\n🔌 Conectando aos bancos...');
    await prodClient.connect();
    await devClient.connect();
    console.log('✅ Conectado!\n');

    // ESTRATÉGIA DIFERENTE: Converter as colunas ENUM para TEXT permanentemente
    console.log('🔄 Convertendo colunas ENUM para TEXT em desenvolvimento...');
    
    // Verificar se a coluna status usa ENUM
    const statusCheck = await devClient.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name = 'status'
    `);

    const typeCheck = await devClient.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name = 'type'
    `);

    console.log(`   Coluna "status": ${statusCheck.rows[0]?.data_type || 'não encontrada'}`);
    console.log(`   Coluna "type": ${typeCheck.rows[0]?.udt_name || 'não encontrada'}\n`);

    // Converter as colunas problemáticas para TEXT
    try {
      await devClient.query(`ALTER TABLE projects ALTER COLUMN status TYPE TEXT`);
      console.log('   ✅ Coluna "status" convertida para TEXT');
    } catch (e) {
      console.log(`   ℹ️  Coluna "status": ${e.message}`);
    }

    try {
      await devClient.query(`ALTER TABLE projects ALTER COLUMN type TYPE TEXT`);
      console.log('   ✅ Coluna "type" convertida para TEXT');
    } catch (e) {
      console.log(`   ℹ️  Coluna "type": ${e.message}`);
    }

    console.log('');

    // Agora copiar os dados
    console.log('📦 Copiando dados da tabela "projects"...');
    
    const countResult = await prodClient.query(`SELECT COUNT(*) FROM "projects"`);
    const totalRecords = parseInt(countResult.rows[0].count);
    console.log(`   📊 Encontrados ${totalRecords} registros\n`);

    // Buscar dados
    console.log('   📥 Buscando dados de produção...');
    const dataResult = await prodClient.query(`SELECT * FROM "projects"`);
    const rows = dataResult.rows;
    console.log(`   ✅ ${rows.length} registros carregados\n`);

    // Limpar tabela
    console.log('   🗑️  Limpando tabela em desenvolvimento...');
    await devClient.query(`TRUNCATE TABLE "projects" CASCADE`);
    console.log('   ✅ Tabela limpa\n');

    // Inserir dados um por um
    console.log('   ⬆️  Inserindo dados...\n');
    
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    
    let inserted = 0;
    let errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const values = columns.map((col, idx) => `$${idx + 1}`).join(', ');
        const params = columns.map(col => row[col]);
        
        await devClient.query(
          `INSERT INTO "projects" (${columnNames}) VALUES (${values})`,
          params
        );
        
        inserted++;
        console.log(`      ✅ Registro ${inserted}/${totalRecords} inserido`);
        
      } catch (error) {
        errors.push({
          index: i + 1,
          data: row,
          error: error.message
        });
        console.log(`      ❌ Erro no registro ${i + 1}: ${error.message}`);
      }
    }

    console.log(`\n📊 Resultado: ${inserted} de ${totalRecords} registros copiados com sucesso\n`);

    if (errors.length > 0) {
      console.log('⚠️  Registros com erro:\n');
      errors.forEach(err => {
        console.log(`   Registro ${err.index}:`);
        console.log(`   - Nome: ${err.data.name || 'N/A'}`);
        console.log(`   - Status: ${err.data.status || 'N/A'}`);
        console.log(`   - Type: ${err.data.type || 'N/A'}`);
        console.log(`   - Erro: ${err.error}\n`);
      });
    }

    if (inserted === totalRecords) {
      console.log('✨ Sucesso total! Todos os registros foram copiados!\n');
    } else {
      console.log('⚠️  Alguns registros tiveram problemas. Veja detalhes acima.\n');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message, '\n');
    throw error;
  } finally {
    await prodClient.end();
    await devClient.end();
    console.log('🔌 Conexões encerradas.\n');
  }
}

// Executar
console.log('\n⚠️  Este script vai:');
console.log('   1. Converter colunas ENUM para TEXT em DEV');
console.log('   2. Copiar todos os dados de PROD para DEV');
console.log('   3. Mostrar detalhes de cada registro copiado\n');

finalFix()
  .then(() => {
    console.log('✅ Processo concluído!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha crítica:', error);
    process.exit(1);
  });