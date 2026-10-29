# Libraries served from this site

The camera and 3D tools load these from here rather than from a CDN, since a file changed on a CDN would run on
a page with the camera open. Each folder is an exact copy of the files the tools use from the npm package and
version below. To update one, download the new version with `npm pack`, copy the same files over and change
the version here.

| Folder | npm package | Version | Licence | Used by |
| --- | --- | --- | --- | --- |
| three | three (build/three.module.js) | 0.160.0 | MIT | implants, filler, body map |
| face_mesh | @mediapipe/face_mesh | 0.4.1633559619 | Apache-2.0 | face analysis, nose, proportions |
| face-api | @vladmandic/face-api (dist/face-api.esm.js, model/age_gender_model) | 1.7.15 | MIT | face analysis (age guess) |
