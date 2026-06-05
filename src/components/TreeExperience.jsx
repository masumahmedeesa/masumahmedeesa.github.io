import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, OrbitControls, Sky, Sparkles, useCursor } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";

const TREE_POSITION = [-1.55, -0.04, 0];
const TREE_INITIAL_TARGET = [-0.38, 0.48, 0];
const TREE_ROTATION_SETTLE = 0.035;
const FALLBACK_TREE_ITEM = { id: "name", label: "Myself", position: [0, 1.8, 0], tint: "#f4d35e" };

const isLeftSideItem = (item) => item.position[0] < 0;
const activeLeafFocusPosition = (item, mobile) => {
  const pullTowardPanel = mobile ? 1.78 : 2.34;
  return [isLeftSideItem(item) ? -pullTowardPanel : pullTowardPanel, mobile ? 2.05 : 2.34, isLeftSideItem(item) ? -0.34 : 0.34];
};
const getTreeItems = (items) => (Array.isArray(items) && items.length ? items : [FALLBACK_TREE_ITEM]);
const getActiveTreeItem = (items, activeId) => getTreeItems(items).find((item) => item.id === activeId) ?? getTreeItems(items)[0];

const branchMaterial = new THREE.MeshStandardMaterial({
  color: "#4a2f1f",
  roughness: 0.92,
  metalness: 0.02,
});

const branchActiveMaterial = new THREE.MeshStandardMaterial({
  color: "#7b5a36",
  roughness: 0.84,
  metalness: 0.03,
});

const barkDarkMaterial = new THREE.MeshStandardMaterial({
  color: "#24180f",
  roughness: 0.96,
  metalness: 0.01,
});

const barkHighlightMaterial = new THREE.MeshStandardMaterial({
  color: "#6a4328",
  roughness: 0.9,
  metalness: 0.02,
});

const grassMaterial = new THREE.MeshStandardMaterial({
  color: "#4f8a3d",
  roughness: 0.86,
  metalness: 0.01,
  side: THREE.DoubleSide,
});

const tallGrassMaterial = new THREE.MeshStandardMaterial({
  color: "#87b865",
  roughness: 0.78,
  metalness: 0.01,
  side: THREE.DoubleSide,
});

const cloudMaterial = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
});

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0.58);
leafShape.bezierCurveTo(0.42, 0.34, 0.42, -0.25, 0, -0.58);
leafShape.bezierCurveTo(-0.42, -0.25, -0.42, 0.34, 0, 0.58);
const leafGeometry = new THREE.ShapeGeometry(leafShape, 18);
leafGeometry.computeVertexNormals();

function Branch({ start, end, radius = 0.08, material = branchMaterial, segments = 10 }) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(to, from);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    return {
      midpoint: mid,
      length: direction.length(),
      quaternion: q,
    };
  }, [start, end]);

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius * 0.58, radius, length, segments, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function OrganicBranch({ start, end, radius = 0.08, active = false }) {
  const points = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(to, from);
    const side = Math.sign(direction.x || 1);
    const mid = from
      .clone()
      .add(direction.clone().multiplyScalar(0.48))
      .add(new THREE.Vector3(side * 0.16, 0.18, direction.z * 0.12));

    return [from.toArray(), mid.toArray(), to.toArray()];
  }, [start, end]);

  return (
    <>
      <Branch start={points[0]} end={points[1]} radius={radius} material={active ? branchActiveMaterial : branchMaterial} segments={11} />
      <Branch start={points[1]} end={points[2]} radius={radius * 0.72} material={active ? branchActiveMaterial : branchMaterial} segments={9} />
    </>
  );
}

function LeafMesh({ color = "#3f8154", emissive = "#163a25", scale = 1, rotation = [0, 0, 0], position = [0, 0, 0], active = false }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <primitive object={leafGeometry} attach="geometry" />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={active ? 0.42 : 0.08}
          roughness={0.64}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.02, 0.012]} scale={[0.028, 0.88, 0.028]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d7c58a" roughness={0.72} />
      </mesh>
    </group>
  );
}

