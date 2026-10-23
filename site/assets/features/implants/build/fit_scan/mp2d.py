import sys, json, numpy as np, cv2, mediapipe as mp
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True, max_num_faces=1, min_detection_confidence=.3)
im = cv2.imread(sys.argv[1]); h, w = im.shape[:2]
r = fm.process(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
if not r.multi_face_landmarks: print('null'); sys.exit()
print(json.dumps([[q.x * w, q.y * h] for q in r.multi_face_landmarks[0].landmark]))
