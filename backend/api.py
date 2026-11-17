from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import sys
import os

# Append project root to sys.path so modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.data_manager import (
    login_user,
    register_user,
    check_email_exists,
    update_password,
    get_workout_plan,
    save_workout_session,
    session_analytics,
    get_trainee,
    update_trainee,
    get_all_workouts,
    get_latest_session_status
)
from backend.utils.email_service import generate_otp, send_otp_email, verify_otp
from backend.utils.unity_session_server import start_new_session, apply_unity_result, save_session_to_db

from backend.utils.jwt_auth import create_access_token, get_current_user, decode_access_token

def require_active_user(current_user: dict = Depends(get_current_user)):
    status = current_user.get("status")
    if status == "INACTIVE":
        raise HTTPException(status_code=403, detail="Please verify your email to access workouts.")
    return current_user

app = FastAPI(title="SmartARTrainer Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri usually connects from http://localhost:1420
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================
# Models
# =======================
class LoginRequest(BaseModel):
    email: str
    password: str

class CheckEmailRequest(BaseModel):
    email: str

class VerifyAccountRequest(BaseModel):
    otp: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    fitness_data: Optional[Dict[str, Any]] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    otp_hash: str
    created_at: float

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class WorkoutSessionData(BaseModel):
    trainee_id: int
    session_data: Dict[str, Any]

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    fitness_level: Optional[str] = None
    profile_image: Optional[str] = None

class UnityLaunchRequest(BaseModel):
    hwnd: int
    workout_name: str
    user_gender: str
    targetWidth: int = 640
    targetHeight: int = 480
    x: int = 0
    y: int = 0

# In-memory OTP store for simple implementation (in production use Redis/DB)
otp_store = {}

# =======================
# Endpoints
# =======================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    success, message, user_data = login_user(req.email, req.password)
    if not success:
        raise HTTPException(status_code=401, detail=message)

    # Generate signed JWT Token
    token = create_access_token({
        "sub": user_data["email"],
        "trainee_id": user_data.get("trainee_id"),
        "name": user_data.get("name"),
        "status": user_data.get("status", "INACTIVE")
    })

    return {
        "message": message,
        "user": user_data,
        "token": token,
        "access_token": token,
        "token_type": "bearer"
    }

@app.post("/api/auth/check-email")
def check_email(req: CheckEmailRequest):
    if check_email_exists(req.email):
        raise HTTPException(status_code=400, detail="Email already exists.")
    return {"message": "Email is available"}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    success, message, trainee_id = register_user(req.name, req.email, req.password, req.fitness_data)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    # Generate signed JWT Token for newly registered user
    token = create_access_token({
        "sub": req.email,
        "trainee_id": trainee_id,
        "name": req.name,
        "status": "INACTIVE"
    })

    otp, created_at = generate_otp()
    otp_store[req.email] = {"otp": otp, "created_at": created_at}
    send_otp_email(req.email, otp)

    return {
        "message": message,
        "trainee_id": trainee_id,
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "status": "INACTIVE"
    }

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Protected endpoint to verify JWT token and return user metadata."""
    trainee_id = current_user.get("trainee_id")
    if trainee_id:
        user_info = get_trainee(trainee_id)
        if user_info:
            return {"user": user_info, "token_payload": current_user}
    return {"user": current_user, "token_payload": current_user}

@app.post("/api/auth/verify-account")
def verify_account(req: VerifyAccountRequest, current_user: dict = Depends(get_current_user)):
    email = current_user.get("sub")
    trainee_id = current_user.get("trainee_id")
    record = otp_store.get(email)

    if not record:
        raise HTTPException(status_code=400, detail="OTP expired or invalid")

    ok, msg = verify_otp(req.otp, record["otp"], record["created_at"])
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    from backend.models.data_manager import verify_user_account
    ok = verify_user_account(trainee_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to verify account in database")

    if email in otp_store:
        del otp_store[email]

    new_token = create_access_token({
        "sub": email,
        "trainee_id": trainee_id,
        "name": current_user.get("name"),
        "status": "ACTIVE"
    })
    return {"message": "Account verified successfully", "token": new_token, "access_token": new_token, "status": "ACTIVE"}

@app.post("/api/auth/resend-otp")
def resend_otp(current_user: dict = Depends(get_current_user)):
    email = current_user.get("sub")
    otp, created_at = generate_otp()
    otp_store[email] = {"otp": otp, "created_at": created_at}
    ok, msg = send_otp_email(email, otp)
    if not ok:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": "OTP sent successfully"}

@app.post("/api/auth/forgot-password/request")
def forgot_password_request(req: ForgotPasswordRequest):
    if not check_email_exists(req.email):
        raise HTTPException(status_code=404, detail="Email not registered")

    otp, created_at = generate_otp()
    otp_store[req.email] = {"otp": otp, "created_at": created_at}
    ok, msg = send_otp_email(req.email, otp)
    if not ok:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": "OTP sent successfully"}

@app.post("/api/auth/forgot-password/verify")
def forgot_password_verify(req: VerifyOTPRequest):
    stored = otp_store.get(req.email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP requested for this email")

    verified, msg = verify_otp(req.otp, stored["otp"], stored["created_at"])
    if not verified:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": "OTP verified successfully"}

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    success, msg = update_password(req.email, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    # Clear OTP
    if req.email in otp_store:
        del otp_store[req.email]
    return {"message": "Password reset successfully"}

@app.get("/api/user/me")
def get_current_user_profile(current_user: dict = Depends(require_active_user)):
    user = get_trainee(current_user.get("trainee_id"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/user/{trainee_id}")
def get_user_profile(trainee_id: int):
    user = get_trainee(trainee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/user/{trainee_id}")
def update_user_profile(trainee_id: int, req: UpdateProfileRequest, current_user: dict = Depends(require_active_user)):
    try:
        # Cast to int defensively in case JWT subject is string
        if int(current_user.get("trainee_id", 0)) != trainee_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")

        update_data = req.dict(exclude_unset=True)
        if not update_data:
            return {"message": "Nothing to update"}

        success, msg = update_trainee(trainee_id, **update_data)
        if not success:
            raise HTTPException(status_code=400, detail=msg)

        return {"message": "Profile updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error during profile update: {str(e)}")

@app.get("/api/workouts/plan/{plan_id}")
def get_workouts(plan_id: int, current_user: dict = Depends(require_active_user)):
    workouts = get_workout_plan(plan_id)
    return workouts

@app.get("/api/workouts/all")
def get_all(current_user: dict = Depends(require_active_user)):
    return get_all_workouts()

@app.get("/api/workouts/{workout_id}")
def get_workout(workout_id: int, current_user: dict = Depends(require_active_user)):
    # Important: Do not override /plan/{id} or /all with {workout_id} route
    from backend.models.data_manager import get_workout_by_id
    workout = get_workout_by_id(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@app.get("/api/calendar/{trainee_id}")
def get_calendar(trainee_id: int, current_user: dict = Depends(require_active_user)):
    from backend.models.data_manager import get_calendar_data
    return get_calendar_data(trainee_id)

@app.get("/api/analytics/{trainee_id}")
def get_analytics(trainee_id: int, timeframe: str = "this_week", current_user: dict = Depends(require_active_user)):
    from backend.models.data_manager import get_analytics_summary
    return get_analytics_summary(trainee_id, timeframe=timeframe)

# =======================
# Unity Interop API
# =======================
import subprocess
import threading
import win32gui
import win32process
import time

unity_process = None

def find_unity_window(target_pid, parent_hwnd=None):
    """Attempt to find Unity HWND belonging to a pid."""
    windows = []

    def callback(hwnd, *_):
        if win32gui.IsWindowVisible(hwnd):
            _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
            if found_pid == target_pid:
                text = win32gui.GetWindowText(hwnd)
                if text:
                    windows.append((hwnd, text))

    # Try finding it over a few seconds
    for _ in range(10):
        if parent_hwnd:
            try:
                win32gui.EnumChildWindows(parent_hwnd, callback, None)
            except Exception:
                pass
        else:
            win32gui.EnumWindows(callback, None)

        if windows:
            return windows[0][0]
        time.sleep(0.5)

    return None

import win32con
def embed_window(child_hwnd, parent_hwnd, width, height, x_offset=0, y_offset=0):
    print(f"Embedding {child_hwnd} into {parent_hwnd} at {x_offset},{y_offset}")
    win32gui.SetParent(child_hwnd, parent_hwnd)

    style = win32gui.GetWindowLong(child_hwnd, win32con.GWL_STYLE)
    style = style & ~win32con.WS_POPUP & ~win32con.WS_CAPTION & ~win32con.WS_THICKFRAME
    style = style | win32con.WS_CHILD | win32con.WS_CLIPSIBLINGS | win32con.WS_CLIPCHILDREN
    win32gui.SetWindowLong(child_hwnd, win32con.GWL_STYLE, style)

    win32gui.MoveWindow(child_hwnd, x_offset, y_offset, width, height, True)
    # Force redraw
    win32gui.SetWindowPos(child_hwnd, win32con.HWND_TOP, x_offset, y_offset, width, height,
                          win32con.SWP_FRAMECHANGED | win32con.SWP_SHOWWINDOW)

@app.post("/api/unity/start")
def start_unity_ar(req: UnityLaunchRequest, current_user: dict = Depends(require_active_user)):
    global unity_process

    # Exercise to folder mapping based on existing code
    unity_models = {
        "plank": {"folder": "PLANK_AR_EX", "exe": "Plank.exe"},
        "jumping jacks": {"folder": "JUMPING_JACK_AR_EXE", "exe": "Jumping Jacks.exe"},
        "squats": {"folder": "SQUAT_AR_EXE", "exe": "Squat.exe"},
        "crunches": {"folder": "CRUNCHES_AR_EXE", "exe": "Crunches.exe"},
        "cobra stretch": {"folder": "CobraStrech_AR_EXE", "exe": "CobraStretch.exe"},
        "push ups": {"folder": "PUSHUP_AR_EXE", "exe": "Pushup.exe"}
    }

    workout_name = req.workout_name.strip().lower()
    model_info = unity_models.get(workout_name)

    if not model_info:
        raise HTTPException(status_code=400, detail=f"No Unity model found for: {workout_name}")

    exe_path = os.path.abspath(os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Unity",
        model_info["folder"], model_info["exe"]
    ))

    if not os.path.exists(exe_path):
        raise HTTPException(status_code=404, detail="Unity executable not found")

    width = req.targetWidth or 640
    height = req.targetHeight or 480
    winId = req.hwnd

    cmd = [
        exe_path,
        "-parentHWND", str(winId),
        "-popupwindow",
        "-force-d3d11",
        "-screen-fullscreen", "0",
        "-screen-width", str(width),
        "-screen-height", str(height),
        "-gender", req.user_gender
    ]

    # End existing Unity process if any
    if unity_process:
        try:
            unity_process.terminate()
        except:
            pass

    unity_process = subprocess.Popen(cmd, cwd=os.path.dirname(exe_path))

    def monitor_and_embed():
        hwnd = find_unity_window(unity_process.pid, parent_hwnd=winId)
        if hwnd and winId:
            embed_window(hwnd, winId, width, height, req.x, req.y)

    threading.Thread(target=monitor_and_embed, daemon=True).start()

    return {"message": "Unity process started", "pid": unity_process.pid}

@app.post("/api/unity/stop")
def stop_unity_ar(current_user: dict = Depends(require_active_user)):
    global unity_process
    if unity_process:
        try:
            unity_process.terminate()
            unity_process = None
            return {"message": "Unity process stopped"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"message": "No Unity process running"}

class SessionNewRequest(BaseModel):
    trainee_id: int

@app.post("/api/session/new")
def route_create_session(req: SessionNewRequest, current_user: dict = Depends(require_active_user)):
    start_new_session(req.trainee_id)
    return {"status": "success"}

@app.post("/api/session/save")
def route_save_session(current_user: dict = Depends(require_active_user)):
    # Write aggregated temporary metrics logically backwards into smartar.db
    res = save_session_to_db()
    return res or {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    # Start the application! The Python Unity TCP Server should also be started in the background
    from backend.utils.unity_session_server import start_tcp_server
    threading.Thread(target=start_tcp_server, daemon=True).start()

    uvicorn.run("backend.api:app", host="127.0.0.1", port=8000, reload=False)