function FoliageCluster({ center, count = 9, spread = [0.52, 0.36, 0.28], seed = 1 }) {
  const leaves = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const angle = index * 2.399 + seed;
      const wobble = Math.sin(index * 12.989 + seed) * 0.5 + 0.5;
      return {
        position: [
          Math.cos(angle) * spread[0] * (0.35 + wobble * 0.75),
          Math.sin(angle * 0.82) * spread[1] * (0.35 + wobble * 0.6),
          Math.sin(angle) * spread[2],
        ],
        rotation: [0.45 + wobble * 0.3, angle, -0.65 + wobble * 1.2],
        scale: 0.26 + wobble * 0.18,
        color: index % 3 === 0 ? "#6c9f58" : index % 3 === 1 ? "#3f7b52" : "#8fbf70",
      };
    });
  }, [count, seed, spread]);

  return (
    <group position={center}>
      {leaves.map((leaf, index) => (
        <LeafMesh key={`${seed}-${index}`} {...leaf} emissive="#183a25" />
      ))}
    </group>
  );
}

function LeafNode({ item, active, hasInteracted, focusPosition, onSelect }) {
  const nodeRef = useRef();
  const pulseRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);

  useCursor(hovered);

  useEffect(() => {
    if (!pulseRef.current || !glowRef.current) return;

    gsap.to(pulseRef.current.scale, {
      x: active ? 1.46 : hovered ? 1.16 : 1,
      y: active ? 1.46 : hovered ? 1.16 : 1,
      z: active ? 1.46 : hovered ? 1.16 : 1,
      duration: 0.45,
      ease: "elastic.out(1, 0.55)",
    });

    gsap.to(glowRef.current.material, {
      opacity: active ? 0.38 : hovered ? 0.24 : 0.07,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [active, hovered]);

  useEffect(() => {
    if (!nodeRef.current) return undefined;
    const target = active && hasInteracted ? focusPosition : item.position;
    const timeline = gsap.timeline();

    timeline.to(nodeRef.current.position, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration: active && hasInteracted ? 1.18 : 0.8,
      ease: active && hasInteracted ? "expo.inOut" : "power3.out",
    });

    timeline.to(
      nodeRef.current.scale,
      {
        x: active && hasInteracted ? 1.22 : 1,
        y: active && hasInteracted ? 1.22 : 1,
        z: active && hasInteracted ? 1.22 : 1,
        duration: 0.85,
        ease: "back.out(1.6)",
      },
      0.08,
    );

    return () => timeline.kill();
  }, [active, focusPosition, hasInteracted, item.position]);

  useFrame(({ clock }) => {
    if (!nodeRef.current) return;
    const time = clock.getElapsedTime();
    nodeRef.current.rotation.z = Math.sin(time * (active ? 1.2 : 0.72) + item.position[2]) * (active ? 0.08 : 0.025);
  });

  return (
    <Float speed={0.95} rotationIntensity={0.08} floatIntensity={0.06}>
      <group ref={nodeRef} position={item.position}>
        <FoliageCluster center={[0, -0.05, 0]} count={10} spread={[0.44, 0.3, 0.24]} seed={item.position[0] * 4.7} />

        <group
          ref={pulseRef}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item.id);
          }}
        >
          <LeafMesh
            color={active ? item.tint : "#4f8c55"}
            emissive={item.tint}
            active={hovered || active}
            scale={0.54}
            rotation={[0.42, 0.18, -0.35]}
          />
          <LeafMesh
            color={active ? item.tint : "#367349"}
            emissive={item.tint}
            active={hovered || active}
            scale={0.38}
            rotation={[0.28, -0.38, 0.48]}
            position={[0.18, -0.12, -0.04]}
          />

          <mesh ref={glowRef} scale={[0.66, 0.74, 0.66]} rotation={[0.42, 0.18, -0.35]}>
            <primitive object={leafGeometry} attach="geometry" />
            <meshBasicMaterial color={item.tint} transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>

      </group>
    </Float>
  );
}

