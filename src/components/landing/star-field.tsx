"use client";

import { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
}

export function StarField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        setSize();
        window.addEventListener("resize", setSize);

        // Create stars
        const stars: Star[] = Array.from({ length: 150 }).map(() => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2, // Small crisp stars
            opacity: Math.random() * 0.8 + 0.2,
            speed: Math.random() * 0.5 + 0.1,
        }));

        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw stars
            stars.forEach((star) => {
                // Simple vertical movement
                star.y -= star.speed;

                // Reset if goes off top
                if (star.y < 0) {
                    star.y = height;
                    star.x = Math.random() * width;
                }

                // Draw
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", setSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none bg-black"
            style={{ background: "transparent" }}
        />
    );
}
