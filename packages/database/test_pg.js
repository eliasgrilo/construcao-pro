const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hiilxepabvrxfiqgbjue:Kgg1852%21%21%21%24@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
    await client.connect();

    const res = await client.query(`
    SELECT r.routine_name, p.parameter_name, p.data_type 
    FROM information_schema.routines r
    JOIN information_schema.parameters p ON r.specific_name = p.specific_name
    WHERE r.routine_name IN ('criar_movimentacao_entrada', 'criar_movimentacao_saida', 'criar_movimentacao_transferencia')
    ORDER BY r.routine_name, p.ordinal_position;
  `);

    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

run();
