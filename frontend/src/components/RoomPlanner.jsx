import { useState, Suspense, useMemo, useRef, useEffect, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  TransformControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import api from "../config/api";

/* ─────────────────── EMOJI MAPPER ─────────────────── */

const getCategoryIcon = (name) => {
  const lowercaseName = (name || "").toLowerCase();
  if (lowercaseName.includes("sofa") || lowercaseName.includes("ghế dài")) return "🛋️";
  if (lowercaseName.includes("bàn") || lowercaseName.includes("table") || lowercaseName.includes("desk")) return "🪑";
  if (lowercaseName.includes("ghế") || lowercaseName.includes("chair")) return "🪑";
  if (lowercaseName.includes("giường") || lowercaseName.includes("bed")) return "🛏️";
  if (lowercaseName.includes("tủ") || lowercaseName.includes("wardrobe") || lowercaseName.includes("cabinet")) return "🚪";
  if (lowercaseName.includes("đèn") || lowercaseName.includes("lamp") || lowercaseName.includes("light")) return "💡";
  if (lowercaseName.includes("kệ") || lowercaseName.includes("shelf") || lowercaseName.includes("bookshelf")) return "📚";
  if (lowercaseName.includes("tranh") || lowercaseName.includes("picture") || lowercaseName.includes("paint")) return "🖼️";
  if (lowercaseName.includes("gương") || lowercaseName.includes("mirror")) return "🪞";
  return "📦";
};

/* ─────────────────── MOCK DATA ─────────────────── */

const MOCK_CATEGORIES = [
  {
    id: "sofa",
    name: "Sofa",
    icon: "🛋️",
    products: [
      {
        id: "sofa1",
        name: "Sofa 3 Chỗ",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/023d72ae-68af-441e-9f12-08fd98386a7f.glb",
        width: 200,
        height: 80,
        length: 90,
      },
      {
        id: "sofa2",
        name: "Sofa Góc",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/451794ca-778a-41ef-91d1-2809b3c24251.glb",
        width: 220,
        height: 80,
        length: 160,
      },
    ],
  },
  {
    id: "table",
    name: "Bàn",
    icon: "🪑",
    products: [
      {
        id: "table1",
        name: "Bàn Ăn",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/85c56a5e-4387-4b29-9691-fbb8f8ac09e7.glb",
        width: 160,
        height: 75,
        length: 90,
      },
    ],
  },
];

/* ─────────────────── ROOM ─────────────────── */

function Room({ width, length, height }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#c8c4b8" roughness={0.9} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, height / 2, -length / 2]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e8e0d5" side={THREE.FrontSide} />
      </mesh>
      {/* Front wall – semi-transparent so exterior view isn't blocked */}
      <mesh position={[0, height / 2, length / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e8e0d5" side={THREE.FrontSide} transparent opacity={0.15} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial color="#ddd6c9" side={THREE.FrontSide} />
      </mesh>
      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial color="#ddd6c9" side={THREE.FrontSide} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#f5f2ee" side={THREE.BackSide} />
      </mesh>
      {/* Baseboard trims */}
      <mesh position={[0, 0.05, -length / 2 + 0.02]}>
        <boxGeometry args={[width, 0.1, 0.04]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      <mesh position={[-width / 2 + 0.02, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.1, length]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      <mesh position={[width / 2 - 0.02, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.1, length]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      {/* Window glass */}
      <mesh position={[0, height * 0.6, -length / 2 + 0.01]}>
        <planeGeometry args={[width * 0.35, height * 0.35]} />
        <meshStandardMaterial color="#a8d4f5" emissive="#b8e0ff" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
      {/* Window frame */}
      <mesh position={[0, height * 0.6, -length / 2 + 0.015]}>
        <planeGeometry args={[width * 0.37, height * 0.37]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
    </group>
  );
}

/* ─────────────────── SPATIAL HELPERS (Box3 / AABB math) ───────────────────
 *
 *  All objects are GROUNDED in useGroundedModel(): the inner clone is offset so
 *  that its footprint is centred on the wrapper origin in X/Z and its BOTTOM
 *  sits at the wrapper origin (local y = 0). Therefore:
 *    - item.position is the floor contact point. Keeping position.y = 0 means
 *      the object always rests exactly on the floor (Feature 1).
 *    - The unrotated half-extents (hx, hz) and full height live in dimsMapRef.
 *
 *  computeAABB() rebuilds the world-space Box3 for any (position, rotation,
 *  scale) WITHOUT touching the scene graph, by projecting the oriented box
 *  half-extents onto the world axes. This makes a rotated 2m wardrobe report a
 *  correctly-rotated footprint (Feature 3) and is cheap enough to run every
 *  drag frame.
 */

const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

function computeAABB(position, rotation, scale, dims) {
  if (!dims) return null;

  _euler.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  _mat.makeRotationFromEuler(_euler);
  const e = _mat.elements; // column-major

  // Scaled local half-extents. dims.height is the FULL height, so half of it.
  const hx = dims.hx * Math.abs(scale[0]);
  const hy = (dims.height / 2) * Math.abs(scale[1]);
  const hz = dims.hz * Math.abs(scale[2]);

  // World half-extents = |R| · localHalfExtents (projection of the OBB).
  const ex = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz;
  const ey = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz;
  const ez = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;

  // The geometric centre is hy above the (grounded) origin in local space.
  // Rotate that offset so tilted objects are still handled correctly.
  const cx = position[0] + e[4] * hy;
  const cy = position[1] + e[5] * hy;
  const cz = position[2] + e[6] * hy;

  return new THREE.Box3(
    new THREE.Vector3(cx - ex, cy - ey, cz - ez),
    new THREE.Vector3(cx + ex, cy + ey, cz + ez)
  );
}

// AABB overlap test with a small epsilon so objects may sit flush against each
// other (touching faces) without registering as a collision.
function boxesIntersect(a, b, eps = 0.012) {
  return (
    a.min.x < b.max.x - eps && a.max.x > b.min.x + eps &&
    a.min.y < b.max.y - eps && a.max.y > b.min.y + eps &&
    a.min.z < b.max.z - eps && a.max.z > b.min.z + eps
  );
}

/* ─────────────────── GROUNDED MODEL HOOK ───────────────────
 *
 *  Loads the GLB, normalises it to its DB dimensions, GROUNDS it (bottom on
 *  floor, footprint centred), clones materials so highlight tinting can't bleed
 *  into other instances sharing the cached GLTF, and records the resulting
 *  half-extents into dimsMapRef for the spatial constraints.
 */
function useGroundedModel(item, dimsMapRef) {
  const { scene } = useGLTF(item.modelUrl);

  return useMemo(() => {
    const c = scene.clone(true);

    // Unique materials per instance (clone shares geometry+material refs by
    // default) — required so the red collision tint only affects this object.
    c.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });

    // Natural bounding box at scale 1.
    c.scale.set(1, 1, 1);
    c.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);

    // DB width, height, length are in cm → meters.
    const targetWidth = (item.width || 80) / 100;
    const targetHeight = (item.height || 75) / 100;
    const targetLength = (item.length || 120) / 100;

    // Uniform scale to avoid warping. Prefer matching height; fall back to the
    // horizontal average for flat items (rugs, mats).
    let scale = 1;
    if (size.y > 0.15 && targetHeight > 0.15) {
      scale = targetHeight / size.y;
    } else {
      const scaleX = targetWidth / (size.x || 1);
      const scaleZ = targetLength / (size.z || 1);
      scale = (scaleX + scaleZ) / 2;
    }

    c.scale.set(scale, scale, scale);
    c.updateMatrixWorld(true);

    // Recompute the SCALED box, then ground: centre X/Z, drop bottom to y = 0.
    box = new THREE.Box3().setFromObject(c);
    const center = box.getCenter(new THREE.Vector3());
    const gsize = box.getSize(new THREE.Vector3());
    c.position.x -= center.x;
    c.position.z -= center.z;
    c.position.y -= box.min.y;

    const wrapper = new THREE.Group();
    wrapper.add(c);

    const dims = { hx: gsize.x / 2, hz: gsize.z / 2, height: gsize.y };
    if (dimsMapRef) dimsMapRef.current[item.id] = dims;

    return { object: wrapper, dims };
  }, [scene, item.id, item.width, item.height, item.length, dimsMapRef]);
}

/* ─────────────────── MODEL (non-selected) ─────────────────── */

function Model({ item, onSelect, dimsMapRef }) {
  const { object } = useGroundedModel(item, dimsMapRef);

  return (
    <primitive
      object={object}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    />
  );
}

/* ─────────────────── TRANSFORM WRAPPER ─────────────────── */
//
// ROOT-CAUSE of the snap-back bug (now fixed):
//
//   drei <TransformControls> renders:
//     <primitive object={controls} />
//     <group ref={group}>{children}</group>
//   and calls  controls.attach(group.current)
//
//   So when the user drags, Three.js TransformControls modifies the GROUP's
//   position/rotation/scale — NOT the <primitive> child's.
//
//   OLD (BROKEN) code set the initial position on meshRef (the primitive)
//   and read meshRef.position in objectChange. Since TransformControls
//   never touches the primitive, meshRef.position always returned the
//   ORIGINAL position → liveTransform always had the old values → lock
//   saved the old position → snap-back.
//
//   FIX: We now read/write the GROUP via  transformRef.current.object
//   (which is the group that TransformControls is attached to).
//   Initial position is set on the GROUP, primitive stays at origin.
//   objectChange reads from the GROUP. Everything is consistent.
//

function copyTransform(source) {
  return {
    position: [...source.position],
    rotation: [...source.rotation],
    scale: [...source.scale],
  };
}

function TransformWrapper({
  item,
  mode,
  onSelect,
  onUpdate,
  liveTransformMapRef,
  orbitControlsRef,
  dimsMapRef,
  otherObjects,
  roomWidth,
  roomLength,
}) {
  const transformRef = useRef();
  const { object: cloned, dims } = useGroundedModel(item, dimsMapRef);

  // Always up-to-date transform — written to on every objectChange frame.
  const liveTransform = useRef(copyTransform(item));
  // Last position that was BOTH inside the room AND collision-free. We revert
  // here if the drag is released on an invalid spot.
  const lastValidRef = useRef(copyTransform(item));
  // AABBs of every OTHER object, snapshotted at drag start (they don't move
  // while we drag this one).
  const otherBoxesRef = useRef([]);
  // Keep the latest otherObjects list reachable inside event handlers without
  // re-binding listeners mid-drag.
  const otherObjectsRef = useRef(otherObjects);
  otherObjectsRef.current = otherObjects;

  /* ── Collision highlight (red emissive), applied imperatively so we don't
        re-render the React tree every drag frame. ── */
  const materialsRef = useRef([]);
  const invalidRef = useRef(false);

  useEffect(() => {
    const mats = [];
    cloned.traverse((o) => {
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (m && m.emissive) {
          mats.push({ mat: m, emissive: m.emissive.clone(), intensity: m.emissiveIntensity ?? 1 });
        }
      });
    });
    materialsRef.current = mats;
    return () => {
      // Restore originals if this instance unmounts mid-highlight.
      mats.forEach(({ mat, emissive, intensity }) => {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = intensity;
      });
    };
  }, [cloned]);

  const setInvalid = useCallback((on) => {
    if (invalidRef.current === on) return;
    invalidRef.current = on;
    materialsRef.current.forEach(({ mat, emissive, intensity }) => {
      if (on) {
        mat.emissive.setRGB(0.65, 0.04, 0.04);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = intensity;
      }
    });
  }, []);

  /* ── Runs on every drag frame: clamp to the room walls, test collisions,
        highlight + remember the last valid pose. ── */
  const syncLiveTransform = useCallback(() => {
    const object = transformRef.current?.object;
    if (!object) return liveTransform.current;

    const myDims = dimsMapRef.current[item.id] || dims;
    const rotation = [object.rotation.x, object.rotation.y, object.rotation.z];
    const scale = object.scale.toArray();
    let position = object.position.toArray();

    // FEATURE 2 — Room boundary. Build the world AABB and shove it back inside
    // the walls (floor is centred on the origin: x∈[-W/2,W/2], z∈[-L/2,L/2]).
    let box = computeAABB(position, rotation, scale, myDims);
    if (box) {
      const halfW = roomWidth / 2;
      const halfL = roomLength / 2;
      let dx = 0;
      let dz = 0;
      if (box.min.x < -halfW) dx = -halfW - box.min.x;
      else if (box.max.x > halfW) dx = halfW - box.max.x;
      if (box.min.z < -halfL) dz = -halfL - box.min.z;
      else if (box.max.z > halfL) dz = halfL - box.max.z;

      if (dx !== 0 || dz !== 0) {
        object.position.x += dx;
        object.position.z += dz;
        position = object.position.toArray();
        box = computeAABB(position, rotation, scale, myDims);
      }
    }

    // FEATURE 3 — Collision. Test the clamped AABB against the snapshot of all
    // other objects. We don't hard-block the gizmo (that fights TransformControls
    // and feels janky); instead we tint red and revert on release.
    let collides = false;
    if (box) {
      for (const other of otherBoxesRef.current) {
        if (boxesIntersect(box, other)) {
          collides = true;
          break;
        }
      }
    }
    setInvalid(collides);

    const nextTransform = { position, rotation, scale };
    liveTransform.current = nextTransform;
    liveTransformMapRef.current[item.id] = nextTransform;
    if (!collides) lastValidRef.current = nextTransform;
    return nextTransform;
  }, [item.id, dims, dimsMapRef, liveTransformMapRef, roomWidth, roomLength, setInvalid]);

  // Seed parent map immediately so toggleLock can read even before any drag.
  useEffect(() => {
    const nextTransform = {
      position: [...item.position],
      rotation: [...item.rotation],
      scale: [...item.scale],
    };
    liveTransform.current = nextTransform;
    lastValidRef.current = nextTransform;
    liveTransformMapRef.current[item.id] = nextTransform;
  }, [item.id, item.position, item.rotation, item.scale, liveTransformMapRef]);

  // Listen for dragging-changed (drag start / end).
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;
    const orbitControls = orbitControlsRef.current;

    const handleDraggingChanged = (e) => {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = !e.value;
      }

      if (e.value) {
        // Drag START — snapshot every other object's AABB once.
        otherBoxesRef.current = otherObjectsRef.current
          .map((o) => computeAABB(o.position, o.rotation, o.scale, dimsMapRef.current[o.id]))
          .filter(Boolean);
        lastValidRef.current = liveTransform.current;
      } else {
        // Drag END — if we're sitting on an invalid (overlapping) spot, snap
        // back to the last valid pose; otherwise commit.
        if (invalidRef.current) {
          const lv = lastValidRef.current;
          const object = transformRef.current?.object;
          if (object) {
            object.position.set(lv.position[0], lv.position[1], lv.position[2]);
            object.rotation.set(lv.rotation[0], lv.rotation[1], lv.rotation[2]);
            object.scale.set(lv.scale[0], lv.scale[1], lv.scale[2]);
          }
          liveTransform.current = lv;
          liveTransformMapRef.current[item.id] = lv;
          setInvalid(false);
          onUpdate(item.id, lv);
        } else {
          onUpdate(item.id, syncLiveTransform());
        }
      }
    };

    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () => {
      if (orbitControls) {
        orbitControls.enabled = true;
      }
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
    };
  }, [item.id, onUpdate, orbitControlsRef, dimsMapRef, liveTransformMapRef, syncLiveTransform, setInvalid]);

  return (
    <TransformControls
      ref={transformRef}
      mode={mode}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onObjectChange={syncLiveTransform}
    >
      <primitive
        object={cloned}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
      />
    </TransformControls>
  );
}