function ActiveLeafFocus({ item, hasInteracted }) {
  const focusRef = useRef();
  const glowRef = useRef();
  const { size } = useThree();
  const mobile = size.width < 760;

  useEffect(() => {
    if (!focusRef.current || !hasInteracted) return undefined;

    const from = new THREE.Vector3(TREE_POSITION[0] + item.position[0] * 0.8, TREE_POSITION[1] + item.position[1] * 0.9, item.position[2] * 0.6);
    const to = new THREE.Vector3(mobile ? 0.2 : 0.86, mobile ? 2.05 : 2.36, mobile ? 0.65 : 0.8);
    const timeline = gsap.timeline();

    timeline.fromTo(
      focusRef.current.position,
      { x: from.x, y: from.y, z: from.z },
      { x: to.x, y: to.y, z: to.z, duration: 1.15, ease: "expo.inOut" },
    );
    timeline.fromTo(
      focusRef.current.scale,
      { x: 0.55, y: 0.55, z: 0.55 },
      { x: mobile ? 0.82 : 1.05, y: mobile ? 0.82 : 1.05, z: mobile ? 0.82 : 1.05, duration: 0.95, ease: "back.out(1.8)" },
      0.1,
    );
    timeline.fromTo(
      focusRef.current.rotation,
      { x: 0.2, y: isLeftSideItem(item) ? Math.PI : 0, z: -0.7 },
      { x: 0.38, y: isLeftSideItem(item) ? Math.PI * 1.9 : Math.PI * 0.9, z: 0.1, duration: 1.15, ease: "power3.inOut" },
      0,
    );

    if (glowRef.current) {
      timeline.fromTo(glowRef.current.material, { opacity: 0 }, { opacity: 0.28, duration: 0.45, yoyo: true, repeat: 1, ease: "power2.out" }, 0.12);
    }

    return () => timeline.kill();
  }, [hasInteracted, item, mobile]);

  if (!hasInteracted) return null;

  return (
    <Float speed={1.25} rotationIntensity={0.12} floatIntensity={0.12}>
      <group ref={focusRef} renderOrder={20}>
        <LeafMesh color={item.tint} emissive={item.tint} active scale={0.76} rotation={[0.42, 0.18, -0.35]} />
        <LeafMesh color="#fff8b8" emissive={item.tint} active scale={0.42} rotation={[0.25, -0.32, 0.42]} position={[0.22, -0.16, -0.04]} />
        <mesh ref={glowRef} scale={[0.95, 1.06, 0.95]} rotation={[0.42, 0.18, -0.35]}>
          <primitive object={leafGeometry} attach="geometry" />
          <meshBasicMaterial color={item.tint} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </Float>
  );
}

function RootSystem() {
  return (
    <>
      <Branch start={[-0.08, -2.9, 0]} end={[-1.35, -3.18, 0.55]} radius={0.16} material={barkDarkMaterial} segments={9} />
      <Branch start={[-0.05, -2.88, 0]} end={[1.18, -3.12, 0.35]} radius={0.14} material={barkDarkMaterial} segments={9} />
      <Branch start={[-0.18, -2.84, -0.02]} end={[-0.78, -3.16, -0.9]} radius={0.13} material={barkDarkMaterial} segments={8} />
      <Branch start={[0.05, -2.82, -0.03]} end={[0.88, -3.14, -0.78]} radius={0.12} material={barkDarkMaterial} segments={8} />
    </>
  );
}

function GrassField({ count = 520 }) {
  const shortGrassRef = useRef();
  const tallGrassRef = useRef();

  const grassMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const shortMatrices = [];
    const tallMatrices = [];

    for (let index = 0; index < count; index += 1) {
      const ring = Math.sqrt(index / count);
      const angle = index * 2.399963 + Math.sin(index) * 0.3;
      const x = Math.cos(angle) * ring * 7.25;
      const z = Math.sin(angle) * ring * 5.1;
      const scale = 0.42 + (Math.sin(index * 17.13) * 0.5 + 0.5) * 0.7;
      const lean = (Math.sin(index * 5.41) * 0.5 + 0.5) * 0.34;

      dummy.position.set(x, -2.96, z);
      dummy.rotation.set(Math.sin(index * 7.11) * 0.16, angle, lean * 0.75 - 0.2);
      dummy.scale.set(0.08 * scale, 0.22 * scale, 0.08 * scale);
      dummy.updateMatrix();

      if (index % 3 === 0) tallMatrices.push(dummy.matrix.clone());
      else shortMatrices.push(dummy.matrix.clone());
    }

    return { shortMatrices, tallMatrices };
  }, [count]);

  useEffect(() => {
    grassMatrices.shortMatrices.forEach((matrix, index) => shortGrassRef.current?.setMatrixAt(index, matrix));
    grassMatrices.tallMatrices.forEach((matrix, index) => tallGrassRef.current?.setMatrixAt(index, matrix));
    if (shortGrassRef.current) shortGrassRef.current.instanceMatrix.needsUpdate = true;
    if (tallGrassRef.current) tallGrassRef.current.instanceMatrix.needsUpdate = true;
  }, [grassMatrices]);

  return (
    <>
      <instancedMesh ref={shortGrassRef} args={[null, null, grassMatrices.shortMatrices.length]} castShadow receiveShadow>
        <planeGeometry args={[0.26, 1]} />
        <primitive object={grassMaterial} attach="material" />
      </instancedMesh>
      <instancedMesh ref={tallGrassRef} args={[null, null, grassMatrices.tallMatrices.length]} castShadow receiveShadow>
        <planeGeometry args={[0.22, 1.4]} />
        <primitive object={tallGrassMaterial} attach="material" />
      </instancedMesh>
    </>
  );
}

