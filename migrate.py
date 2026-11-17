import sqlite3
conn = sqlite3.connect('backend/database/smartar.db')
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE trainee ADD COLUMN status TEXT DEFAULT 'INACTIVE'")
    cursor.execute("ALTER TABLE trainee ADD COLUMN email_verified BOOLEAN DEFAULT 0")
    conn.commit()
    print('Migration successful.')
except Exception as e:
    print('Migration skipped or failed:', e)
conn.close()
