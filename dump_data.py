import sqlite3
import json

c = sqlite3.connect('backend/database/smartar.db')
cur = c.cursor()
cur.execute('SELECT * FROM workout')
rows = cur.fetchall()
cols = [description[0] for description in cur.description]

result = []
for row in rows:
    result.append(dict(zip(cols, row)))

with open('db_data.json', 'w') as f:
    json.dump(result, f, indent=2)
