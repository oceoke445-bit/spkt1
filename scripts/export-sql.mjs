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
    .replace(/(\b[a-zA-Z0-9_]+\b) TEXT PRIMARY KEY/g, '$1 VARCHAR(100) PRIMARY KEY')
    .replace(/TEXT NOT NULL/g, 'VARCHAR(255) NOT NULL')
    .replace(/TEXT UNIQUE/g, 'VARCHAR(255) UNIQUE')
    .replace(/\b([a-zA-Z0-9_]*_id)\b TEXT/g, '$1 VARCHAR(100)')
    .replace(/\b([a-zA-Z0-9_]*_nik)\b TEXT/g, '$1 VARCHAR(100)')
    .replace(/\b([a-zA-Z0-9_]*_number)\b TEXT/g, '$1 VARCHAR(100)')
    .replace(/\b([a-zA-Z0-9_]*_date|timestamp|created_at|updated_at|assigned_at)\b TEXT/g, '$1 VARCHAR(100)')
    .replace(/TEXT/g, 'LONGTEXT')
    .replace(/INSERT INTO "([^"]+)"/g, 'INSERT IGNORE INTO `$1`')
    .replace(/DELETE FROM "sqlite_sequence";/g, '')
    .replace(/INSERT INTO `sqlite_sequence` VALUES\([^)]+\);/g, '')
    .replace(/INSERT INTO sqlite_sequence VALUES\([^)]+\);/g, '')
    .replace(/CREATE TABLE sqlite_sequence\([^)]+\);/g, '')
    .replace(/DROP TABLE IF EXISTS `sqlite_sequence`;/g, '')
    .replace(/CHECK\(role IN \('user', 'petugas', 'admin'\)\)/g, '')
    .replace(/DEFAULT \(datetime\('now'\)\)/g, 'DEFAULT CURRENT_TIMESTAMP')
    .replace(/CREATE TABLE (\b[a-zA-Z0-9_]+\b)/g, 'DROP TABLE IF EXISTS `$1`;\nCREATE TABLE `$1`');

  // Pindahkan pembuatan tabel 'users' ke paling atas agar Foreign Key tidak mengeluh
  const createUsersRegex = /DROP TABLE IF EXISTS `users`;\nCREATE TABLE `users` \([\s\S]*?\);/;
  const matchUsers = sqlContent.match(createUsersRegex);
  if (matchUsers) {
    sqlContent = sqlContent.replace(createUsersRegex, '');
    sqlContent = sqlContent.replace('START TRANSACTION;', 'START TRANSACTION;\n' + matchUsers[0]);
  }

  // Bungkus nama kolom 'read' & 'rank' (reserved words di MySQL) dengan backticks
  sqlContent = sqlContent
    .replace(/\bread INTEGER\b/g, '`read` INTEGER')
    .replace(/\brank VARCHAR\b/g, '`rank` VARCHAR');

  // Bersihkan baris yang mengandung sqlite_sequence
  sqlContent = sqlContent
    .split('\n')
    .filter(line => !line.includes('sqlite_sequence'))
    .join('\n');

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
