// src/ASLHand.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function ASLHand() {
  const mountRef = useRef(null);
  const handRef = useRef(null);
  const bonesRef = useRef({});
  const restPoseRef = useRef({});
  const loadedRef = useRef(false);
  const isAnimating = useRef(false);

  const [loaded, setLoaded] = useState(false);

  // EASING FUNCTION
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // LERP FOR ROTATIONS
  const lerpAngle = (a, b, t) => {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
  };

  // Animate bone toward target rotation
  const animateBoneTo = (bone, target, duration = 280) => {
    return new Promise((resolve) => {
      const start = {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z,
      };
      const t0 = performance.now();

      function step() {
        let t = (performance.now() - t0) / duration;
        if (t > 1) t = 1;
        const e = ease(t);

        bone.rotation.x = lerpAngle(start.x, target.x, e);
        bone.rotation.y = lerpAngle(start.y, target.y, e);
        bone.rotation.z = lerpAngle(start.z, target.z, e);

        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  };

  // Save original rotations
  const saveRestPose = () => {
    for (const name in bonesRef.current) {
      const b = bonesRef.current[name];
      restPoseRef.current[name] = {
        x: b.rotation.x,
        y: b.rotation.y,
        z: b.rotation.z,
      };
    }
  };

  // Reset hand to original pose
  const resetPose = async () => {
    if (!loadedRef.current) return;
    isAnimating.current = true;

    const bones = bonesRef.current;
    const tasks = [];

    for (const name in restPoseRef.current) {
      tasks.push(animateBoneTo(bones[name], restPoseRef.current[name], 280));
    }

    await Promise.all(tasks);
    isAnimating.current = false;
  };

  // ------------------------
  // FINGER CHAINS (YOUR MODEL)
  // ------------------------
  const FINGERS = {
    thumb: ["thumb01L_5", "thumb02L_4", "thumb03L_3"],
    index: ["f_index01L_2", "f_index02L_1", "f_index03L_0"],
    middle: ["f_middle01L_9", "f_middle02L_8", "f_middle03L_7"],
    ring: ["f_ring01L_13", "f_ring02L_12", "f_ring03L_11"],
    pinky: ["f_pinky01L_17", "f_pinky02L_16", "f_pinky03L_15"],
  };

  // finger curl (negative X so fingers move forward)
  const curlFinger = async (finger, amount, duration = 260) => {
  const bones = bonesRef.current;
  const chain = FINGERS[finger];
  const tasks = [];

  chain.forEach((name, i) => {
    const bone = bones[name];
    if (!bone) return;

    let rotationX = amount * (1 - i * 0.28); // Default for curling the fingers
    let rotationY = 0;
    let rotationZ = 0;

    if (finger === "thumb") {
      // Adjust thumb to curl more horizontally and less vertically
      rotationX = 0; // Thumb does not curl much on the X-axis
      rotationY = amount * (1 - i * 0.4); // Thumb curls more on Y
      rotationZ = amount * 0.4; // Rotate thumb along the Z-axis to bring it closer
    }

    tasks.push(
      animateBoneTo(
        bone,
        {
          x: rotationX,
          y: rotationY,
          z: rotationZ,
        },
        duration
      )
    );
  });

  await Promise.all(tasks);
};


  // ------------------------
  // ASL LETTER DEFINITIONS
  // ------------------------
  const LETTERS = {
    a: { thumb: 0.9, index: 1, middle: 1, ring: 1, pinky: 1 },
    b: { thumb: 0.1, index: 0, middle: 0, ring: 0, pinky: 0 },
    c: { thumb: 0.4, index: 0.5, middle: 0.5, ring: 0.5, pinky: 0.5 },
    d: { thumb: 1, index: 0, middle: 1, ring: 1, pinky: 1 },
    e: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 },
    f: { thumb: 0.25, index: 0, middle: 1, ring: 1, pinky: 1 },
    g: { thumb: 1, index: 0, middle: 1, ring: 1, pinky: 1 },
    h: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    i: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 0 },
    j: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 0 }, // swipe motion optional
    k: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    l: { thumb: 0, index: 0, middle: 1, ring: 1, pinky: 1 },
    m: { thumb: 1, index: 1, middle: 1, ring: 0.8, pinky: 1 },
    n: { thumb: 1, index: 1, middle: 0.8, ring: 1, pinky: 1 },
    o: { thumb: 0.4, index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4 },
    p: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    q: { thumb: 1, index: 0, middle: 1, ring: 1, pinky: 1 },
    r: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    s: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 },
    t: { thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 },
    u: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    v: { thumb: 1, index: 0, middle: 0, ring: 1, pinky: 1 },
    w: { thumb: 1, index: 0, middle: 0, ring: 0, pinky: 1 },
    x: { thumb: 1, index: 0.4, middle: 1, ring: 1, pinky: 1 },
    y: { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 0 },
    z: { thumb: 1, index: 0, middle: 1, ring: 1, pinky: 1 },
  };

  const playLetter = async (letter) => {
    if (!loadedRef.current || isAnimating.current) return;

    const pose = LETTERS[letter.toLowerCase()];
    if (!pose) return;

    isAnimating.current = true;

    await Promise.all(
      Object.entries(pose).map(([finger, amount]) =>
        curlFinger(finger, amount, 280)
      )
    );

    isAnimating.current = false;
  };

  // ------------------------
  // THREE.JS + ORBIT CONTROLS SETUP
  // ------------------------
  useEffect(() => {
    const mount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f3f3);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 1;
    controls.maxDistance = 6;

    // Correct camera placement **AFTER** controls exist
    camera.position.set(1, 10, 3);
    controls.target.set(0, 1.2, 0);
    controls.update();

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.3);
    scene.add(hemi);

    // Load hand model
    const loader = new GLTFLoader();
    loader.load(
      "/avatar/hand.glb",
      (gltf) => {
        const root = gltf.scene;
        root.position.set(0, 1.2, 0);
        root.rotation.y = Math.PI; // face camera
        scene.add(root);

        handRef.current = root;

        const bones = {};
        root.traverse((o) => {
          if (o.isBone) bones[o.name] = o;
        });
        bonesRef.current = bones;

        saveRestPose();
        loadedRef.current = true;
        setLoaded(true);
      },
      undefined,
      (err) => console.error("Error:", err)
    );

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => mount.removeChild(renderer.domElement);
  }, []);

  // ------------------------
  // JSX UI
  // ------------------------
  return (
    <div style={{ padding: 20 }}>
      <h2>ASL Hand (Animated A–Z)</h2>

      <button onClick={resetPose} style={{ marginBottom: 10 }}>
        Reset
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          width: 400,
        }}
      >
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => (
          <button key={ch} onClick={() => playLetter(ch)}>
            {ch}
          </button>
        ))}
      </div>

      <div
        ref={mountRef}
        style={{
          width: 600,
          height: 500,
          marginTop: 20,
          border: "1px solid #ccc",
          borderRadius: 10,
        }}
      />
    </div>
  );
}
