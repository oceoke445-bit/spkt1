import sqlite3

db = sqlite3.connect('data/spkt.db')
cursor = db.cursor()
tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

print("--- INFORMASI DATABASE SPKT ---")
for t in tables:
    count = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f"Tabel {t}: {count} data")
