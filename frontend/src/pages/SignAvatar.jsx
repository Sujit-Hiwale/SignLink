import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

/*
SignAvatar.jsx
- Works with Mixamo "Remy" GLB exported to /public/avatar/model.glb
- Smooth blending animations, neutral idle, Hello/ThankYou/Yes/No,
  basic A-Z fingerspelling, and text->sequence player.
*/

export default function SignAvatar() {
  const mountRef = useRef(null);
  const avatarRef = useRef(null);
  const bonesRef = useRef({});
  const [text, setText] = useState("");
  const [cameraFollow, setCameraFollow] = useState(false);
  const cameraRef = useRef(null);
  const isPlayingRef = useRef(false);

  // -------------------------
  // UTIL: interpolate angles safely
  // -------------------------
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // normalizes angle difference for shortest path
  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
  }

  // -------------------------
  // animateBoneRotation with blending & promise
  // target = {x,y,z}
  // -------------------------
  const animateBoneRotation = (bone, target, duration = 400, easing = (t)=>t) => {
    return new Promise((resolve) => {
      const start = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
      const startTime = performance.now();

      function step() {
        const now = performance.now();
        const tRaw = Math.min((now - startTime) / duration, 1);
        const t = easing(tRaw);

        bone.rotation.x = lerpAngle(start.x, target.x, t);
        bone.rotation.y = lerpAngle(start.y, target.y, t);
        bone.rotation.z = lerpAngle(start.z, target.z, t);

        if (tRaw < 1) requestAnimationFrame(step);
        else resolve();
      }
      step();
    });
  };

  // small easing
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // -------------------------
  // find bones from model (mixamorig naming)
  // -------------------------
  const findBones = (root) => {
    const bones = {};
    root.traverse((obj) => {
      if (obj.isBone) {
        const name = obj.name;
        bones[name] = obj;
      }
    });
    // Keep only bones we likely need (but store all found)
    bonesRef.current = bones;
    console.log("Detected bones:", bones);
  };

  // -------------------------
  // Set a neutral idle pose (hands down)
  // This aims to move from T-pose -> natural arms-down
  // -------------------------
  // -------------------------
