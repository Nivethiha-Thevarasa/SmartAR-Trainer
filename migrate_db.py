import sqlite3

c = sqlite3.connect('backend/database/smartar.db')

try:
    c.execute("ALTER TABLE workout ADD COLUMN difficulty INTEGER DEFAULT 2")
    c.execute("ALTER TABLE workout ADD COLUMN calories_min INTEGER DEFAULT 8")
    c.execute("ALTER TABLE workout ADD COLUMN calories_max INTEGER DEFAULT 12")
    c.execute("ALTER TABLE workout ADD COLUMN category TEXT DEFAULT 'Full Body'")
except sqlite3.OperationalError:
    pass # columns might already exist if ran twice

c.execute("UPDATE workout SET difficulty=2, calories_min=8, calories_max=12, category='Full Body • Cardio' WHERE workout_id=1")
c.execute("UPDATE workout SET difficulty=3, calories_min=6, calories_max=10, category='Upper Body • Strength' WHERE workout_id=2")
c.execute("UPDATE workout SET difficulty=3, calories_min=5, calories_max=8, category='Core • Endurance' WHERE workout_id=3")
c.execute("UPDATE workout SET difficulty=2, calories_min=4, calories_max=7, category='Core • Strength' WHERE workout_id=4")
c.execute("UPDATE workout SET difficulty=2, calories_min=6, calories_max=10, category='Lower Body • Strength' WHERE workout_id=5")
c.execute("UPDATE workout SET difficulty=1, calories_min=2, calories_max=4, category='Full Body • Flexibility' WHERE workout_id=6")

c.commit()
print("Database migrated successfully.")
