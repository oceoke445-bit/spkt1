import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'spkt.db');
const sqlOutputPath = path.join(dataDir, 'spkt_dump.sql');

if (!fs.existsSync(dbPath)) {
  console.error(`Database tidak ditemukan: ${dbPath}`);
  process.exit(1);
}

try {
  // Export database utama (data/spkt.db)
  const cmd = `python -c "import sqlite3; db = sqlite3.connect(r'${dbPath}'); open(r'${sqlOutputPath}', 'w', encoding='utf-8').write('\\n'.join(db.iterdump()))"`;
  execSync(cmd);
  console.log(`✅ Berhasil meng-export database UTAMA (terbaru) ke file SQL!`);
  console.log(`📁 File hasil export: ${sqlOutputPath}`);

  // Jika ada folder backup, salin juga file .sql ke folder backup terbaru
  const backupsDir = path.join(dataDir, 'backups');
  if (fs.existsSync(backupsDir)) {
    const folders = fs.readdirSync(backupsDir).filter(f => fs.statSync(path.join(backupsDir, f)).isDirectory()).sort().reverse();
    if (folders.length > 0) {
      const latestBackupFolder = path.join(backupsDir, folders[0]);
      fs.copyFileSync(sqlOutputPath, path.join(latestBackupFolder, 'spkt_dump.sql'));
      console.log(`📂 Copy .sql juga tersimpan di folder backup terbaru: ${latestBackupFolder}`);
    }
  }

  console.log(`\n💡 Upload file 'data/spkt_dump.sql' ini ke Google Drive agar bisa langsung dibaca teksnya!`);
} catch (error) {
  console.error('Gagal meng-export database:', error);
}
