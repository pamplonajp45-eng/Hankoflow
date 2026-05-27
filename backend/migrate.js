const { Client } = require('pg');
require('dotenv').config();

function printConnectionHelp(error) {
  const isLocalRefused = error.code === 'ECONNREFUSED'
    && (error.address === '127.0.0.1' || error.address === 'localhost')
    && String(error.port) === '5432'
    && !process.env.DATABASE_URL;

  if (!isLocalRefused) {
    return;
  }

  console.error('\nThe migration is trying to connect to local Postgres at 127.0.0.1:5432.');
  console.error('For Supabase, set DATABASE_URL in backend/.env, then rerun npm run migrate.');
  console.error('Recommended Supabase pooler format:');
  console.error('DATABASE_URL=postgresql://postgres.lcfadiceswkkokyvvgoc:YOUR_DATABASE_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\n');
}

function printPoolerTenantHelp(error) {
  const message = error.message || '';
  if (!message.includes('tenant/user') || !message.includes('not found')) {
    return;
  }

  console.error('\nSupabase pooler rejected the tenant/user in DATABASE_URL.');
  console.error('Copy the exact Transaction pooler connection string from Supabase instead of typing it manually:');
  console.error('Project Settings -> Database -> Connection string -> Transaction pooler');
  console.error('Then replace only the password placeholder and rerun npm run migrate.\n');
}

async function runMigration() {
  const clientConfig = process.env.DATABASE_URL
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: (process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost') ? { rejectUnauthorized: false } : false
      };

  console.log('Connecting to PostgreSQL/Supabase database...');
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Successfully connected to database.');

    // Create requests table
    console.log('Creating table "requests"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        file_path VARCHAR(500) NOT NULL,
        submitted_by VARCHAR(255) NOT NULL,
        supervisor_email VARCHAR(255),
        assistant_manager_email VARCHAR(255),
        manager_email VARCHAR(255),
        approval_mode VARCHAR(50) NOT NULL DEFAULT 'sequential',
        approver_chain JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
        current_level INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS supervisor_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS assistant_manager_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS approval_mode VARCHAR(50) NOT NULL DEFAULT 'sequential',
      ADD COLUMN IF NOT EXISTS approver_chain JSONB;
    `);

    await client.query(`
      ALTER TABLE requests
      DROP CONSTRAINT IF EXISTS requests_approval_mode_check;
    `);

    await client.query(`
      ALTER TABLE requests
      ADD CONSTRAINT requests_approval_mode_check
      CHECK (approval_mode IN ('sequential', 'parallel'));
    `);

    await client.query(`
      ALTER TABLE requests
      DROP CONSTRAINT IF EXISTS requests_status_check;
    `);

    await client.query(`
      ALTER TABLE requests
      ADD CONSTRAINT requests_status_check
      CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
    `);

    // Create approval_logs table
    console.log('Creating table "approval_logs"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_logs (
        id SERIAL PRIMARY KEY,
        request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        level INT NOT NULL,
        approver_email VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (action IN ('approved', 'rejected', 'pending')),
        action_token VARCHAR(128) UNIQUE,
        deadline TIMESTAMPTZ NOT NULL,
        confirmed_at TIMESTAMPTZ NULL DEFAULT NULL
      );
    `);

    await client.query(`
      ALTER TABLE approval_logs
      ADD COLUMN IF NOT EXISTS action_token VARCHAR(128) UNIQUE;
    `);

    // Create reminders table
    console.log('Creating table "reminders"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        approval_log_id INT NOT NULL REFERENCES approval_logs(id) ON DELETE CASCADE,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Migration completed successfully! All tables created.');
  } catch (error) {
    console.error('Migration failed:', error);
    printConnectionHelp(error);
    printPoolerTenantHelp(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

runMigration();
