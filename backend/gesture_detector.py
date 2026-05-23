import cv2
import mediapipe as mp
import time
import pyautogui
import math

# PyAutoGUI Setup
pyautogui.FAILSAFE = False
screen_w, screen_h = pyautogui.size()

# Smoothing Variables
current_mouse_x, current_mouse_y = pyautogui.position()
SMOOTHING = 0.14

# Gesture Thresholds
PINCH_THRESHOLD = 40
FRAMES_TO_CLICK = 3
left_click_frames = 0
right_click_frames = 0
CLICK_COOLDOWN = 1.0
last_click_time = 0

# Elastic Scroll Variables
is_scrolling = False
scroll_anchor_y = 0
SCROLL_DEADZONE = 20
SCROLL_SENSITIVITY = 0.4

# --- NEW: "Horns/Shaka" Clutch Variables ---
system_active = True
shaka_frames = 0  # Counter for the new frame buffer
FRAMES_TO_CLUTCH = 5  # Must hold the sign for 5 frames
clutch_is_locked = False  # Prevents continuous toggling

BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (9, 10), (10, 11), (11, 12),
    (13, 14), (14, 15), (15, 16),
    (17, 18), (18, 19), (19, 20),
    (5, 9), (9, 13), (13, 17), (0, 17)
]

latest_result = None


def update_result(result: mp.tasks.vision.HandLandmarkerResult, output_image: mp.Image, timestamp_ms: int):
    global latest_result
    latest_result = result


def get_distance(lm1, lm2, width, height):
    x1, y1 = int(lm1.x * width), int(lm1.y * height)
    x2, y2 = int(lm2.x * width), int(lm2.y * height)
    return math.hypot(x2 - x1, y2 - y1)


def is_finger_folded(tip_idx, knuckle_idx, hand_landmarks, w, h):
    tip = hand_landmarks[tip_idx]
    knuckle = hand_landmarks[knuckle_idx]
    wrist = hand_landmarks[0]
    dist_tip_wrist = get_distance(tip, wrist, w, h)
    dist_knuckle_wrist = get_distance(knuckle, wrist, w, h)
    return dist_tip_wrist < dist_knuckle_wrist


def map_to_screen(val, min_val, max_val, screen_max):
    val = max(min_val, min(val, max_val))
    pct = (val - min_val) / (max_val - min_val)
    return int(pct * screen_max)


