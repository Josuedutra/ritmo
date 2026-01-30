"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, PerspectiveCamera } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function GlassShape() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = Math.cos(t / 4) / 4;
        meshRef.current.rotation.y = Math.sin(t / 4) / 4;
        meshRef.current.rotation.z = (1 + Math.sin(t / 1.5)) / 20;
        meshRef.current.position.y = (1 + Math.sin(t / 1.5)) / 10;
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} scale={1.2}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial
                    color="white"
                    roughness={0}
                    metalness={0.1}
                    transmission={1}
                    thickness={1.5}
                    envMapIntensity={1}
                />
            </mesh>
        </Float>
    );
}

export default function Hero3D() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <GlassShape />
            </Canvas>
        </div>
    );
}