/* ─────────────────── CAMERA CONTROLLER ─────────────────── */

function CameraController({ viewMode, roomWidth, roomLength, roomHeight, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (viewMode === "exterior") {
      camera.position.set(roomWidth * 1.2, roomHeight * 1.1, roomLength * 1.2);
      camera.fov = 50;
    } else {
      camera.position.set(0, roomHeight * 0.5, roomLength * 0.3);
      camera.fov = 80;
    }
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(
        0,
        viewMode === "interior" ? roomHeight * 0.4 : roomHeight / 3,
        viewMode === "interior" ? -roomLength * 0.1 : 0
      );
      controlsRef.current.update();
    }
  }, [viewMode, roomWidth, roomLength, roomHeight, camera, controlsRef]);

  return null;
}

/* ─────────────────── SLIDER ─────────────────── */

function Slider({ label, value, min, max, step, onChange, unit = "m" }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-amber-200/70">
        <span>{label}</span>
        <span className="font-semibold text-amber-100">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer accent-amber-400"
        style={{
          background: `linear-gradient(to right, #f59e0b ${percent}%, #44403c ${percent}%)`,
        }}
      />
    </div>
  );
}

/* ─────────────────── MAIN ─────────────────── */

export default function RoomPlanner() {
  const [width, setWidth] = useState(5);
  const [length, setLength] = useState(6);
  const [height, setHeight] = useState(3);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");
  const [objects, setObjects] = useState([]);
  const [viewMode, setViewMode] = useState("exterior");
  const [sidebarTab, setSidebarTab] = useState("room");
  const controlsRef = useRef();

  // Load catalog on mount
  useEffect(() => {
    api.get("/api/room-planner/catalog")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const fetchedCategories = res.data.map((cat) => ({
            id: cat.id || cat.categoryId,
            name: cat.name || cat.categoryName,
            icon: getCategoryIcon(cat.name || cat.categoryName || ""),
            products: (cat.products || []).map((prod) => ({
              id: prod.id || prod.productId,
              name: prod.name || prod.productName,
              modelUrl: prod.modelUrl || prod.arLink,
              width: Number(prod.width) || 80,
              height: Number(prod.height) || 75,
              length: Number(prod.length) || 120,
            })),
          }));
          setCategories(fetchedCategories);
          setSelectedCategory(fetchedCategories[0]);
        } else {
          setCategories(MOCK_CATEGORIES);
          setSelectedCategory(MOCK_CATEGORIES[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load catalog from backend, using mock data:", err);
        setCategories(MOCK_CATEGORIES);
        setSelectedCategory(MOCK_CATEGORIES[0]);
        setLoading(false);
      });
  }, []);

  // ★ Shared ref map: TransformWrapper writes here on every objectChange
  //   so that toggleLock can read the latest Three.js transform at any time.
  const liveTransformMapRef = useRef({});

  // ★ Footprint dimensions per object { hx, hz, height } in meters, written by
  //   useGroundedModel once each GLB has loaded. Used for boundary + collision.
  const dimsMapRef = useRef({});

  const updateObject = useCallback((id, transform) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...transform } : obj))
    );
  }, []);

  const addProduct = (product) => {
    // Stagger new items in a small grid AROUND the room centre (the floor is
    // centred on the origin). y stays 0 — useGroundedModel rests the object's
    // bottom exactly on the floor. Drag constraints handle the rest.
    const i = objects.length;
    const gx = ((i % 3) - 1) * 0.8;
    const gz = (((Math.floor(i / 3)) % 3) - 1) * 0.8;
    setObjects((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: product.name,
        modelUrl: product.modelUrl,
        position: [gx, 0, gz],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        locked: false,
        width: product.width,
        height: product.height,
        length: product.length,
      },
    ]);
  };

  // ★ FIX: toggleLock reads the live transform from liveTransformMapRef
  //   and saves BOTH the transform AND the locked flag in ONE setObjects call.
  const toggleLock = () => {
    if (!selectedObject) return;

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedObject) return obj;

        const newLocked = !obj.locked;

        if (newLocked) {
          const liveT = liveTransformMapRef.current[obj.id] ?? copyTransform(obj);
          return {
            ...obj,
            position: [...liveT.position],
            rotation: [...liveT.rotation],
            scale: [...liveT.scale],
            locked: true,
          };
        }

        return { ...obj, locked: newLocked };
      })
    );
  };

  const deleteSelected = () => {
    if (!selectedObject) return;
    delete liveTransformMapRef.current[selectedObject];
    delete dimsMapRef.current[selectedObject];
    setObjects((prev) => prev.filter((x) => x.id !== selectedObject));
    setSelectedObject(null);
  };

  const duplicateSelected = () => {
    if (!selectedObject) return;
    const obj = objects.find((x) => x.id === selectedObject);
    if (!obj) return;
    setObjects((prev) => [
      ...prev,
      {
        ...obj,
        id: Date.now(),
        position: [obj.position[0] + 0.5, obj.position[1], obj.position[2] + 0.5],
      },
    ]);
  };

  const tools = [
    { mode: "translate", icon: "✋", label: "Di chuyển" },
    { mode: "rotate",    icon: "🔄", label: "Xoay" },
    { mode: "scale",     icon: "⤢",  label: "Kích cỡ" },
  ];

  return (
    <div
      className="h-screen overflow-hidden text-white"
      style={{
        display: "grid",
        gridTemplateRows: "52px 1fr 160px",
        gridTemplateColumns: "264px 1fr",
        gridTemplateAreas: '"topbar topbar" "sidebar canvas" "sidebar bottom"',
        background: "#1a1410",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >

      {/* ── TOPBAR ── */}
      <header
        style={{ gridArea: "topbar" }}
        className="flex items-center justify-between px-5 border-b border-amber-900/30 bg-stone-950/95 z-20"
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
               style={{ background: "linear-gradient(135deg,#d4a853,#c96b3a)", boxShadow: "0 0 14px rgba(212,168,83,.35)" }}>
            🏠
          </div>
          <span className="font-bold text-base tracking-tight">
            Room<span className="text-amber-400 italic">3D</span>
          </span>
        </div>

        {/* View toggle */}
        <div className="flex bg-stone-900/80 border border-amber-900/30 rounded-lg p-1 gap-1">
          {[
            { id: "exterior", icon: "🌐", label: "Tổng quan" },
            { id: "interior", icon: "🏠", label: "Bên trong" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === v.id
                  ? "text-stone-950 font-semibold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
              style={
                viewMode === v.id
                  ? { background: "linear-gradient(135deg,#d4a853,#c96b3a)", boxShadow: "0 2px 8px rgba(212,168,83,.3)" }
                  : {}
              }
            >
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          {[
            { label: "Diện tích", value: `${(width * length).toFixed(1)} m²` },
            { label: "Thể tích",  value: `${(width * length * height).toFixed(1)} m³` },
            { label: "Nội thất",  value: `${objects.length} vật` },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-900/30 bg-stone-900/60 text-xs text-stone-400">
              {s.label} <strong className="text-amber-400 font-semibold">{s.value}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside
        style={{ gridArea: "sidebar" }}
        className="flex flex-col border-r border-amber-900/30 bg-stone-950/95 overflow-hidden"
      >
        {/* Tabs */}
        <div className="flex border-b border-amber-900/30 bg-stone-900/40 shrink-0">
          {[
            { id: "room",    icon: "📐", label: "PHÒNG" },
            { id: "tools",   icon: "🎮", label: "CÔNG CỤ" },
            { id: "objects", icon: "📦", label: `DS (${objects.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSidebarTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold tracking-widest border-b-2 transition-all ${
                sidebarTab === t.id
                  ? "text-amber-400 border-amber-400"
                  : "text-stone-500 border-transparent hover:text-stone-300"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "thin", scrollbarColor: "#44403c transparent" }}>

          {/* ── ROOM TAB ── */}
          {sidebarTab === "room" && (
            <div className="p-4">
              <p className="text-[9px] font-bold tracking-[.14em] uppercase text-stone-500 mb-3 flex items-center gap-2">
                Kích Thước Phòng <span className="flex-1 h-px bg-amber-900/30" />
              </p>
              <Slider label="Chiều rộng" value={width}  min={2} max={15} step={0.5} onChange={setWidth} />
              <Slider label="Chiều dài"  value={length} min={2} max={20} step={0.5} onChange={setLength} />
              <Slider label="Chiều cao"  value={height} min={2} max={6}  step={0.1} onChange={setHeight} />

              <div className="mt-3 rounded-lg border border-amber-900/30 p-3" style={{ background: "linear-gradient(135deg,rgba(74,62,48,.3),rgba(26,20,16,.5))" }}>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {[
                    { val: width,  lbl: "Rộng (m)" },
                    { val: length, lbl: "Dài (m)" },
                    { val: height, lbl: "Cao (m)" },
                  ].map((d) => (
                    <div key={d.lbl} className="text-center rounded bg-white/[.03] border border-amber-900/20 py-1.5">
                      <div className="text-base font-bold text-white leading-none">{d.val}</div>
                      <div className="text-[9.5px] text-stone-500 mt-1">{d.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around pt-2 border-t border-amber-900/20">
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-400">{(width * length).toFixed(1)}</div>
                    <div className="text-[9px] text-stone-500">m² sàn</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-400">{(width * length * height).toFixed(1)}</div>
                    <div className="text-[9px] text-stone-500">m³ thể tích</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TOOLS TAB ── */}
          {sidebarTab === "tools" && (() => {
            const selObj = objects.find((o) => o.id === selectedObject);
            const isLocked = selObj?.locked ?? false;
            return (
            <div className="p-4">
              <p className="text-[9px] font-bold tracking-[.14em] uppercase text-stone-500 mb-3 flex items-center gap-2">
                Chỉnh Sửa Đối Tượng <span className="flex-1 h-px bg-amber-900/30" />
              </p>

              {selObj && (
                <div className="mb-3 p-3 rounded-lg border border-amber-900/30 bg-stone-900/40 text-xs text-stone-300">
                  <div className="font-semibold text-amber-400 mb-1.5 truncate">{selObj.name}</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-stone-400">
                    <div>Rộng: <strong className="text-white">{selObj.width || 80}cm</strong></div>
                    <div>Cao: <strong className="text-white">{selObj.height || 75}cm</strong></div>
                    <div>Dài: <strong className="text-white">{selObj.length || 120}cm</strong></div>
                  </div>
                </div>
              )}

              {/* Lock / Unlock button */}
              <button
                onClick={toggleLock}
                disabled={!selectedObject}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold mb-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={
                  isLocked
                    ? { background: "rgba(212,168,83,.18)", borderColor: "rgba(212,168,83,.55)", color: "#f5c842", boxShadow: "0 0 10px rgba(212,168,83,.15)" }
                    : { background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.12)", color: "#a8a29e" }
                }
              >
                <span className="text-base">{isLocked ? "🔒" : "🔓"}</span>
                {isLocked ? "Đã khoá vị trí · Click để mở" : "Khoá vị trí"}
              </button>

              {/* Locked notice */}
              {isLocked && (
                <div className="mb-3 p-2.5 rounded-lg border border-amber-400/25 text-[11px] text-amber-300/70 text-center leading-relaxed"
                     style={{ background: "rgba(212,168,83,.07)" }}>
                  🔒 Đối tượng đang bị khoá<br />
                  <span className="text-stone-500">Mở khoá để di chuyển / xoay / scale</span>
                </div>
              )}

              {/* Transform mode buttons — disabled when locked */}
              <div className={"grid grid-cols-3 gap-1.5 mb-3 transition-opacity" + (isLocked ? " opacity-30 pointer-events-none" : "")}>
                {tools.map((t) => (
                  <button
                    key={t.mode}
                    onClick={() => setTransformMode(t.mode)}
                    className={"flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[10px] font-medium transition-all " + (
                      transformMode === t.mode
                        ? "border-amber-400 text-amber-400"
                        : "border-amber-900/25 text-stone-400 hover:border-amber-700/50 hover:text-stone-200"
                    )}
                    style={
                      transformMode === t.mode
                        ? { background: "linear-gradient(135deg,rgba(212,168,83,.22),rgba(201,107,58,.14))", boxShadow: "0 0 10px rgba(212,168,83,.15)" }
                        : { background: "rgba(255,255,255,.02)" }
                    }
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={duplicateSelected}
                  disabled={!selectedObject}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: "rgba(122,158,126,.1)", borderColor: "rgba(122,158,126,.3)", color: "#9dc5a0" }}
                >
                  ⧉ Nhân đôi
                </button>
                <button
                  onClick={deleteSelected}
                  disabled={!selectedObject}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: "rgba(201,107,58,.1)", borderColor: "rgba(201,107,58,.3)", color: "#e09070" }}
                >
                  🗑️ Xóa
                </button>
              </div>

              {!selectedObject && (
                <div className="mt-3 p-2.5 rounded-lg border border-amber-900/20 bg-white/[.02] text-[11px] text-stone-500 text-center leading-relaxed">
                  Click vào đối tượng 3D<br />để chọn và chỉnh sửa
                </div>
              )}
            </div>
            );
          })()}

          {/* ── OBJECTS TAB ── */}
          {sidebarTab === "objects" && (
            <div className="p-3">
              {objects.length === 0 ? (
                <div className="text-center py-7 text-stone-500 text-xs leading-loose">
                  <div className="text-3xl mb-2 opacity-40">🪑</div>
                  <div>Chưa có nội thất nào</div>
                  <div className="text-[11px] mt-1">Chọn sản phẩm từ bảng bên dưới</div>
                </div>
              ) : (
                objects.map((obj, index) => (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObject(selectedObject === obj.id ? null : obj.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border mb-1 cursor-pointer transition-all ${
                      selectedObject === obj.id
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-transparent hover:border-amber-900/30 hover:bg-white/[.02]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        selectedObject === obj.id ? "text-stone-950" : "text-stone-500"
                      }`}
                      style={
                        selectedObject === obj.id
                          ? { background: "#d4a853" }
                          : { background: "#292524" }
                      }
                    >
                      {index + 1}
                    </div>
                    <span className={"text-xs flex-1 " + (selectedObject === obj.id ? "text-white" : "text-stone-400")}>
                      {obj.name}
                    </span>
                    {obj.locked && (
                      <span className="text-[11px] shrink-0" title="Đã khoá">🔒</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── CANVAS ── */}
      <div style={{ gridArea: "canvas" }} className="relative overflow-hidden">
        {/* View label */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-900/30 bg-stone-950/90 text-[10.5px] font-semibold tracking-widest uppercase text-amber-400 pointer-events-none"
             style={{ backdropFilter: "blur(8px)" }}>
          {viewMode === "exterior" ? "🌐 Góc nhìn tổng quan" : "🏠 Góc nhìn bên trong"}
        </div>

        {/* Hints */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          {["Chuột phải: xoay góc nhìn", "Scroll: thu phóng", "Giữa chuột: di chuyển"].map((hint) => (
            <div key={hint} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-900/25 bg-stone-950/85 text-[10.5px] text-stone-400"
                 style={{ backdropFilter: "blur(8px)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#d4a853] shrink-0" />
              {hint}
            </div>
          ))}
        </div>

        {/* Selected indicator */}
        {selectedObject && (() => {
          const selObj = objects.find((o) => o.id === selectedObject);
          return (
          <div className={"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full border bg-stone-950/90 text-[11.5px] font-medium pointer-events-none whitespace-nowrap " + (selObj?.locked ? "border-amber-400/60 text-amber-300" : "border-amber-400/35 text-amber-400")}
               style={{ backdropFilter: "blur(8px)", boxShadow: "0 0 16px rgba(212,168,83,.12)" }}>
            {selObj?.locked ? "🔒 Đã khoá · vào tab Công Cụ để mở khoá" : "✦ Đã chọn · dùng tab Công Cụ để chỉnh sửa"}
          </div>
          );
        })()}

        <Canvas
          shadows
          camera={{
            position: viewMode === "interior" ? [0, height * 0.5, length * 0.3] : [width * 1.2, height * 1.1, length * 1.2],
            fov: viewMode === "interior" ? 80 : 50,
            near: 0.01,
            far: 200,
          }}
          onPointerMissed={() => setSelectedObject(null)}
          style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at 40% 30%,#1a1208 0%,#0a0806 100%)" }}
        >
          <CameraController
            viewMode={viewMode}
            roomWidth={width}
            roomLength={length}
            roomHeight={height}
            controlsRef={controlsRef}
          />

          <ambientLight intensity={viewMode === "interior" ? 1.2 : 0.7} />
          <directionalLight position={[10, 12, 6]} intensity={viewMode === "interior" ? 1.0 : 2.0} castShadow shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, height - 0.3, 0]} intensity={viewMode === "interior" ? 3.0 : 1.5} color="#fff5e0" distance={Math.max(width, length) * 2} />
          <pointLight position={[0, height * 0.6, -length / 2 + 0.5]} intensity={2.0} color="#c8e8ff" distance={length * 1.5} />
          <pointLight position={[width * 0.4, height * 0.3, length * 0.3]} intensity={0.5} color="#ffe8c0" />
          <pointLight position={[-width * 0.4, height * 0.3, -length * 0.3]} intensity={0.4} color="#ffeedd" />

          {viewMode === "exterior" && (
            <Grid args={[50, 50]} cellSize={1} sectionSize={5} cellColor="#2a2218" sectionColor="#3d3020" fadeDistance={30} infiniteGrid />
          )}

          <Room width={width} length={length} height={height} />

          <Suspense fallback={null}>
            {objects.map((item) =>
              item.id === selectedObject && !item.locked ? (
                <TransformWrapper
                  key={item.id}
                  item={item}
                  mode={transformMode}
                  onSelect={setSelectedObject}
                  onUpdate={updateObject}
                  liveTransformMapRef={liveTransformMapRef}
                  orbitControlsRef={controlsRef}
                  dimsMapRef={dimsMapRef}
                  otherObjects={objects.filter((o) => o.id !== item.id)}
                  roomWidth={width}
                  roomLength={length}
                />
              ) : (
                <Model
                  key={item.id}
                  item={item}
                  onSelect={setSelectedObject}
                  dimsMapRef={dimsMapRef}
                />
              )
            )}
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={0.5}
            maxDistance={50}
            target={viewMode === "interior" ? [0, height * 0.4, -length * 0.1] : [0, height / 3, 0]}
          />
        </Canvas>
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div style={{ gridArea: "bottom" }} className="flex flex-col border-t border-amber-900/30 bg-stone-950/98 overflow-hidden">
        {/* Category tabs */}
        <div className="flex items-center border-b border-amber-900/30 shrink-0 px-1 min-h-[38px]">
          {loading ? (
            <div className="px-4 py-2 text-xs text-stone-500 flex items-center gap-2">
              <span className="animate-spin text-amber-500 text-sm">⌛</span> Đang tải danh mục...
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all ${
                  selectedCategory?.id === cat.id
                    ? "text-amber-400 border-amber-400"
                    : "text-stone-500 border-transparent hover:text-stone-300"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))
          )}
          <div className="flex-1" />
          {!loading && <span className="pr-3 text-[10.5px] text-stone-600">Click sản phẩm để thêm vào phòng</span>}
        </div>

        {/* Product cards */}
        <div className="flex-1 flex gap-2.5 px-3.5 py-2.5 overflow-x-auto items-center" style={{ scrollbarWidth: "thin", scrollbarColor: "#44403c transparent" }}>
          {loading ? (
            <div className="flex gap-2.5 w-full">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="shrink-0 w-32 h-24 rounded-xl border border-amber-900/10 p-2.5 animate-pulse bg-stone-900/30 flex flex-col justify-between"
                >
                  <div className="h-14 rounded-lg bg-stone-850/40" />
                  <div className="h-3 rounded bg-stone-800 w-3/4" />
                </div>
              ))}
            </div>
          ) : selectedCategory?.products && selectedCategory.products.length > 0 ? (
            selectedCategory.products.map((product) => (
              <div
                key={product.id}
                onClick={() => addProduct(product)}
                className="shrink-0 w-32 rounded-xl border border-amber-900/25 p-2.5 cursor-pointer transition-all hover:-translate-y-1 hover:border-amber-600/50 hover:shadow-xl relative overflow-hidden group"
                style={{ background: "linear-gradient(160deg,rgba(74,62,48,.4),rgba(26,20,16,.8))" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-14 rounded-lg border border-amber-900/25 flex items-center justify-center text-2xl mb-2 relative"
                     style={{ background: "linear-gradient(135deg,rgba(74,62,48,.4),rgba(26,20,16,.7))" }}>
                  🪑
                  <span className="absolute bottom-1 right-1 text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1 rounded">3D</span>
                </div>
                <div className="text-[11.5px] font-semibold text-white truncate" title={product.name}>{product.name}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">+ Thêm vào phòng</div>
              </div>
            ))
          ) : (
            <div className="text-stone-500 text-xs px-2.5">Không có sản phẩm nào</div>
          )}
        </div>
      </div>
    </div>
  );
}
