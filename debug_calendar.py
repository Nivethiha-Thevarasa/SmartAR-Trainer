import sqlite3
import sys

conn = sqlite3.connect('backend/database/smartar.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM workout_schedule")
    schedule_count = cursor.fetchone()[0]
    print(f"Total entries in workout_schedule: {schedule_count}")

    if schedule_count > 0:
        cursor.execute("SELECT * FROM workout_schedule LIMIT 5")
        rows = cursor.fetchall()
        print("First 5 schedule rows:")
        for r in rows:
            print(dict(r))
            
    cursor.execute("SELECT trainee_id, weekly_frequency, created_at FROM trainee")
    trainees = cursor.fetchall()
    print(f"\nTotal trainees: {len(trainees)}")
    for t in trainees:
        print(dict(t))
        
        # Manually run the schedule generation check for this trainee
        cursor.execute("SELECT COUNT(*) FROM workout_schedule WHERE trainee_id = ?", (t['trainee_id'],))
        has_schedule = cursor.fetchone()[0]
        print(f"  --> Schedule generated? {has_schedule > 0} (count: {has_schedule})")
        
        # Test my data_manager function directly
        import sys
        import os
        sys.path.append(os.path.abspath('.'))
        
        from backend.models.data_manager import get_calendar_data
        cal = get_calendar_data(t['trainee_id'])
        print(f"  --> get_calendar_data returned {len(cal)} items")
        if cal:
            print("  --> Sample:", cal[:3])
            
except Exception as e:
    print(f"Exception: {e}")
finally:
    conn.close()
