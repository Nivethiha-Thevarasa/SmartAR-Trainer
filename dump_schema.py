import sqlite3

conn = sqlite3.connect('backend/database/smartar.db')
cursor = conn.cursor()
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table';")
with open('schema_full.txt', 'w') as f:
    for row in cursor.fetchall():
        f.write(f"Table: {row[0]}\n{row[1]}\n\n")
conn.close()