// Set an A-pose (arms slightly out, neutral hands)
// -------------------------
const setNeutralPose = async () => {
  const bones = bonesRef.current;
  if (!bones || Object.keys(bones).length === 0) return;

  const leftFore = bones["mixamorigLeftForeArm"];
  const rightFore = bones["mixamorigRightForeArm"];
  const leftShoulder = leftFore ? leftFore.parent : null;
  const rightShoulder = rightFore ? rightFore.parent : null;

  const promises = [];

  // Arms angled slightly down (A-pose)
  if (leftShoulder) promises.push(
    animateBoneRotation(leftShoulder, { x: 1.3, y: 0, z: 0.35 }, 400, easeInOut)
  );
  if (rightShoulder) promises.push(
    animateBoneRotation(rightShoulder, { x: 1.3, y: 0, z: -0.35 }, 400, easeInOut)
  );

  // Keep forearms straight
  if (leftFore) promises.push(animateBoneRotation(leftFore, { x: 0, y: 0, z: 0 }, 400, easeInOut));
  if (rightFore) promises.push(animateBoneRotation(rightFore, { x: 0, y: 0, z: 0 }, 400, easeInOut));

  // Slightly open hands (relaxed)
  const fingerBones = Object.keys(bones).filter((n) =>
    /Hand(Index|Middle|Ring|Pinky|Thumb)\d*/i.test(n)
  );
  fingerBones.forEach((name) => {
    const b = bones[name];
    if (b) promises.push(animateBoneRotation(b, { x: 0.5, y: 0.5, z: 0 }, 350, easeInOut));
  });

  await Promise.all(promises);
};


  // -------------------------
  // helper: apply finger curl pose given values per finger
  // fingers: {thumb:val, index:val, middle:val, ring:val, pinky:val}
  // val is 0 (open) to 1 (closed)
  // -------------------------
  const applyFingerCurl = async (handPrefix, values = {}, duration = 300) => {
    // handPrefix = "mixamorigRightHand" or "mixamorigLeftHand"
    const bones = bonesRef.current;
    const mapping = {
      thumb: ["Thumb1", "Thumb2", "Thumb3", "Thumb4"],
      index: ["Index1", "Index2", "Index3", "Index4"],
      middle: ["Middle1", "Middle2", "Middle3", "Middle4"],
      ring: ["Ring1", "Ring2", "Ring3", "Ring4"],
      pinky: ["Pinky1", "Pinky2", "Pinky3", "Pinky4"]
    };

    const promises = [];
    for (const finger of Object.keys(mapping)) {
      const amount = values[finger] ?? 0; // 0..1
      const parts = mapping[finger];
      for (let i = 0; i < parts.length; i++) {
        const boneName = `${handPrefix}${parts[i]}`;
        const bone = bones[boneName];
        if (!bone) continue;
        // rotation range tuning: outer joints curl less than proximal
        const factor = 0.9 - i * 0.25; // 0.9,0.65,0.4,0.15
        const targetX = -amount * factor * 1.1; // negative curls for Mixamo
        promises.push(animateBoneRotation(bone, { x: targetX, y: 0, z: 0 }, duration, easeInOut));
      }
    }
    await Promise.all(promises);
  };

  // -------------------------
  // Prebuilt sign animations
  // -------------------------
  // HELLO: raise right hand forward, wave, return
  const playHello = async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const bones = bonesRef.current;
    const fore = bones["mixamorigRightForeArm"];
    const hand = bones["mixamorigRightHand"];
    const shoulder = fore ? fore.parent : null;

    if (!shoulder || !fore || !hand) {
      alert("Required arm/hand bones not found for Hello.");
      isPlayingRef.current = false;
      return;
    }

    // 0: move shoulder forward from T-pose -> front
    await animateBoneRotation(shoulder, { x: -0.6, y: 0, z: -0.9 }, 350, easeInOut);
    // raise a bit more
    await animateBoneRotation(shoulder, { x: -1.0, y: 0, z: -0.9 }, 300, easeInOut);
    // bend elbow (forearm)
    await animateBoneRotation(fore, { x: -0.4, y: 1, z: 0 }, 250, easeInOut);
    // open fingers slightly
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.15, index: 0.15, middle: 0.15, ring: 0.15, pinky: 0.12 }, 200);
    // wrist outward
    await animateBoneRotation(hand, { x: -0.1, y: 0.5, z: 0 }, 220, easeInOut);
    // small wave (two)
    for (let i = 0; i < 2; i++) {
      await animateBoneRotation(hand, { x: -0.1, y: 0.8, z: 0 }, 160, easeInOut);
      await animateBoneRotation(hand, { x: -0.1, y: 0.45, z: 0 }, 160, easeInOut);
    }
    // relax fingers & return arm
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.03 }, 200);
    await animateBoneRotation(fore, { x: 0, y: 0, z: 0 }, 300, easeInOut);
    await animateBoneRotation(shoulder, { x: 0.0, y: 0, z: 0 }, 350, easeInOut);

    isPlayingRef.current = false;
  };

  // THANK YOU: fingers from chin outward (right hand)
  const playThankYou = async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const bones = bonesRef.current;
    const fore = bones["mixamorigRightForeArm"];
    const hand = bones["mixamorigRightHand"];
    const shoulder = fore ? fore.parent : null;
    if (!shoulder || !fore || !hand) {
      alert("Required arm/hand bones not found for ThankYou.");
      isPlayingRef.current = false;
      return;
    }

    // bring hand to chin area: rotate shoulder forward + lift forearm
    await animateBoneRotation(shoulder, { x: -0.9, y: 1, z: -0.7 }, 350, easeInOut);
    await animateBoneRotation(fore, { x: -0.25, y: 0, z: 0 }, 300, easeInOut);
    // gentle open fingers (flat palm)
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 }, 200);
    // push palm forward (move hand rotation)
    await animateBoneRotation(hand, { x: -0.05, y: 0.5, z: 0 }, 250, easeInOut);
    await animateBoneRotation(hand, { x: -0.05, y: 0.9, z: 0 }, 200, easeInOut);
    // back to chin (small return)
    await animateBoneRotation(hand, { x: -0.05, y: 0.5, z: 0 }, 200, easeInOut);
    // return to idle
    await animateBoneRotation(fore, { x: 0, y: 0, z: 0 }, 300, easeInOut);
    await animateBoneRotation(shoulder, { x: 0, y: 0, z: 0 }, 350, easeInOut);

    isPlayingRef.current = false;
  };

  // YES: a fist nod (up-down) — simple implementation: make fist then nod slightly
  const playYes = async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const bones = bonesRef.current;
    const fore = bones["mixamorigRightForeArm"];
    const hand = bones["mixamorigRightHand"];
    const shoulder = fore ? fore.parent : null;
    if (!shoulder || !fore || !hand) {
      alert("Required arm/hand bones not found for Yes.");
      isPlayingRef.current = false;
      return;
    }

    // bring hand forward a bit
    await animateBoneRotation(shoulder, { x: -0.6, y: 1, z: -0.6 }, 300, easeInOut);
    await animateBoneRotation(fore, { x: -0.2, y: 0, z: 0 }, 250, easeInOut);
    // make fist (close)
    await applyFingerCurl("mixamorigRightHand", { thumb: -1, index: -1, middle: -1, ring: -1, pinky: -1 }, 200);
    // small up-down nods (2)
    for (let i = 0; i < 2; i++) {
      await animateBoneRotation(fore, { x: -0.4, y: 0, z: 0 }, 150, easeInOut);
      await animateBoneRotation(fore, { x: -0.2, y: 0, z: 0 }, 150, easeInOut);
    }
    // relax
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.03 }, 200);
    await animateBoneRotation(fore, { x: 0, y: 0, z: 0 }, 300, easeInOut);
    await animateBoneRotation(shoulder, { x: 0, y: 0, z: 0 }, 350, easeInOut);

    isPlayingRef.current = false;
  };

  // NO: index+middle together tap thumb (approx)
  const playNo = async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const bones = bonesRef.current;
    const fore = bones["mixamorigRightForeArm"];
    const hand = bones["mixamorigRightHand"];
    const shoulder = fore ? fore.parent : null;
    if (!shoulder || !fore || !hand) {
      alert("Required arm/hand bones not found for No.");
      isPlayingRef.current = false;
      return;
    }

    // position hand forward
    await animateBoneRotation(shoulder, { x: -0.8, y: 1, z: -0.6 }, 300, easeInOut);
    await animateBoneRotation(fore, { x: -0.25, y: 0, z: 0 }, 250, easeInOut);

    // prepare: index and middle extended, others curled
    await applyFingerCurl("mixamorigRightHand", { thumb: -0.7, index: -0, middle: -0, ring: -1, pinky: -1 }, 200);

    // tap motion: bring thumb in to touch fingers twice
    const thumbBones = ["mixamorigRightHandThumb1","mixamorigRightHandThumb2","mixamorigRightHandThumb3"];
    for (let i = 0; i < 2; i++) {
      // curl thumb quickly
      thumbBones.forEach((bn, idx) => {
        const b = bonesRef.current[bn];
        if (b) animateBoneRotation(b, { x: -0.9 * (1 - idx*0.15), y:0, z:0 }, 100, easeInOut);
      });
      await new Promise(r=>setTimeout(r,120));
      // release thumb
      thumbBones.forEach((bn, idx) => {
        const b = bonesRef.current[bn];
        if (b) animateBoneRotation(b, { x: -0.2, y:0, z:0 }, 100, easeInOut);
      });
      await new Promise(r=>setTimeout(r,120));
    }

    // return to idle hand
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.03 }, 200);
    await animateBoneRotation(fore, { x: 0, y: 0, z: 0 }, 300, easeInOut);
    await animateBoneRotation(shoulder, { x: 0, y: 0, z: 0 }, 350, easeInOut);

    isPlayingRef.current = false;
  };

  // -------------------------
  // Basic fingerspelling A-Z mapping (approximate)
  // Each letter maps to finger curl values (0=open,1=closed).
  // These are approximations to start with and can be refined.
  // -------------------------
  const letterMap = {
  a: { thumb: -0.9, index: -1, middle: -1, ring: -1, pinky: -1 },
  b: { thumb: -0.0, index: -0.0, middle: -0.0, ring: -0.0, pinky: -0.0 },
  c: { thumb: -0.3, index: -0.3, middle: -0.3, ring: -0.3, pinky: -0.3 },
  d: { thumb: -1.0, index: -0, middle: -1, ring: -1, pinky: -1 },
  e: { thumb: -0.9, index: -0.9, middle: -0.9, ring: -0.9, pinky: -0.9 },
  f: { thumb: -0.2, index: -0, middle: -1, ring: -1, pinky: -1 },
  g: { thumb: -1, index: -0, middle: -1, ring: -1, pinky: -1 },
  h: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  i: { thumb: -1, index: -1, middle: -1, ring: -1, pinky: -0 },
  j: { thumb: -1, index: -1, middle: -1, ring: -1, pinky: -0 },
  k: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  l: { thumb: -0, index: -0, middle: -1, ring: -1, pinky: -1 },
  m: { thumb: -1, index: -1, middle: -1, ring: -0.8, pinky: -0.9 },
  n: { thumb: -1, index: -1, middle: -0.8, ring: -0.9, pinky: -0.9 },
  o: { thumb: -0.4, index: -0.4, middle: -0.4, ring: -0.4, pinky: -0.4 },
  p: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  q: { thumb: -1, index: -0, middle: -1, ring: -1, pinky: -1 },
  r: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  s: { thumb: -0.9, index: -1, middle: -1, ring: -1, pinky: -1 },
  t: { thumb: -0.9, index: -0.9, middle: -1, ring: -1, pinky: -1 },
  u: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  v: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  w: { thumb: -1, index: -0, middle: -0, ring: -1, pinky: -1 },
  x: { thumb: -1, index: -0.6, middle: -1, ring: -1, pinky: -1 },
  y: { thumb: -0, index: -1, middle: -1, ring: -1, pinky: -0 },
  z: { thumb: -1, index: -0, middle: -1, ring: -1, pinky: -1 }
};


  // play single letter
  const playLetter = async (ch) => {
    if (isPlayingRef.current) return;
    const lower = ch.toLowerCase();
    const pose = letterMap[lower];
    if (!pose) {
      alert("Letter pose not defined: " + ch);
      return;
    }
    isPlayingRef.current = true;
    // position hand forward a bit for visibility
    const bones = bonesRef.current;
    const fore = bones["mixamorigRightForeArm"];
    const shoulder = fore ? fore.parent : null;
    if (shoulder && fore) {
      await animateBoneRotation(shoulder, { x: -0.6, y: 1, z: -0.6 }, 280, easeInOut);
      await animateBoneRotation(fore, { x: -0.15, y: 0, z: 0 }, 220, easeInOut);
    }
    await applyFingerCurl("mixamorigRightHand", pose, 220);
    await new Promise((r) => setTimeout(r, 420)); // hold
    // relax & return
    await applyFingerCurl("mixamorigRightHand", { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.03 }, 200);
    if (shoulder && fore) {
      await animateBoneRotation(fore, { x: 0, y: 0, z: 0 }, 240, easeInOut);
      await animateBoneRotation(shoulder, { x: 0, y: 0, z: 0 }, 300, easeInOut);
    }
    isPlayingRef.current = false;
  };

  // play a word by fingerspelling letters sequentially
  const fingerspellWord = async (word) => {
    for (const ch of word) {
      if (!/[a-zA-Z]/.test(ch)) continue;
      await playLetter(ch);
    }
  };

  // Text -> sequence player: uses known signs or fingerspells
  const playTextSequence = async (sentence) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    const tokens = sentence.split(/\s+/);
    for (const w of tokens) {
      const low = w.toLowerCase();
      if (["hi", "hello", "hii", "hey"].includes(low)) {
        await playHello();
      } else if (["thank", "thanks", "thankyou", "thankyou!"].includes(low) || low.startsWith("thank")) {
        await playThankYou();
      } else if (["yes"].includes(low)) {
        await playYes();
      } else if (["no"].includes(low)) {
        await playNo();
      } else {
        await fingerspellWord(low);
      }
      // small pause between words
      await new Promise((r) => setTimeout(r, 220));
    }
    isPlayingRef.current = false;
  };

  // -------------------------
  // Camera follow update (called in render loop)
  // -------------------------
  const updateCameraFollow = (camera, scene) => {
    if (!cameraFollow) return;
    const bones = bonesRef.current;
    const hand = bones["mixamorigRightHand"] || bones["mixamorigLeftHand"];
    if (!hand) return;
    const pos = new THREE.Vector3();
    hand.getWorldPosition(pos);
    // place camera slightly offset from the hand, looking at it
    const desired = new THREE.Vector3(pos.x + 0.6, pos.y + 0.3, pos.z + 1.2);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(pos);
  };

  // -------------------------
  // THREE init
  // -------------------------
  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f6f8);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 7);
    camera.lookAt(0, 1.6, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 6);
    scene.add(ambient, dir);

    const loader = new GLTFLoader();
    loader.load("/avatar/model.glb",
      (gltf) => {
        avatarRef.current = gltf.scene;
        avatarRef.current.scale.set(1.15,1.15,1.15);
        // shift avatar so hands appear centered (fine tune if needed)
        avatarRef.current.position.y = -1.0;
        scene.add(avatarRef.current);
        findBones(gltf.scene);
        // set neutral after a short delay so bones populated
        setTimeout(() => { setNeutralPose(); }, 250);
      },
      undefined,
      (err) => console.error("GLB load error:", err)
    );

    // ground / subtle rim
    const grid = new THREE.GridHelper(10, 20, 0xdddddd, 0xeeeeee);
    scene.add(grid);

    // render loop
    const animate = () => {
      requestAnimationFrame(animate);
      // optional camera follow
      updateCameraFollow(camera, scene);
      renderer.render(scene, camera);
    };
    animate();

    // cleanup
    return () => {
      if (renderer.domElement && mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // -------------------------
  // UI handlers
  // -------------------------
  return (
    <div style={{ padding: 18, fontFamily: "Inter, Arial, sans-serif" }}>
      <h2>Sign Avatar — Remy</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type text to perform (e.g. 'hii there')"
          style={{ padding: 10, fontSize: 16, width: 380, borderRadius: 6, border: "1px solid #ccc" }}
        />

        <button onClick={() => playTextSequence(text)} style={btnStyle}>Play Sequence</button>
        <button onClick={() => playHello()} style={btnStyle}>Hello</button>
        <button onClick={() => playThankYou()} style={btnStyle}>Thank You</button>
        <button onClick={() => playYes()} style={btnStyle}>Yes</button>
        <button onClick={() => playNo()} style={btnStyle}>No</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 10 }}>
          <input type="checkbox" checked={cameraFollow} onChange={(e) => setCameraFollow(e.target.checked)} /> Camera follow hand
        </label>
        <button onClick={() => setNeutralPose()} style={btnStyle}>Reset Neutral Pose</button>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div ref={mountRef} style={{ width: 760, height: 540, borderRadius: 8, border: "1px solid #ddd", background: "#fff" }} />
        <div style={{ width: 260 }}>
          <h4>Quick Fingerspell</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => (
              <button key={ch} onClick={() => playLetter(ch)} style={{ padding: 8 }}>{ch}</button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#555" }}>
              Notes:
              <br/> • The alphabet is approximate — fine-tune rotations per-letter for ASL accuracy.
              <br/> • Animations blend smoothly. Increase/decrease durations to taste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fafafa",
  cursor: "pointer"
};
