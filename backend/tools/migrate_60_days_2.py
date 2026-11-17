import sqlite3

def run_migration():
    conn = sqlite3.connect('backend/database/smartar.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE trainee ADD COLUMN created_at TEXT")
        print("Added created_at to trainee")
    except Exception as e:
        print("created_at may already exist:", e)

    try:
        cursor.execute("UPDATE trainee SET created_at = datetime('now') WHERE created_at IS NULL")
        print("Updated NULL created_at rows")
    except Exception as e:
        print(e)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    run_migration()
