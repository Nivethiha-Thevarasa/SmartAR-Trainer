import sqlite3

def run_migration():
    conn = sqlite3.connect('backend/database/smartar.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE trainee ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")
        print("Added created_at to trainee")
    except Exception as e:
        print("created_at may already exist:", e)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workout_schedule (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainee_id INTEGER,
        scheduled_date TEXT,
        FOREIGN KEY(trainee_id) REFERENCES trainee(trainee_id)
    )
    """)
    print("Ensured workout_schedule table exists")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    run_migration()
