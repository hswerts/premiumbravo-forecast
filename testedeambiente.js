/**
 * Script de TESTES para validar o ambiente de desenvolvimento
 * Testa conexões, estrutura e dados
 */

const { Client } = require('pg');

// ===== CONFIGURE SUAS URLs AQUI =====
const PROD_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.iohyiycjclqjxfhhewel.supabase.co:5432/postgres';
const DEV_DATABASE_URL = 'postgresql://postgres:Rtaj8787@@db.oawlnwgxqigwdphshdjr.supabase.co:5432/postgres';
// ====================================

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logSuccess(message) {
  console.log(`✅ ${message}`);
  tests.passed++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  tests.failed++;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  tests.warnings++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function testConnection(url, name) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    logSuccess(`Conexão com ${name} funcionando`);
    await client.end();
    return true;
  } catch (error) {
    logError(`Falha ao conectar com ${name}: ${error.message}`);
    return false;
  }
}

async function getTables(client) {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return result.rows.map(row => row.table_name);
}

async function getTableStructure(client, tableName) {
  const result = await client.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  return result.rows;
}

async function getRecordCount(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 INICIANDO TESTES DO AMBIENTE DE DESENVOLVIMENTO');
  console.log('═══════════════════════════════════════════════════════\n');

  // TESTE 1: Conexão com PRODUÇÃO
  console.log('📌 TESTE 1: Conexão com banco de PRODUÇÃO');
  console.log('─────────────────────────────────────────────────────');
  const prodConnected = await testConnection(PROD_DATABASE_URL, 'PRODUÇÃO');
  console.log('');

  if (!prodConnected) {
    console.log('\n❌ Não foi possível continuar os testes sem conexão com PRODUÇÃO.\n');
    return;
  }

  // TESTE 2: Conexão com DESENVOLVIMENTO
  console.log('📌 TESTE 2: Conexão com banco de DESENVOLVIMENTO');
  console.log('─────────────────────────────────────────────────────');
  const devConnected = await testConnection(DEV_DATABASE_URL, 'DESENVOLVIMENTO');
  console.log('');

  if (!devConnected) {
    console.log('\n❌ Não foi possível continuar os testes sem conexão com DESENVOLVIMENTO.\n');
    return;
  }

  const prodClient = new Client({ connectionString: PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: DEV_DATABASE_URL });

  try {
    await prodClient.connect();
    await devClient.connect();

    // TESTE 3: Comparar tabelas
    console.log('📌 TESTE 3: Estrutura das tabelas');
    console.log('─────────────────────────────────────────────────────');
    
    const prodTables = await getTables(prodClient);
    const devTables = await getTables(devClient);

    logInfo(`Tabelas em PRODUÇÃO: ${prodTables.length}`);
    logInfo(`Tabelas em DESENVOLVIMENTO: ${devTables.length}`);
    console.log('');

    // Verificar se todas as tabelas de produção existem em dev
    const missingTables = prodTables.filter(table => !devTables.includes(table));
    const extraTables = devTables.filter(table => !prodTables.includes(table));

    if (missingTables.length === 0) {
      logSuccess('Todas as tabelas de produção existem em desenvolvimento');
    } else {
      logError(`${missingTables.length} tabela(s) faltando em desenvolvimento:`);
      missingTables.forEach(table => console.log(`     - ${table}`));
    }

    if (extraTables.length > 0) {
      logWarning(`${extraTables.length} tabela(s) extras em desenvolvimento:`);
      extraTables.forEach(table => console.log(`     - ${table}`));
    }

    console.log('');

    // TESTE 4: Comparar estrutura de cada tabela
    console.log('📌 TESTE 4: Estrutura das colunas (primeiras 5 tabelas)');
    console.log('─────────────────────────────────────────────────────');
    
    const tablesToCheck = prodTables.slice(0, 5); // Checando apenas as 5 primeiras para não sobrecarregar

    for (const table of tablesToCheck) {
      if (!devTables.includes(table)) continue;

      const prodStructure = await getTableStructure(prodClient, table);
      const devStructure = await getTableStructure(devClient, table);

      const prodColumns = prodStructure.map(col => col.column_name);
      const devColumns = devStructure.map(col => col.column_name);

      const missingColumns = prodColumns.filter(col => !devColumns.includes(col));
      
      if (missingColumns.length === 0 && prodColumns.length === devColumns.length) {
        logSuccess(`Tabela "${table}": estrutura idêntica (${prodColumns.length} colunas)`);
      } else {
        logWarning(`Tabela "${table}": diferenças encontradas`);
        if (missingColumns.length > 0) {
          console.log(`     Colunas faltando: ${missingColumns.join(', ')}`);
        }
      }
    }

    if (tablesToCheck.length < prodTables.length) {
      logInfo(`(Mostrando apenas primeiras 5 de ${prodTables.length} tabelas)`);
    }

    console.log('');

    // TESTE 5: Comparar quantidade de dados
    console.log('📌 TESTE 5: Quantidade de registros');
    console.log('─────────────────────────────────────────────────────');
    
    let totalProdRecords = 0;
    let totalDevRecords = 0;

    for (const table of prodTables) {
      if (!devTables.includes(table)) continue;

      const prodCount = await getRecordCount(prodClient, table);
      const devCount = await getRecordCount(devClient, table);

      if (prodCount !== null) totalProdRecords += prodCount;
      if (devCount !== null) totalDevRecords += devCount;

      if (prodCount === devCount) {
        if (prodCount > 0) {
          logSuccess(`"${table}": ${prodCount} registros em ambos`);
        }
      } else {
        if (prodCount === 0 && devCount === 0) {
          logInfo(`"${table}": tabela vazia em ambos`);
        } else {
          logWarning(`"${table}": PROD=${prodCount}, DEV=${devCount}`);
        }
      }
    }

    console.log('');
    console.log(`📊 Total de registros em PRODUÇÃO: ${totalProdRecords}`);
    console.log(`📊 Total de registros em DESENVOLVIMENTO: ${totalDevRecords}`);
    console.log('');

    // TESTE 6: Testar consultas básicas
    console.log('📌 TESTE 6: Consultas básicas funcionando');
    console.log('─────────────────────────────────────────────────────');
    
    try {
      // Testa uma consulta simples
      await devClient.query('SELECT NOW() as current_time');
      logSuccess('Consultas SQL funcionando corretamente');
    } catch (error) {
      logError(`Erro ao executar consultas: ${error.message}`);
    }

    try {
      // Testa se pode criar e deletar tabela temporária
      await devClient.query('CREATE TEMP TABLE test_table (id INT)');
      await devClient.query('INSERT INTO test_table VALUES (1)');
      await devClient.query('SELECT * FROM test_table');
      await devClient.query('DROP TABLE test_table');
      logSuccess('Permissões de escrita/leitura funcionando');
    } catch (error) {
      logError(`Erro nas permissões: ${error.message}`);
    }

    console.log('');

    // TESTE 7: Verificar extensões do PostgreSQL
    console.log('📌 TESTE 7: Extensões do PostgreSQL');
    console.log('─────────────────────────────────────────────────────');
    
    const extensionsResult = await devClient.query(`
      SELECT extname FROM pg_extension ORDER BY extname;
    `);
    
    const extensions = extensionsResult.rows.map(row => row.extname);
    logInfo(`Extensões instaladas: ${extensions.length}`);
    extensions.forEach(ext => console.log(`     - ${ext}`));
    
    console.log('');

  } catch (error) {
    logError(`Erro durante os testes: ${error.message}`);
  } finally {
    await prodClient.end();
    await devClient.end();
  }

  // RESUMO FINAL
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Testes bem-sucedidos: ${tests.passed}`);
  console.log(`❌ Testes com falha: ${tests.failed}`);
  console.log(`⚠️  Avisos: ${tests.warnings}`);
  console.log('');

  if (tests.failed === 0 && tests.warnings === 0) {
    console.log('🎉 TUDO PERFEITO! Seu ambiente de desenvolvimento está 100% pronto!\n');
  } else if (tests.failed === 0) {
    console.log('✨ QUASE LÁ! Apenas alguns avisos, mas nada crítico.\n');
  } else {
    console.log('⚠️  ATENÇÃO! Alguns problemas precisam ser corrigidos.\n');
  }
}

// Executar testes
console.log('');
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });