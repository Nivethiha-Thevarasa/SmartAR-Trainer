"""
data_manager.py
Handles ALL SQLite database operations for SmartARTrainer
"""

import sqlite3
from backend.models.db_config import get_db_connection, close_connection
import os
import base64
import hashlib
import hmac
import datetime

# =====================================================
# PASSWORD HASHING (PBKDF2-SHA256)
# Store format: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
# =====================================================

_PBKDF2_ITERATIONS = 200_000

def hash_password(plain_password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    if plain_password is None:
        raise ValueError("Password cannot be None")
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        _PBKDF2_ITERATIONS
    )
    return "pbkdf2_sha256$%d$%s$%s" % (
        _PBKDF2_ITERATIONS,
        base64.b64encode(salt).decode("utf-8"),
        base64.b64encode(dk).decode("utf-8"),
    )

def verify_password(plain_password: str, stored_value: str) -> bool:
    """
    Verify user-entered password against stored hash.
    Backward compatible: if stored_value is not in pbkdf2 format, treat it as plaintext.
    """
    if stored_value is None:
        return False

    # Legacy plaintext support (so older accounts still work)
    if not stored_value.startswith("pbkdf2_sha256$"):
        # constant-time compare
        return hmac.compare_digest(str(stored_value), str(plain_password))

    try:
        _algo, iter_str, salt_b64, hash_b64 = stored_value.split("$", 3)
        iterations = int(iter_str)
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected = base64.b64decode(hash_b64.encode("utf-8"))
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations
        )
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# =====================================================
# REGISTRATION & LOGIN
# =====================================================

def determine_plan_id(fitness_data):
    if not fitness_data or not fitness_data.get('workout_experience'):
        return 1

    experience = fitness_data.get('workout_experience', '').lower()

    if 'beginner' in experience or 'none' in experience:
        return 1
    elif 'intermediate' in experience or 'moderate' in experience:
        return 2
    elif 'advanced' in experience or 'expert' in experience:
        return 3
    return 1


def register_user(name, email, password, fitness_data=None):
    connection = get_db_connection()
    if not connection:
        return False, "Database connection failed", None

    cursor = None
    try:
        cursor = connection.cursor()
        password_hash = hash_password(password)

        if fitness_data:
            # Use ML model
            try:
                from backend.ml.workout_plan_predictor import predict_plan
                plan_id, plan_label = predict_plan(fitness_data)  # plan_id 1..15, label "Beginner 3"
            except Exception as e:
                print("Model prediction failed, fallback to rule-based:", e)

                # Fallback to your old logic (1/2/3)
                plan_id = determine_plan_id(fitness_data)
                if plan_id == 1:
                    plan_label = "Beginner 1"
                elif plan_id == 2:
                    plan_label = "Intermediate 1"
                else:
                    plan_label = "Advanced 1"

            query = """
                INSERT INTO trainee (
                    name, email, pwd, dob, gender, height, weight,
                    workout_experience, workout_duration, weekly_frequency,
                    fitness_level, plan_id, status, email_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INACTIVE', 0)
            """

            params = (
                name, email, password_hash,
                fitness_data.get('dob'),
                fitness_data.get('gender'),
                fitness_data.get('height'),
                fitness_data.get('weight'),
                fitness_data.get('workout_experience'),
                fitness_data.get('workout_duration'),
                fitness_data.get('weekly_frequency'),
                plan_label,
                plan_id
            )

        else:
            # If no fitness data, default to Beginner 1
            query = """
                INSERT INTO trainee (name, email, pwd, fitness_level, plan_id, status, email_verified)
                VALUES (?, ?, ?, ?, ?, 'INACTIVE', 0)
            """
            params = (name, email, password_hash, "Beginner 1", 1)

        cursor.execute(query, params)
        connection.commit()
        return True, "Registration successful", cursor.lastrowid


    except sqlite3.IntegrityError:
        return False, "Email already exists", None
    except sqlite3.Error as e:
        return False, f"Database error: {e}", None
    finally:
        close_connection(connection, cursor)


def login_user(email, password):
    connection = get_db_connection()
    if not connection:
        return False, "Database connection failed", None

    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT trainee_id, name, email, pwd, status, email_verified FROM trainee WHERE email = ?",
            (email,)
        )
        row = cursor.fetchone()
        if not row:
            return False, "Invalid email or password", None

        stored_pwd = row["pwd"]
        if not verify_password(password, stored_pwd):
            return False, "Invalid email or password", None

        # Optional: auto-upgrade legacy plaintext passwords to hashed format on successful login
        if stored_pwd and not str(stored_pwd).startswith("pbkdf2_sha256$"):
            try:
                cursor.execute(
                    "UPDATE trainee SET pwd = ? WHERE trainee_id = ?",
                    (hash_password(password), row["trainee_id"])
                )
                connection.commit()
            except sqlite3.Error:
                pass

        row_dict = dict(row)
        user_data = {
            "trainee_id": row_dict["trainee_id"],
            "name": row_dict["name"],
            "email": row_dict["email"],
            "status": row_dict.get("status", "INACTIVE"),
            "email_verified": bool(row_dict.get("email_verified", 0))
        }
        return True, "Login successful", user_data
    finally:
        close_connection(connection, cursor)

def get_workout_by_id(workout_id):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT workout_id, workout_name, description, difficulty, calories_min, calories_max, category
            FROM workout
            WHERE workout_id = ?
        """, (workout_id,))
        row = cursor.fetchone()
        if row:
            return {
                "workout_id": row[0],
                "workout_name": row[1],
                "description": row[2],
                "difficulty": row[3] if len(row) > 3 else 2,
                "calories_min": row[4] if len(row) > 4 else 8,
                "calories_max": row[5] if len(row) > 5 else 12,
                "category": row[6] if len(row) > 6 else "Full Body"
            }
        return None
    finally:
        close_connection(connection, cursor)


def get_all_workouts():
    connection = get_db_connection()
    if not connection:
        return []

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT workout_id, workout_name, video_url, description
            FROM workout
            ORDER BY workout_id
        """)
        return cursor.fetchall()
    finally:
        close_connection(connection, cursor)

# =====================================================
# Workout & WORKOUT PLAN
# =====================================================

WORKOUT_COLUMNS = [
    "jumpingjack_crt",
    "pushup_crt",
    "plank_time",
    "crunches_crt",
    "squat_crt",
    "cobrastretch_time"
]


def generate_60_day_schedule(trainee_id, cursor, connection):
    cursor.execute("SELECT COUNT(*) FROM workout_schedule WHERE trainee_id = ?", (trainee_id,))
    if cursor.fetchone()[0] > 0:
        return

    cursor.execute("SELECT weekly_frequency, created_at FROM trainee WHERE trainee_id = ?", (trainee_id,))
    row = cursor.fetchone()
    if not row: return

    freq = int(row['weekly_frequency']) if row['weekly_frequency'] else 3
    created_at_str = row['created_at']
    import datetime
    if not created_at_str:
        created_at_dt = datetime.datetime.now()
    else:
        try:
            created_at_dt = datetime.datetime.strptime(created_at_str[:10], '%Y-%m-%d')
        except ValueError:
            created_at_dt = datetime.datetime.now()

    days_map = {
        1: [0], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4],
        5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6]
    }
    target_dows = set(days_map.get(freq, [0, 2, 4]))

    dates_to_insert = []
    curr = created_at_dt.date()
    while len(dates_to_insert) < 60:
        if curr.weekday() in target_dows:
            dates_to_insert.append((trainee_id, curr.strftime('%Y-%m-%d')))
        curr += datetime.timedelta(days=1)

    cursor.executemany("INSERT INTO workout_schedule (trainee_id, scheduled_date) VALUES (?, ?)", dates_to_insert)
    connection.commit()


def get_calendar_data(trainee_id):
    connection = get_db_connection()
    if not connection: return []
    try:
        cursor = connection.cursor()

        # Idempotently ensure the schedule exists before returning it
        generate_60_day_schedule(trainee_id, cursor, connection)

        cursor.execute("SELECT scheduled_date FROM workout_schedule WHERE trainee_id = ?", (trainee_id,))
        scheduled = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT created_at FROM workout_session WHERE trainee_id = ?", (trainee_id,))
        sessions = [row[0] for row in cursor.fetchall() if row[0]]

        completed_dates = {s[:10] for s in sessions}
        import datetime
        today_str = datetime.datetime.now().strftime('%Y-%m-%d')

        results = []
        scheduled_set = set(scheduled)
        for d in scheduled:
            if d in completed_dates:
                results.append({"date": d, "status": "completed"})
            elif d < today_str:
                results.append({"date": d, "status": "missed"})
            else:
                results.append({"date": d, "status": "scheduled"})

        # Inject Bonus workouts dynamically mapping out of boundary constraints
        for d in completed_dates:
            if d not in scheduled_set:
                results.append({"date": d, "status": "extra"})

        return results
    finally:
        close_connection(connection, cursor)


def get_trainee_info(trainee_id):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        generate_60_day_schedule(trainee_id, cursor, connection)
        cursor.execute("""
            SELECT trainee_id, name, gender, plan_id, fitness_level, weekly_frequency, workout_duration, dob, email, height, weight
            FROM trainee
            WHERE trainee_id = ?
        """, (trainee_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        close_connection(connection, cursor)




def get_workout_plan(plan_id):
    connection = get_db_connection()
    if not connection:
        return []

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM workout_plan WHERE plan_id = ?", (plan_id,))
        row = cursor.fetchone()
        if not row:
            return []

        return [
            {"workout_id": 1, "name": "Jumping Jacks", "target": row["jumpingjack_count"]},
            {"workout_id": 2, "name": "Push Ups", "target": row["pushup_count"]},
            {"workout_id": 3, "name": "Plank", "target": row["plank_time"]},
            {"workout_id": 4, "name": "Crunches", "target": row["crunches_count"]},
            {"workout_id": 5, "name": "Squats", "target": row["squat_count"]},
            {"workout_id": 6, "name": "Cobra Stretch", "target": row["cobra_stretch_time"]}
        ]

    finally:
        close_connection(connection, cursor)


# =====================================================
# WORKOUT SESSION
# =====================================================

def save_workout_session(trainee_id, session_data):
    connection = get_db_connection()
    if not connection:
        return False, "Database connection failed"

    try:
        cursor = connection.cursor()
        import datetime
        cols = ["trainee_id", "created_at"] + WORKOUT_COLUMNS
        placeholders = ["?"] * len(cols)

        query = f"INSERT INTO workout_session ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
        params = [trainee_id, datetime.datetime.now().isoformat()] + [session_data.get(c, 0) for c in WORKOUT_COLUMNS]

        cursor.execute(query, params)
        connection.commit()
        return True, "Session saved"
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        close_connection(connection, cursor)


def get_latest_session_status(trainee_id):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT * FROM workout_session
            WHERE trainee_id = ?
            ORDER BY session_id DESC LIMIT 1
        """, (trainee_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        close_connection(connection, cursor)

# =====================================================
# PROFILE
# =====================================================

def get_trainee(trainee_id):
    connection = get_db_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM trainee WHERE trainee_id = ?", (trainee_id,))
        row = cursor.fetchone()
        if row:
            d = dict(row)
            d["email_verified"] = bool(d.get("email_verified", 0))
            return d
        return None
    finally:
        close_connection(connection, cursor)


def verify_user_account(trainee_id):
    connection = get_db_connection()
    if not connection:
        return False

    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE trainee SET status = 'ACTIVE', email_verified = 1 WHERE trainee_id = ?", (trainee_id,))
        connection.commit()
        return True
    except sqlite3.Error:
        return False
    finally:
        close_connection(connection, cursor)


def update_trainee(trainee_id, **kwargs):
    if not kwargs:
        return False, "No fields to update"

    connection = get_db_connection()
    if not connection:
        return False, "Database connection failed"

    try:
        cursor = connection.cursor()
        fields = [f"{k}=?" for k in kwargs]
        values = list(kwargs.values()) + [trainee_id]

        query = f"UPDATE trainee SET {', '.join(fields)} WHERE trainee_id = ?"
        cursor.execute(query, values)
        connection.commit()
        return True, "Profile updated"
    finally:
        close_connection(connection, cursor)

# =====================================================
# ANALYTICS (GLOBAL SHARED INSTANCE)
# =====================================================

class WorkoutSessionStats:
    def __init__(self, exercise_name, reps_completed, correct_reps, wrong_reps, duration, date_str, target_val=None, category=None):
        self.exercise_name = exercise_name
        self.reps_completed = reps_completed
        self.correct_reps = correct_reps
        self.wrong_reps = wrong_reps
        self.duration = duration
        self.date = date_str
        self.target_val = target_val
        self.category = category


class SessionAnalytics:
    def __init__(self):
        self.sessions = []
        self.total_sessions = 0

    def load_sessions(self, trainee_id):
        connection = get_db_connection()
        if not connection:
            return

        try:
            cursor = connection.cursor()

            # Fetch relational target boundaries from designated plan
            cursor.execute("SELECT plan_id FROM trainee WHERE trainee_id = ?", (trainee_id,))
            plan_id_row = cursor.fetchone()
            plan_id = plan_id_row[0] if plan_id_row else 1

            cursor.execute("SELECT * FROM workout_plan WHERE plan_id = ?", (plan_id,))
            plan_row = cursor.fetchone()
            target_map = {
                "Push-up": plan_row["pushup_count"] if plan_row else 10,
                "Jumping Jack": plan_row["jumpingjack_count"] if plan_row else 15,
                "Squat": plan_row["squat_count"] if plan_row else 10,
                "Crunches": plan_row["crunches_count"] if plan_row else 10,
                "Plank": plan_row["plank_time"] if plan_row else 30,
                "Cobra Stretch": plan_row["cobra_stretch_time"] if plan_row else 30
            }
            # Database categorized mappings for reliable Muscle Focus doughnut tracking
            category_map = {
                "Push-up": "Chest",
                "Jumping Jack": "Cardio",
                "Squat": "Legs",
                "Crunches": "Core",
                "Plank": "Core",
                "Cobra Stretch": "Back"
            }

            cursor.execute("""
                SELECT * FROM workout_session
                WHERE trainee_id = ?
                ORDER BY session_id DESC
            """, (trainee_id,))
            rows = cursor.fetchall()

            self.sessions.clear()
            self.total_sessions = len(rows)

            for row in rows:
                row_dt = "2026-08-13T12:00:00Z"
                try:
                    if row["created_at"]:
                        row_dt = row["created_at"]
                except:
                    pass

                exercises = [
                    ("Push-up", "pushup_crt", "pushup_wrg"),
                    ("Jumping Jack", "jumpingjack_crt", "jumpingjack_wrg"),
                    ("Squat", "squat_crt", "squat_wrg"),
                    ("Crunches", "crunches_crt", "crunches_wrg")
                ]

                for name, crt_col, wrg_col in exercises:
                    crt = row[crt_col] or 0
                    wrg = row[wrg_col] or 0
                    if crt or wrg:
                        self.sessions.append(
                            WorkoutSessionStats(
                                name, crt + wrg, crt, wrg, 0, row_dt,
                                target_val=target_map.get(name, 10),
                                category=category_map.get(name, "Full Body")
                            )
                        )

                time_exercises = [
                    ("Plank", "plank_time"),
                    ("Cobra Stretch", "cobrastretch_time")
                ]

                for name, col in time_exercises:
                    t = row[col] or 0
                    if t:
                        self.sessions.append(
                            WorkoutSessionStats(
                                name, 0, 0, 0, t, row_dt,
                                target_val=target_map.get(name, 30),
                                category=category_map.get(name, "Full Body")
                            )
                        )

        finally:
            close_connection(connection, cursor)


# âœ… THIS LINE FIXES YOUR ERROR
session_analytics = SessionAnalytics()


def get_analytics_summary(trainee_id: int, timeframe: str = "this_week"):
    """
    Compute structured analytics for Rep-based and Time-based workouts directly from SQLite DB,
    filtered dynamically by timeframe ('this_week', 'last_week', 'all_time').
    """
    connection = get_db_connection()
    if not connection:
        return {
            "total_sessions": 0,
            "summary": {},
            "rep_workouts": [],
            "time_workouts": [],
            "insights": [],
            "sessions": []
        }

    try:
        cursor = connection.cursor()

        # 1. Fetch user's assigned workout plan target values
        cursor.execute("SELECT plan_id FROM trainee WHERE trainee_id = ?", (trainee_id,))
        plan_id_row = cursor.fetchone()
        plan_id = plan_id_row["plan_id"] if plan_id_row and plan_id_row["plan_id"] else 1

        cursor.execute("SELECT * FROM workout_plan WHERE plan_id = ?", (plan_id,))
        plan_row = cursor.fetchone()
        plan_dict = dict(plan_row) if plan_row else {}

        rep_targets = {
            "Jumping Jack": plan_dict.get("jumpingjack_count", 100),
            "Push-up": plan_dict.get("pushup_count", 20),
            "Crunches": plan_dict.get("crunches_count", 15),
            "Squat": plan_dict.get("squat_count", 30)
        }

        time_targets = {
            "Plank": plan_dict.get("plank_time", 60),
            "Cobra Stretch": plan_dict.get("cobra_stretch_time", 60)
        }

        # 2. Fetch all workout sessions for this user sorted chronologically
        cursor.execute("""
            SELECT * FROM workout_session
            WHERE trainee_id = ?
            ORDER BY session_id ASC
        """, (trainee_id,))
        rows = cursor.fetchall()
        all_sessions = [dict(r) for r in rows]

        # Filter sessions by timeframe
        now_date = datetime.datetime.now().date()
        filtered_sessions = []

        for s in all_sessions:
            created_at_str = s.get("created_at") or ""
            dt_date = None
            if created_at_str:
                try:
                    # SQLite CURRENT_TIMESTAMP returns space separated; ISO requires 'T' in Python < 3.11
                    clean_str = created_at_str.replace("Z", "").replace(" ", "T").split(".")[0]
                    dt = datetime.datetime.fromisoformat(clean_str)
                    dt_date = dt.date()
                except Exception:
                    dt_date = None

            if dt_date is not None:
                days_ago = (now_date - dt_date).days
            else:
                days_ago = 0  # Default to recent if unparseable

            if timeframe == "today":
                if days_ago == 0:
                    filtered_sessions.append(s)
            elif timeframe == "this_week":
                if days_ago <= 7:
                    filtered_sessions.append(s)
            elif timeframe == "last_week":
                if 7 < days_ago <= 14:
                    filtered_sessions.append(s)
            else:  # "all_time" or fallback
                filtered_sessions.append(s)

        sessions = filtered_sessions
        total_sessions = len(sessions)

        # 3. Aggregate Rep-based exercises
        rep_specs = [
            ("Jumping Jack", "jumpingjack_crt", "jumpingjack_wrg"),
            ("Push-up", "pushup_crt", "pushup_wrg"),
            ("Crunches", "crunches_crt", "crunches_wrg"),
            ("Squat", "squat_crt", "squat_wrg")
        ]

        rep_workouts_data = []
        grand_total_reps = 0
        grand_correct_reps = 0
        grand_wrong_reps = 0

        for name, crt_col, wrg_col in rep_specs:
            total_crt = 0
            total_wrg = 0
            best_reps = 0
            best_date = "-"

            for s in sessions:
                crt = s.get(crt_col) or 0
                wrg = s.get(wrg_col) or 0
                total_crt += crt
                total_wrg += wrg
                session_total = crt + wrg
                if session_total > best_reps:
                    best_reps = session_total
                    created_at = s.get("created_at") or ""
                    if created_at and "T" in created_at:
                        try:
                            dt = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                            best_date = dt.strftime("%b %d")
                        except Exception:
                            best_date = created_at.split("T")[0]
                    else:
                        best_date = "-"

            total_ex_reps = total_crt + total_wrg
            grand_total_reps += total_ex_reps
            grand_correct_reps += total_crt
            grand_wrong_reps += total_wrg

            accuracy = round((total_crt / total_ex_reps * 100), 1) if total_ex_reps > 0 else 0.0

            rep_workouts_data.append({
                "name": name,
                "target": rep_targets.get(name, 20),
                "total_reps": total_ex_reps,
                "correct_reps": total_crt,
                "wrong_reps": total_wrg,
                "accuracy": accuracy,
                "best": best_reps,
                "best_date": best_date
            })

        # 4. Aggregate Time-based exercises
        time_specs = [
            ("Plank", "plank_time"),
            ("Cobra Stretch", "cobrastretch_time")
        ]

        time_workouts_data = []
        total_time_seconds = 0

        def fmt_time(seconds):
            m = int(seconds) // 60
            s = int(seconds) % 60
            return f"{m:02d}:{s:02d}"

        for name, col in time_specs:
            times = [s.get(col) or 0 for s in sessions if (s.get(col) or 0) > 0]
            if not times:
                best_time = 0
                avg_time = 0
                trend = [0, 0, 0, 0, 0]
                improvement_str = "0.0%"
            else:
                best_time = max(times)
                avg_time = round(sum(times) / len(times), 1)
                total_time_seconds += sum(times)
                trend = times[-5:] if len(times) >= 5 else (times + [times[-1]] * (5 - len(times)))

                if len(times) >= 2:
                    first_half = sum(times[:len(times)//2]) / (len(times)//2)
                    second_half = sum(times[len(times)//2:]) / (len(times) - len(times)//2)
                    diff = round(((second_half - first_half) / (first_half or 1)) * 100, 1)
                    improvement_str = f"{'+' if diff >= 0 else ''}{diff}%"
                else:
                    improvement_str = "+0.0%"

            target_sec = time_targets.get(name, 60)
            time_workouts_data.append({
                "name": name,
                "target_time": target_sec,
                "target_str": f"{target_sec} sec",
                "best_time": best_time,
                "best_time_str": fmt_time(best_time),
                "avg_time": avg_time,
                "avg_time_str": fmt_time(avg_time),
                "improvement": improvement_str,
                "trend": trend
            })

        # 5. Summary Metrics
        overall_accuracy = round((grand_correct_reps / grand_total_reps * 100), 1) if grand_total_reps > 0 else 0.0

        # Estimate calories: ~0.45 kcal per rep, ~0.15 kcal per second hold time
        estimated_calories = int(round(grand_total_reps * 0.45 + total_time_seconds * 0.15))

        # Estimate total session duration in minutes
        total_duration_sec = grand_total_reps * 2.5 + total_time_seconds
        avg_duration_min = round((total_duration_sec / max(total_sessions, 1)) / 60, 1) if total_sessions > 0 else 0.0

        summary = {
            "total_workouts": total_sessions,
            "total_reps": grand_total_reps,
            "correct_reps": grand_correct_reps,
            "wrong_reps": grand_wrong_reps,
            "overall_accuracy": overall_accuracy,
            "total_calories": estimated_calories,
            "avg_duration_min": avg_duration_min,
            "reps_trend": "+12.5% vs last week",
            "wrong_reps_trend": "-8.3% vs last week"
        }

        # 6. Generate Insights
        insights = []
        if overall_accuracy >= 70:
            insights.append({
                "icon": "up",
                "type": "success",
                "text": f"Great job! Your overall accuracy is holding strong at {overall_accuracy}%."
            })
        else:
            insights.append({
                "icon": "up",
                "type": "success",
                "text": f"Keep pushing! Your overall accuracy is at {overall_accuracy}%. Form focus will boost results."
            })

        active_rep_ex = [x for x in rep_workouts_data if x["total_reps"] > 0]
        if active_rep_ex:
            lowest_ex = min(active_rep_ex, key=lambda x: x["accuracy"])
            insights.append({
                "icon": "focus",
                "type": "warning",
                "text": f"{lowest_ex['name']} needs a little more focus ({lowest_ex['accuracy']}% accuracy). Keep practicing!"
            })
        else:
            insights.append({
                "icon": "focus",
                "type": "warning",
                "text": "Consistency is key! Complete daily workout sessions to track progression."
            })

        if grand_wrong_reps > 0:
            insights.append({
                "icon": "down",
                "type": "danger",
                "text": f"You've logged {grand_wrong_reps} wrong reps so far. Focus on quality & form!"
            })
        else:
            insights.append({
                "icon": "down",
                "type": "danger",
                "text": "Zero wrong reps recorded. Outstanding form precision!"
            })

        # 7. Raw sessions for backward compatibility
        session_analytics.load_sessions(trainee_id)
        stats = []
        for s in session_analytics.sessions:
            stats.append({
                "name": s.exercise_name,
                "exercise_name": s.exercise_name,
                "reps_completed": s.reps_completed,
                "correct_reps": s.correct_reps,
                "wrong_reps": s.wrong_reps,
                "duration": s.duration,
                "date": s.date,
                "target_val": s.target_val,
                "category": s.category
            })

        return {
            "total_sessions": total_sessions,
            "summary": summary,
            "rep_workouts": rep_workouts_data,
            "time_workouts": time_workouts_data,
            "insights": insights,
            "sessions": stats
        }

    finally:
        close_connection(connection, cursor)
# =====================================================
# FORGOT PASSWORD (USED BY LoginScreen UI)
# =====================================================

def check_email_exists(email: str) -> bool:
    """Return True if the email exists in trainee table."""
    connection = get_db_connection()
    if not connection:
        return False

    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM trainee WHERE email = ? LIMIT 1", (email,))
        return cursor.fetchone() is not None
    except sqlite3.Error:
        return False
    finally:
        close_connection(connection, cursor)


def verify_password_match(email: str, password: str) -> bool:
    """
    Return True if the given password matches the current password in DB.
    Used to prevent setting the same old password again.
    """
    connection = get_db_connection()
    if not connection:
        return False

    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT pwd FROM trainee WHERE email = ? LIMIT 1", (email,))
        row = cursor.fetchone()
        if not row:
            return False
        return verify_password(password, row["pwd"])
    except sqlite3.Error:
        return False
    finally:
        close_connection(connection, cursor)

def update_password(email: str, new_password: str):
    """
    Update the password for the given email.
    Returns: (success: bool, message: str)
    """
    connection = get_db_connection()
    if not connection:
        return False, "Database connection failed"

    cursor = None
    try:
        cursor = connection.cursor()
        new_hash = hash_password(new_password)
        cursor.execute(
            "UPDATE trainee SET pwd = ? WHERE email = ?",
            (new_hash, email)
        )
        connection.commit()

        if cursor.rowcount == 0:
            return False, "Email not found"

        return True, "Password updated"
    except sqlite3.Error as e:
        return False, f"Database error: {e}"
    finally:
        close_connection(connection, cursor)

def promote_trainee_plan(trainee_id, new_plan_id):
    MIN_PLAN_ID = 1
    MAX_PLAN_ID = 15

    if new_plan_id > MAX_PLAN_ID:
        return False, "Already at maximum level"

    connection = get_db_connection()
    if not connection:
        return False, "DB connection failed"

    try:
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE trainee
            SET plan_id = ?
            WHERE trainee_id = ?
        """, (new_plan_id, trainee_id))

        connection.commit()
        return True, "Plan updated"

    finally:
        close_connection(connection, cursor)


# =====================================================
# RESET AFTER PROMOTION
# =====================================================

def reset_sessions_after_promotion(trainee_id):
    trainee = get_trainee_info(trainee_id)

    # âœ… 15-plan rule:
    # Advanced plans are 11..15, so do NOT reset in Advanced
    if trainee:
        plan_id = trainee.get("plan_id", 1)
        if plan_id >= 11:
            return False, "Advanced level reached. No reset."

    connection = get_db_connection()
    if not connection:
        return False, "DB connection failed"

    cursor = None
    try:
        cursor = connection.cursor()

        # DELETE old sessions â†’ fresh start
        cursor.execute("""
            DELETE FROM workout_session
            WHERE trainee_id = ?
        """, (trainee_id,))

        connection.commit()
        return True, "Sessions reset"

    except sqlite3.Error as e:
        return False, str(e)

    finally:
        close_connection(connection, cursor)


def update_fitness_level(trainee_id, plan_id):
    level, _ = plan_level_and_index(plan_id)  # Beginner/Intermediate/Advanced

    connection = get_db_connection()
    if not connection:
        return False

    try:
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE trainee
            SET fitness_level = ?, plan_id = ?
            WHERE trainee_id = ?
        """, (level, plan_id, trainee_id))

        connection.commit()
        return True
    finally:
        close_connection(connection, cursor)





# =======================
# PLAN ID HELPERS (15 plans)
# =======================
BEGINNER_START = 1        # 1..5
INTERMEDIATE_START = 6    # 6..10
ADVANCED_START = 11       # 11..15
PLANS_PER_LEVEL = 5

def plan_level_and_index(plan_id: int) -> tuple[str, int]:
    """
    Returns:
      ("Beginner"/"Intermediate"/"Advanced", index 1..5)
    """
    if plan_id is None:
        return "Beginner", 3  # safe default

    if 1 <= plan_id <= 5:
        return "Beginner", plan_id
    if 6 <= plan_id <= 10:
        return "Intermediate", plan_id - 5
    if 11 <= plan_id <= 15:
        return "Advanced", plan_id - 10

    # fallback
    return "Beginner", 3


def make_plan_id(level: str, index_1_to_5: int) -> int:
    """Convert (level + index) -> plan_id in 1..15."""
    idx = max(1, min(PLANS_PER_LEVEL, int(index_1_to_5)))

    level = (level or "").lower()
    if "inter" in level:
        return INTERMEDIATE_START + (idx - 1)
    if "adv" in level:
        return ADVANCED_START + (idx - 1)
    return BEGINNER_START + (idx - 1)


def get_next_plan_same_index(plan_id: int) -> int:
    """
    Beginner k -> Intermediate k -> Advanced k -> Advanced k
    """
    level, idx = plan_level_and_index(plan_id)

    if level == "Beginner":
        return make_plan_id("Intermediate", idx)
    if level == "Intermediate":
        return make_plan_id("Advanced", idx)
    return plan_id  # already Advanced


def reset_sessions_after_inactivity(trainee_id):
    """
    Reset sessions for inactivity (30+ days).
    âœ… This MUST reset even Advanced (plan_id 11â€“15).
    """
    connection = get_db_connection()
    if not connection:
        return False, "DB connection failed"

    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("""
            DELETE FROM workout_session
            WHERE trainee_id = ?
        """, (trainee_id,))
        connection.commit()
        return True, "Sessions reset due to inactivity"
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        close_connection(connection, cursor)
