import os

os.environ['GLOG_minloglevel'] = '2'

import cv2
import mediapipe as mp
import pyautogui
import math
import asyncio
import threading
import speech_recognition as sr
from faster_whisper import WhisperModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from plyer import notification  # 🌟 The Cross-Platform Upgrade

# --- PYAUTOGUI SETUP ---
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0
SCREEN_W, SCREEN_H = pyautogui.size()

# --- DYNAMIC SETTINGS ---
SMOOTHING = 0.15
TRACKING_MARGIN = 120
SCROLL_SPEED = 40
SCROLL_THRESHOLD = 15

# --- WHISPER AI SETUP ---
whisper_model = None
recognizer = sr.Recognizer()
voice_active = False

# --- MEDIAPIPE SETUP ---
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='hand_landmarker.task'),
    running_mode=VisionRunningMode.IMAGE,
    num_hands=1,
    min_hand_detection_confidence=0.7,
    min_hand_presence_confidence=0.7,
    min_tracking_confidence=0.7
)
landmarker = HandLandmarker.create_from_options(options)

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

# --- FASTAPI SETUP ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("🟢 React Dashboard Connected to Python!")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("🔴 React Dashboard Disconnected.")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()
loop = None


@app.on_event("startup")
async def startup_event():
    global loop
    loop = asyncio.get_running_loop()


# --- SYSTEM STATE VARIABLES ---
camera_active = False
gestures_active = False
system_locked = True
current_gesture_status = "System Idle"

prev_mouse_x, prev_mouse_y = 0, 0
left_click_frames = 0
right_click_frames = 0
clutch_frames = 0
pinky_frames = 0
thumbs_up_frames = 0
scroll_anchor_y = None


def get_dist(p1, p2, w, h):
    x1, y1 = p1.x * w, p1.y * h
    x2, y2 = p2.x * w, p2.y * h
    return math.hypot(x2 - x1, y2 - y1)


def is_folded(tip, pip, wrist, w, h):
    return get_dist(tip, wrist, w, h) < get_dist(pip, wrist, w, h)


# --- BACKGROUND VOICE THREAD ---
def voice_worker():
    global voice_active, loop, whisper_model

    print("📥 Downloading/Loading Whisper AI Model in the background... (Please wait)")
    try:
        whisper_model = WhisperModel("small.en", device="cpu", compute_type="int8")
        print("✅ Whisper AI loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading Whisper: {e}")
        return

    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source, duration=1)
        print("🎤 Microphone is ready.")

        while True:
            if not voice_active:
                asyncio.run(asyncio.sleep(0.5))
                continue
            try:
                audio = recognizer.listen(source, timeout=1, phrase_time_limit=None)
                with open("temp_voice.wav", "wb") as f:
                    f.write(audio.get_wav_data())

                segments, _ = whisper_model.transcribe("temp_voice.wav", beam_size=5, vad_filter=True)
                text = "".join([s.text for s in segments]).strip()

                if text and voice_active:
                    print(f"🗣️ Whisper Heard: {text}")
                    pyautogui.write(text + " ")

                    if loop is not None:
                        asyncio.run_coroutine_threadsafe(
                            manager.broadcast({"action": "dictation_update", "text": text}),
                            loop
                        )
            except sr.WaitTimeoutError:
                continue
            except Exception as e:
                pass


threading.Thread(target=voice_worker, daemon=True).start()


