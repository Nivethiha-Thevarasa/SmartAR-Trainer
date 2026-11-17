import sqlite3

c = sqlite3.connect('backend/database/smartar.db')
print(c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='trainee'").fetchone()[0])
