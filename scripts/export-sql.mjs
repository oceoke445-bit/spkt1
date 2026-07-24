import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'spkt.db');
const sqlOutputPath = path.join(dataDir, 'spkt_dump.sql');
const mysqlOutputPath = path.join(dataDir, 'spkt_mysql.sql');

if (!fs.existsSync(dbPath)) {
  console.error(`Database tidak ditemukan: ${dbPath}`);
  process.exit(1);
}

try {
  // 1. Export ke format SQL standar
  const cmd = `python -c "import sqlite3; db = sqlite3.connect(r'${dbPath}'); open(r'${sqlOutputPath}', 'w', encoding='utf-8').write('\\n'.join(db.iterdump()))"`;
  execSync(cmd);
  console.log(`✅ Berhasil meng-export database UTAMA ke 'spkt_dump.sql'!`);

  // 2. Buat versi ramah MySQL / phpMyAdmin secara otomatis
  let sqlContent = fs.readFileSync(sqlOutputPath, 'utf-8');
  
  // Penyesuaian sintaks SQLite ke MySQL
  sqlContent = sqlContent
    .replace(/^BEGIN TRANSACTION;/gm, 'SET FOREIGN_KEY_CHECKS = 0;\nSTART TRANSACTION;')
    .replace(/^COMMIT;/gm, 'COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;')
    .replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT')
    .replace(/id TEXT PRIMARY KEY/g, 'id VARCHAR(100) PRIMARY KEY')
    .replace(/actor_id TEXT/g, 'actor_id VARCHAR(100)')
    .replace(/actor_name TEXT/g, 'actor_name VARCHAR(255)')
    .replace(/action TEXT/g, 'action VARCHAR(100)')
    .replace(/entity_type TEXT/g, 'entity_type VARCHAR(100)')
    .replace(/entity_id TEXT/g, 'entity_id VARCHAR(100)')
    .replace(/created_at TEXT/g, 'created_at VARCHAR(100)')
    .replace(/INSERT INTO "([^"]+)"/g, 'INSERT INTO `$1`');

  fs.writeFileSync(mysqlOutputPath, sqlContent, 'utf-8');
  console.log(`✨ Berhasil membuat file khusus MySQL: 'spkt_mysql.sql'!`);

  // 3. Jika ada folder backup, salin keduanya ke backup terbaru
  const backupsDir = path.join(dataDir, 'backups');
  if (fs.existsSync(backupsDir)) {
    const folders = fs.readdirSync(backupsDir).filter(f => fs.statSync(path.join(backupsDir, f)).isDirectory()).sort().reverse();
    if (folders.length > 0) {
      const latestBackupFolder = path.join(backupsDir, folders[0]);
      fs.copyFileSync(sqlOutputPath, path.join(latestBackupFolder, 'spkt_dump.sql'));
      fs.copyFileSync(mysqlOutputPath, path.join(latestBackupFolder, 'spkt_mysql.sql'));
      console.log(`📂 File .sql juga tersimpan di folder backup terbaru: ${latestBackupFolder}`);
    }
  }

  console.log(`\n💡 PETUNJUK:`);
  console.log(` - Upload 'data/spkt_dump.sql' ke Google Drive (untuk dibaca teksnya).`);
  console.log(` - Gunakan 'data/spkt_mysql.sql' jika ingin di-import langsung ke phpMyAdmin / MySQL!`);
} catch (error) {
  console.error('Gagal meng-export database:', error);
}
