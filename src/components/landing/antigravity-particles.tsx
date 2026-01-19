"use client";

import { useEffect, useRef } from "react";

export function AntigravityParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let particles: Particle[] = [];
        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Google/Antigravity inspired colors (more vibrant/glassy)
        const colors = [
            "#EA4335", // Red
            "#4285F4", // Blue
            "#34A853", // Green
            "#FBBC05", // Yellow
            "#000000", // Black accent
        ];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            originalX: number;
            originalY: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.originalX = this.x;
                this.originalY = this.y;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = Math.random() * 2 + 0.5; // 0.5 to 2.5px (Micro particles)
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update(mouse: { x: number; y: number }) {
                // Slow random movement
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Mouse interaction (repel)
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const maxDistance = 200;
                const force = (maxDistance - distance) / maxDistance;

                if (distance < maxDistance) {
                    const repelStrength = 3;
                    this.vx -= forceDirectionX * force * repelStrength * 0.05;
                    this.vy -= forceDirectionY * force * repelStrength * 0.05;
                }

                // Draw
                if (ctx) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }
            }
        }

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            particles = [];
            const numberOfParticles = Math.floor((width * height) / 10000); // Density
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        };

        const mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY + window.scrollY; // Adjust for scroll if canvas is fixed
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p) => p.update(mouse));
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener("resize", init);
        window.addEventListener("mousemove", handleMouseMove);

        init();
        animate();

        return () => {
            window.removeEventListener("resize", init);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none opacity-30"
        />
    );
}
