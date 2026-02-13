import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/forum.db';

let db: Database.Database | null = null;

function resolveMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.resolve(process.cwd(), 'src', 'database', 'migrations'),
    path.resolve(process.cwd(), 'dist', 'database', 'migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Migration directory not found. Checked: ${candidates.join(', ')}`
  );
}

export function getDatabase(): Database.Database {
  if (!db) {
    // 确保数据目录存在
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }

  return db;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  console.log('📦 开始初始化数据库...');

  // 读取并执行迁移脚本
  const migrationsDir = resolveMigrationsDir();

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    console.log(`  执行迁移: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }

  console.log('✅ 数据库初始化完成');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