# --- ASYNC VIDEO ENGINE ---
async def generate_frames():
    global camera_active, gestures_active, system_locked, prev_mouse_x, prev_mouse_y, voice_active
    global left_click_frames, right_click_frames, clutch_frames, scroll_anchor_y
    global pinky_frames, thumbs_up_frames, current_gesture_status

    cap = None

    while True:
        if not camera_active:
            if cap is not None:
                cap.release()
                cap = None
            await asyncio.sleep(0.1)
            continue

        if cap is None or not cap.isOpened():
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        success, frame = cap.read()

        if not success:
            print("⚠️ Camera Connection Lost.")
            camera_active = False
            gestures_active = False
            if cap is not None:
                cap.release()
                cap = None
            if loop is not None:
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({"action": "camera_error"}), loop
                )
            await asyncio.sleep(0.5)
            continue

        frame = cv2.flip(frame, 1)
        h, w, c = frame.shape

        detected_gesture = "System Idle"

        if gestures_active:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = landmarker.detect(mp_image)

            draw_color = (0, 0, 255) if system_locked else (0, 255, 0)

            if result.hand_landmarks:
                for hand_landmarks in result.hand_landmarks:
                    landmarks = hand_landmarks

                    for connection in HAND_CONNECTIONS:
                        p1, p2 = landmarks[connection[0]], landmarks[connection[1]]
                        cv2.line(frame, (int(p1.x * w), int(p1.y * h)), (int(p2.x * w), int(p2.y * h)), draw_color, 2)
                    for lm in landmarks:
                        cv2.circle(frame, (int(lm.x * w), int(lm.y * h)), 4, draw_color, -1)

                    wrist = landmarks[0]
                    idx_tip, idx_pip = landmarks[8], landmarks[6]
                    mid_tip, mid_pip = landmarks[12], landmarks[10]
                    rng_tip, rng_pip = landmarks[16], landmarks[14]
                    pnk_tip, pnk_pip = landmarks[20], landmarks[18]

                    idx_up = not is_folded(idx_tip, idx_pip, wrist, w, h)
                    mid_up = not is_folded(mid_tip, mid_pip, wrist, w, h)
                    rng_up = not is_folded(rng_tip, rng_pip, wrist, w, h)
                    pnk_up = not is_folded(pnk_tip, pnk_pip, wrist, w, h)
                    thumb_up = landmarks[4].y < landmarks[5].y and landmarks[4].y < wrist.y

                    if system_locked:
                        detected_gesture = "System Asleep"

                    # 1. THE CLUTCH
                    if idx_up and pnk_up and not mid_up and not rng_up:
                        detected_gesture = "Clutch (Shaka)"
                        clutch_frames += 1
                        if clutch_frames > 5:
                            system_locked = not system_locked
                            status = "ASLEEP" if system_locked else "ACTIVE"
                            # 🌟 Cross-Platform Plyer Toast
                            notification.notify(title="AccessAI Matrix", message=f"System {status}", timeout=2)
                            clutch_frames = -20
                    else:
                        if clutch_frames > 0: clutch_frames = 0
                        if clutch_frames < 0: clutch_frames += 1

                    # 2. VOICE TOGGLE
                    pinky_is_high = pnk_tip.y < landmarks[17].y
                    idx_is_down = idx_tip.y > landmarks[5].y
                    mid_is_down = mid_tip.y > landmarks[9].y

                    if pinky_is_high and idx_is_down and mid_is_down and not thumb_up:
                        detected_gesture = "Voice Toggle (Pinky)"
                        pinky_frames += 1
                        if pinky_frames > 5:
                            voice_active = not voice_active
                            v_status = "ON" if voice_active else "OFF"
                            # 🌟 Cross-Platform Plyer Toast
                            notification.notify(title="AccessAI Voice", message=f"Voice Control: {v_status}", timeout=2)

                            if loop is not None:
                                asyncio.run_coroutine_threadsafe(
                                    manager.broadcast({"action": "sync_voice", "active": voice_active}), loop
                                )
                            pinky_frames = -20
                    else:
                        if pinky_frames > 0: pinky_frames = 0
                        if pinky_frames < 0: pinky_frames += 1

                    if not system_locked:

                        # 3. NATURAL SCROLL
                        if not idx_up and not mid_up and not rng_up and not pnk_up and not thumb_up:
                            detected_gesture = "Scrolling (Fist)"
                            fist_y = int(wrist.y * h)
                            if scroll_anchor_y is None:
                                scroll_anchor_y = fist_y
                            else:
                                cv2.line(frame, (0, scroll_anchor_y), (w, scroll_anchor_y), (0, 255, 255), 2)
                                dy = fist_y - scroll_anchor_y

                                if dy > SCROLL_THRESHOLD:
                                    pyautogui.scroll(SCROLL_SPEED)
                                elif dy < -SCROLL_THRESHOLD:
                                    pyautogui.scroll(-SCROLL_SPEED)
                        else:
                            scroll_anchor_y = None

                            # 4. LEFT CLICK
                            if idx_up and mid_up and not rng_up and not pnk_up:
                                detected_gesture = "Left Click (Peace)"
                                left_click_frames += 1
                                if left_click_frames == 4:
                                    pyautogui.click()
                                    cv2.circle(frame, (int(idx_tip.x * w), int(idx_tip.y * h)), 20, (255, 0, 255), -1)
                            else:
                                left_click_frames = 0

                            # 5. RIGHT CLICK
                            if idx_up and mid_up and rng_up and not pnk_up:
                                detected_gesture = "Right Click (3 Fingers)"
                                right_click_frames += 1
                                if right_click_frames == 5:
                                    pyautogui.rightClick()
                                    cv2.circle(frame, (int(idx_tip.x * w), int(idx_tip.y * h)), 20, (0, 255, 255), -1)
                            else:
                                right_click_frames = 0

                            # 6. MOUSE MOVEMENT
                            if idx_up and not mid_up and not rng_up and not pnk_up:
                                detected_gesture = "Moving Mouse"
                                finger_x = int(idx_tip.x * w)
                                finger_y = int(idx_tip.y * h)

                                safe_margin_x = min(TRACKING_MARGIN, w // 3)
                                safe_margin_y = min(TRACKING_MARGIN, h // 3)

                                mapped_x = max(0, min(1, (finger_x - safe_margin_x) / (w - 2 * safe_margin_x)))
                                mapped_y = max(0, min(1, (finger_y - safe_margin_y) / (h - 2 * safe_margin_y)))

                                target_x, target_y = mapped_x * SCREEN_W, mapped_y * SCREEN_H
                                dist = math.hypot(target_x - prev_mouse_x, target_y - prev_mouse_y)
                                dynamic_smooth = SMOOTHING if dist > 20 else SMOOTHING * 0.5

                                curr_x = prev_mouse_x + (target_x - prev_mouse_x) * dynamic_smooth
                                curr_y = prev_mouse_y + (target_y - prev_mouse_y) * dynamic_smooth

                                pyautogui.moveTo(curr_x, curr_y)
                                prev_mouse_x, prev_mouse_y = curr_x, curr_y

                            # 7. PRESS ENTER
                            if thumb_up and not idx_up and not mid_up and not rng_up and not pnk_up:
                                detected_gesture = "Press Enter (Thumbs Up)"
                                thumbs_up_frames += 1
                                if thumbs_up_frames == 5:
                                    pyautogui.press('enter')
                                    thumbs_up_frames = -15
                            else:
                                if thumbs_up_frames > 0: thumbs_up_frames = 0
                                if thumbs_up_frames < 0: thumbs_up_frames += 1
        else:
            detected_gesture = "Gestures Disabled"

        if detected_gesture != current_gesture_status:
            current_gesture_status = detected_gesture
            if loop is not None:
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({"action": "gesture_update", "status": current_gesture_status}), loop
                )

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        await asyncio.sleep(0.001)


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global camera_active, gestures_active, voice_active
    global SMOOTHING, TRACKING_MARGIN, SCROLL_SPEED

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            if data.get("action") == "initialize_matrix":
                camera_active = True
                gestures_active = True
            elif data.get("action") == "toggle_gestures":
                gestures_active = data.get("active")
            elif data.get("action") == "toggle_voice":
                voice_active = data.get("active")
            elif data.get("action") == "update_settings":
                settings = data.get("settings", {})

                raw_smooth = settings.get("mouseSmoothing", 75)
                SMOOTHING = max(0.05, 0.40 - (raw_smooth / 100 * 0.35))

                raw_speed = settings.get("mouseSpeed", 50)
                TRACKING_MARGIN = int(50 + (raw_speed / 100 * 130))

                raw_scroll = settings.get("scrollSensitivity", 30)
                SCROLL_SPEED = int(10 + (raw_scroll / 100 * 90))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        gestures_active = False
        voice_active = False


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)