def track_hands_strict():
    global current_mouse_x, current_mouse_y, left_click_frames, right_click_frames
    global last_click_time, is_scrolling, scroll_anchor_y
    global system_active, shaka_frames, clutch_is_locked

    print("Initializing Precision Matrix with Horns/Shaka Clutch...")

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path='hand_landmarker.task'),
        running_mode=VisionRunningMode.LIVE_STREAM,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.7,
        min_tracking_confidence=0.7,
        result_callback=update_result
    )

    with HandLandmarker.create_from_options(options) as landmarker:
        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            print("Error: Could not access the webcam.")
            return

        while True:
            success, frame = cap.read()
            if not success:
                break

            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape

            margin_x = int(w * 0.20)
            margin_y = int(h * 0.25)

            boundary_color = (255, 0, 0) if system_active else (0, 0, 255)
            cv2.rectangle(frame, (margin_x, margin_y), (w - margin_x, h - margin_y), boundary_color, 2)

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            frame_timestamp_ms = int(time.time() * 1000)
            landmarker.detect_async(mp_image, frame_timestamp_ms)

            global latest_result
            if latest_result and latest_result.hand_landmarks:
                for hand_landmarks in latest_result.hand_landmarks:

                    for connection in HAND_CONNECTIONS:
                        start_idx = connection[0]
                        end_idx = connection[1]
                        start_lm = hand_landmarks[start_idx]
                        end_lm = hand_landmarks[end_idx]
                        cx1, cy1 = int(start_lm.x * w), int(start_lm.y * h)
                        cx2, cy2 = int(end_lm.x * w), int(end_lm.y * h)

                        bone_color = (255, 255, 255) if system_active else (100, 100, 255)
                        cv2.line(frame, (cx1, cy1), (cx2, cy2), bone_color, 1)

                    # Finger States
                    index_folded = is_finger_folded(8, 5, hand_landmarks, w, h)
                    middle_folded = is_finger_folded(12, 9, hand_landmarks, w, h)
                    ring_folded = is_finger_folded(16, 13, hand_landmarks, w, h)
                    pinky_folded = is_finger_folded(20, 17, hand_landmarks, w, h)

                    # --- NEW: Horns/Shaka Logic ---
                    # Index and Pinky are EXTENDED (not folded). Middle and Ring are FOLDED.
                    is_shaka = (not index_folded) and (not pinky_folded) and middle_folded and ring_folded

                    # Make sure the other gestures don't clash
                    is_fist = index_folded and middle_folded and ring_folded and pinky_folded

                    dist_thumb_index = get_distance(hand_landmarks[4], hand_landmarks[8], w, h)
                    dist_thumb_middle = get_distance(hand_landmarks[4], hand_landmarks[12], w, h)

                    # Clicks require Middle, Ring, and Pinky to be folded. This naturally prevents Shaka bleed.
                    is_left_pinch = (
                                                dist_thumb_index < PINCH_THRESHOLD) and middle_folded and ring_folded and pinky_folded and not is_fist
                    is_right_pinch = (
                                                 dist_thumb_middle < PINCH_THRESHOLD) and not middle_folded and ring_folded and pinky_folded and not is_fist

                    # Pointing requires ONLY the index to be up. Pinky must be folded.
                    is_pointing = (
                                      not index_folded) and middle_folded and ring_folded and pinky_folded and not is_left_pinch

                    current_time = time.time()

                    # --- THE STRICT CLUTCH TOGGLE ---
                    if is_shaka:
                        if not clutch_is_locked:
                            shaka_frames += 1
                            if shaka_frames >= FRAMES_TO_CLUTCH:
                                system_active = not system_active
                                clutch_is_locked = True  # Lock it!
                                shaka_frames = 0
                                is_scrolling = False  # Safety reset
                                print(f"SYSTEM ACTIVE: {system_active}")
                    else:
                        # Break the gesture to release the lock
                        shaka_frames = 0
                        clutch_is_locked = False

                    # --- EXECUTE ACTIONS (ONLY IF SYSTEM IS ACTIVE) ---
                    if system_active:
                        if is_fist:
                            if not is_scrolling:
                                is_scrolling = True
                                scroll_anchor_y = hand_landmarks[0].y * h
                            else:
                                current_wrist_y = hand_landmarks[0].y * h
                                delta_y = current_wrist_y - scroll_anchor_y
                                if abs(delta_y) > SCROLL_DEADZONE:
                                    scroll_amount = int(delta_y * SCROLL_SENSITIVITY)
                                    pyautogui.scroll(scroll_amount)
                        else:
                            is_scrolling = False

                        if is_left_pinch and not is_scrolling and (current_time - last_click_time > CLICK_COOLDOWN):
                            left_click_frames += 1
                            if left_click_frames >= FRAMES_TO_CLICK:
                                pyautogui.click(button='left')
                                last_click_time = current_time
                                left_click_frames = 0
                        else:
                            left_click_frames = 0

                        if is_right_pinch and not is_scrolling and (current_time - last_click_time > CLICK_COOLDOWN):
                            right_click_frames += 1
                            if right_click_frames >= FRAMES_TO_CLICK:
                                pyautogui.click(button='right')
                                last_click_time = current_time
                                right_click_frames = 0
                        else:
                            right_click_frames = 0

                    # --- DRAWING THE DOTS ---
                    for idx, landmark in enumerate(hand_landmarks):
                        cx, cy = int(landmark.x * w), int(landmark.y * h)

                        if not system_active:
                            if is_shaka:
                                cv2.circle(frame, (cx, cy), 6, (0, 165, 255), cv2.FILLED)  # Orange while locked
                            else:
                                cv2.circle(frame, (cx, cy), 4, (0, 0, 255), cv2.FILLED)  # Red while asleep
                        else:
                            if idx == 8:
                                if is_pointing and not is_scrolling:
                                    cv2.circle(frame, (cx, cy), 8, (0, 255, 0), cv2.FILLED)
                                    target_x = map_to_screen(cx, margin_x, w - margin_x, screen_w)
                                    target_y = map_to_screen(cy, margin_y, h - margin_y, screen_h)
                                    current_mouse_x += (target_x - current_mouse_x) * SMOOTHING
                                    current_mouse_y += (target_y - current_mouse_y) * SMOOTHING
                                    pyautogui.moveTo(int(current_mouse_x), int(current_mouse_y))
                                elif is_fist:
                                    cv2.circle(frame, (cx, cy), 8, (255, 255, 0), cv2.FILLED)
                                    cv2.line(frame, (0, int(scroll_anchor_y)), (w, int(scroll_anchor_y)), (0, 255, 255),
                                             2)
                                elif is_left_pinch or is_right_pinch:
                                    cv2.circle(frame, (cx, cy), 8, (255, 0, 255), cv2.FILLED)
                                elif is_shaka:
                                    cv2.circle(frame, (cx, cy), 8, (0, 165, 255), cv2.FILLED)
                                else:
                                    cv2.circle(frame, (cx, cy), 8, (200, 200, 200), cv2.FILLED)
                            else:
                                cv2.circle(frame, (cx, cy), 4, (0, 255, 0), cv2.FILLED)

            cv2.imshow('AccessAI - Matrix', frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    track_hands_strict()