function GardenInsects() {
  const groupRef = useRef();
  const insects = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const foreground = index < 4;
        return {
          base: foreground
            ? [-3.45 + index * 0.9, -2.43, 1.52 + Math.sin(index * 1.8) * 0.12]
            : [-3.45 + Math.floor(index / 3) * 1.62 + Math.sin(index) * 0.22, -2.72, 2.18 + (index % 3) * 0.42 + Math.cos(index) * 0.16],
          scale: foreground ? 0.23 : 0.18,
          speed: 0.25 + index * 0.035,
          phase: index * 0.8,
          color: index % 3 === 0 ? "#e84a37" : index % 3 === 1 ? "#2a2119" : "#f2bf45",
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    groupRef.current.children.forEach((child, index) => {
      const insect = insects[index];
      child.position.x = insect.base[0] + Math.sin(time * insect.speed + insect.phase) * 0.18;
      child.position.z = insect.base[2] + Math.cos(time * insect.speed * 0.8 + insect.phase) * 0.12;
      child.rotation.y = Math.sin(time * insect.speed + insect.phase) * 0.7;
    });
  });

  return (
    <group ref={groupRef}>
      {insects.map((insect, index) => (
        <group key={`insect-${index}`} position={insect.base} scale={insect.scale}>
          <mesh castShadow>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={insect.color} emissive={insect.color} emissiveIntensity={0.08} roughness={0.52} />
          </mesh>
          <mesh position={[0, 0.08, -0.6]} castShadow>
            <sphereGeometry args={[0.48, 8, 6]} />
            <meshStandardMaterial color="#12100d" roughness={0.5} />
          </mesh>
          {[-0.62, 0, 0.62].map((z) => (
            <group key={z}>
              <mesh position={[-0.72, -0.14, z]} rotation={[0.2, 0, -0.8]}>
                <boxGeometry args={[0.95, 0.08, 0.08]} />
                <meshStandardMaterial color="#15110e" roughness={0.6} />
              </mesh>
              <mesh position={[0.72, -0.14, z]} rotation={[0.2, 0, 0.8]}>
                <boxGeometry args={[0.95, 0.08, 0.08]} />
                <meshStandardMaterial color="#15110e" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function SkyGardenAccents() {
  const cloudClusters = useMemo(
    () => [
      {
        position: [-3.8, 4.18, -5.6],
        scale: [0.64, 0.24, 0.18],
        pieces: [
          [-0.72, 0, 0, 0.78],
          [-0.15, 0.1, 0.02, 0.92],
          [0.52, 0, -0.02, 0.72],
        ],
      },
      {
        position: [2.55, 4.45, -6.2],
        scale: [0.58, 0.2, 0.16],
        pieces: [
          [-0.62, 0, 0, 0.68],
          [0, 0.08, 0.02, 0.86],
          [0.62, -0.02, -0.02, 0.62],
        ],
      },
    ],
    [],
  );

  return (
    <group>
      <mesh position={[-4.3, 4.6, -7.2]} scale={[0.34, 0.34, 0.34]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#fff1a8" transparent opacity={0.62} depthWrite={false} />
      </mesh>
      {cloudClusters.map((cluster, clusterIndex) => (
        <group key={`cloud-${clusterIndex}`} position={cluster.position} scale={cluster.scale}>
          {cluster.pieces.map((piece, pieceIndex) => (
            <mesh key={`cloud-${clusterIndex}-${pieceIndex}`} position={[piece[0], piece[1], piece[2]]} scale={piece[3]}>
              <sphereGeometry args={[1, 18, 10]} />
              <primitive object={cloudMaterial} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.16, 0]} receiveShadow>
        <circleGeometry args={[8.8, 128]} />
        <meshStandardMaterial color="#2f5a2f" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, -3.145, 0.08]} receiveShadow>
        <ringGeometry args={[1.15, 2.9, 96]} />
        <meshStandardMaterial color="#5b4530" roughness={0.94} metalness={0.01} transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.14, 0]} receiveShadow>
        <circleGeometry args={[1.22, 72]} />
        <meshStandardMaterial color="#4a3426" roughness={0.96} metalness={0.01} />
      </mesh>
      <GrassField />
      <GardenInsects />
      <ContactShadows position={[0, -3.04, 0]} opacity={0.54} scale={12.5} blur={2.8} far={6.4} color="#173017" />
    </>
  );
}

function CinematicTree({ activeId, hasInteracted, onLabelPositions, onSelect, treeNavItems }) {
  const groupRef = useRef();
  const rotationState = useRef({ y: 0 });
  const projectionState = useRef({ at: 0, positions: null });
  const { camera, size } = useThree();
  const mobile = size.width < 760;
  const navItems = getTreeItems(treeNavItems);
  const activeItem = getActiveTreeItem(navItems, activeId);
  const focusPosition = activeLeafFocusPosition(activeItem, mobile);
  const trunkPoints = useMemo(
    () => [
      [0, -3, 0],
      [-0.03, -1.76, 0.04],
      [-0.08, -0.54, -0.04],
      [-0.13, 0.84, 0.03],
      [-0.2, 2.18, -0.03],
      [-0.28, 3.06, 0.04],
    ],
    [],
  );

  const branchStarts = useMemo(
    () => ({
      name: [-0.19, 1.58, 0.04],
      objective: [-0.22, 2.1, -0.05],
      whoami: [-0.11, 0.45, -0.05],
      experience: [-0.1, 0.5, 0.05],
      education: [-0.06, -0.42, 0.1],
      skills: [-0.04, -0.32, -0.1],
      research: [-0.24, 2.4, -0.04],
      showcase: [-0.24, 2.46, 0.02],
      follow: [-0.16, 1.24, -0.12],
      contact: [-0.18, 1.64, 0.16],
    }),
    [],
  );

  useEffect(() => {
    const targetRotation = hasInteracted && isLeftSideItem(activeItem) ? Math.PI : 0;
    const tween = gsap.to(rotationState.current, {
      y: targetRotation,
      duration: hasInteracted ? 1.35 : 0.8,
      ease: "power3.inOut",
    });

    return () => tween.kill();
  }, [activeItem, hasInteracted]);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    groupRef.current.rotation.y = rotationState.current.y + Math.sin(time * 0.1) * 0.018 + pointer.x * 0.012;
    groupRef.current.rotation.x = pointer.y * 0.006;

    if (onLabelPositions && time - projectionState.current.at > 0.05) {
      const nextPositions = {};

      navItems.forEach((item) => {
        const projected = new THREE.Vector3(item.position[0], item.position[1] + 0.47, item.position[2]);
        groupRef.current.localToWorld(projected);
        projected.project(camera);
        nextPositions[item.id] = {
          left: ((projected.x + 1) / 2) * 100,
          top: ((1 - projected.y) / 2) * 100,
        };
      });

      const previous = projectionState.current.positions;
      const changed =
        !previous ||
        navItems.some((item) => {
          const before = previous[item.id];
          const after = nextPositions[item.id];
          return !before || Math.abs(before.left - after.left) > 0.35 || Math.abs(before.top - after.top) > 0.35;
        });

      if (changed) {
        projectionState.current.positions = nextPositions;
        onLabelPositions(nextPositions);
      }

      projectionState.current.at = time;
    }
  });

  return (
    <group ref={groupRef} position={TREE_POSITION} rotation={[0, 0, TREE_ROTATION_SETTLE]}>
      <RootSystem />

      {trunkPoints.slice(0, -1).map((point, index) => (
        <Branch
          key={`trunk-${index}`}
          start={point}
          end={trunkPoints[index + 1]}
          radius={0.42 - index * 0.055}
          material={index % 2 === 0 ? barkDarkMaterial : barkHighlightMaterial}
          segments={14}
        />
      ))}

      {trunkPoints.slice(1, -1).map((point, index) => (
        <Branch
          key={`bark-ridge-${index}`}
          start={[point[0] - 0.04, point[1] - 0.42, point[2] + 0.18]}
          end={[point[0] - 0.16, point[1] + 0.34, point[2] + 0.2]}
          radius={0.025}
          material={barkDarkMaterial}
          segments={6}
        />
      ))}

      {navItems.map((item) => {
        const start = branchStarts[item.id] ?? [item.position[0] * 0.12, Math.max(-0.62, item.position[1] - 1.16), item.position[2] * 0.2];

        return (
          <OrganicBranch
            key={`branch-${item.id}`}
            start={start}
            end={[item.position[0] * 0.92, item.position[1] - 0.2, item.position[2] * 0.86]}
            radius={item.id === activeId ? 0.09 : 0.066}
            active={item.id === activeId}
          />
        );
      })}

      <FoliageCluster center={[-0.82, 2.42, -0.4]} count={28} spread={[0.92, 0.62, 0.42]} seed={3} />
      <FoliageCluster center={[0.56, 2.52, 0.34]} count={30} spread={[1, 0.6, 0.4]} seed={9} />
      <FoliageCluster center={[1.22, 1.24, -0.25]} count={24} spread={[0.86, 0.54, 0.35]} seed={14} />
      <FoliageCluster center={[-1.02, 1.2, 0.24]} count={22} spread={[0.76, 0.48, 0.34]} seed={18} />
      <FoliageCluster center={[0.02, 0.16, -0.12]} count={18} spread={[0.7, 0.4, 0.3]} seed={24} />
      <FoliageCluster center={[0.2, 1.78, -0.52]} count={20} spread={[0.86, 0.5, 0.36]} seed={31} />
      <FoliageCluster center={[-0.42, 0.82, 0.48]} count={16} spread={[0.64, 0.42, 0.34]} seed={37} />

      {navItems.map((item) => (
        <LeafNode key={item.id} item={item} active={item.id === activeId} hasInteracted={hasInteracted} focusPosition={item.id === activeId ? focusPosition : item.position} onSelect={onSelect} />
      ))}
    </group>
  );
}

function CameraRig({ activeId, hasInteracted, treeNavItems }) {
  const { camera, size } = useThree();
  const controlsRef = useRef();
  const activeItem = getActiveTreeItem(treeNavItems, activeId);

  useEffect(() => {
    const mobile = size.width < 760;
    const leftSide = isLeftSideItem(activeItem);
    const focusLocal = activeLeafFocusPosition(activeItem, mobile);
    const focusWorldX = TREE_POSITION[0] + (leftSide ? -focusLocal[0] : focusLocal[0]);
    const focusWorldY = TREE_POSITION[1] + focusLocal[1];
    const focusWorldZ = leftSide ? -focusLocal[2] : focusLocal[2];
    const target = hasInteracted
      ? new THREE.Vector3(
          mobile ? focusWorldX * 0.18 - 0.12 : focusWorldX * 0.68,
          mobile ? focusWorldY * 0.48 - 0.16 : focusWorldY * 0.74,
          focusWorldZ * 0.34,
        )
      : new THREE.Vector3(mobile ? -0.46 : TREE_INITIAL_TARGET[0], mobile ? 0.28 : TREE_INITIAL_TARGET[1], TREE_INITIAL_TARGET[2]);

    const cameraPosition = hasInteracted
      ? {
          x: mobile ? focusWorldX * 0.08 - 0.26 : focusWorldX * 0.34 + 0.1,
          y: mobile ? 1.05 : 1.45,
          z: mobile ? 8.4 : 6.25,
        }
      : {
          x: mobile ? -0.58 : -0.14,
          y: mobile ? 0.48 : 0.62,
          z: mobile ? 10.6 : 9,
        };

    const timeline = gsap.timeline({ defaults: { duration: hasInteracted ? 1.25 : 1.05, ease: "power3.inOut" } });
    timeline.to(camera.position, {
      ...cameraPosition,
      onUpdate: () => camera.lookAt(target),
    });

    if (controlsRef.current) {
      timeline.to(
        controlsRef.current.target,
        {
          x: target.x,
          y: target.y,
          z: target.z,
          onUpdate: () => controlsRef.current?.update(),
        },
        0,
      );
    }

    return () => timeline.kill();
  }, [activeId, activeItem, camera, hasInteracted, size.width]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={5.8}
      maxDistance={13}
      minPolarAngle={Math.PI / 3.3}
      maxPolarAngle={Math.PI / 1.82}
      target={TREE_INITIAL_TARGET}
    />
  );
}

function Scene({ activeId, hasInteracted, onLabelPositions, onSelect, treeNavItems }) {
  const activeItem = getActiveTreeItem(treeNavItems, activeId);

  return (
    <>
      <color attach="background" args={["#a9d8f4"]} />
      <fog attach="fog" args={["#b9dfcc", 9, 18]} />
      <Sky distance={450000} sunPosition={[-2, 6, 3]} inclination={0.42} azimuth={0.18} turbidity={6.2} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <SkyGardenAccents />
      <ambientLight intensity={1.05} color="#f5f8dd" />
      <hemisphereLight intensity={1.85} color="#e7f7ff" groundColor="#315b2e" />
      <directionalLight
        position={[-4.4, 7.2, 4.8]}
        intensity={3.4}
        color="#fff0b5"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <spotLight position={[-5.2, 4.2, 2.8]} angle={0.42} intensity={1.1} color="#b7f4c1" penumbra={0.75} />
      <Suspense fallback={null}>
        <Environment preset="sunset" />
        <Sparkles count={34} speed={0.13} opacity={0.45} color="#f7d876" size={1.2} scale={[7, 4.8, 4]} position={[0.2, 1.1, 0]} />
        <Sparkles count={18} speed={0.1} opacity={0.35} color="#80ed99" size={0.8} scale={[5.8, 3.2, 3.4]} position={[0.2, 0.6, 0]} />
      </Suspense>
      <CinematicTree activeId={activeId} hasInteracted={hasInteracted} onLabelPositions={onLabelPositions} onSelect={onSelect} treeNavItems={treeNavItems} />
      <ActiveLeafFocus item={activeItem} hasInteracted={hasInteracted} />
      <Ground />
      <CameraRig activeId={activeId} hasInteracted={hasInteracted} treeNavItems={treeNavItems} />
    </>
  );
}

function TreeLabelOverlay({ activeId, hasInteracted, labelPositions, ready, onSelect, treeNavItems }) {
  const navItems = getTreeItems(treeNavItems);
  const activeItem = getActiveTreeItem(navItems, activeId);
  const rotated = hasInteracted && isLeftSideItem(activeItem);

  return (
    <div className={`tree-label-layer ${rotated ? "is-rotated" : ""} ${ready ? "is-ready" : ""}`} aria-label="Tree leaf navigation">
      {navItems.map((item) => {
        const isActive = item.id === activeId;
        const projected = labelPositions[item.id];
        const displayX = rotated ? -item.position[0] : item.position[0];
        const restingX = projected?.left ?? 38 + displayX * 12;
        const restingY = projected?.top ?? 50 - item.position[1] * 10.6;
        const labelX = isActive && hasInteracted ? 58 : restingX;
        const labelY = isActive && hasInteracted ? 18 : restingY;

        return (
          <button
            key={item.id}
            className={`leaf-label ${isActive ? "is-active" : ""} ${isActive && hasInteracted ? "is-focused" : ""}`}
            data-testid={`leaf-${item.id}`}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              "--leaf-tint": item.tint,
              left: `${labelX}%`,
              top: `${labelY}%`,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function TreeExperience({ activeId, hasInteracted, onSelect, treeNavItems }) {
  const [labelPositions, setLabelPositions] = useState({});
  const [sceneReady, setSceneReady] = useState(false);

  const handleLabelPositions = useCallback((positions) => {
    setLabelPositions(positions);
    setSceneReady(true);
  }, []);

  return (
    <section className={`tree-stage ${sceneReady ? "is-ready" : ""}`} aria-label="Interactive 3D professional journey tree">
      <div className="garden-sun" aria-hidden="true" />
      <TreeLabelOverlay activeId={activeId} hasInteracted={hasInteracted} labelPositions={labelPositions} ready={sceneReady} onSelect={onSelect} treeNavItems={treeNavItems} />
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [-0.14, 0.62, 9], fov: 44, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Scene activeId={activeId} hasInteracted={hasInteracted} onLabelPositions={handleLabelPositions} onSelect={onSelect} treeNavItems={treeNavItems} />
      </Canvas>
    </section>
  );
}

export default memo(TreeExperience);
