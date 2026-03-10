"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const PARTICLE_COUNT = 60;
const FRAME_INTERVAL = 33; // ~30fps
const SPEED_SCALE = 0.12;

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    age: Math.floor(Math.random() * 100),
    maxAge: 60 + Math.floor(Math.random() * 60),
  };
}

function WindParticles({
  direction,
  speed,
}: {
  direction: number;
  speed: number;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const windRef = useRef({ dx: 0, dy: 0 });

  // Update wind vector when props change
  useEffect(() => {
    const blowingToward = (direction + 180) % 360;
    const rad = (blowingToward * Math.PI) / 180;
    const pxPerFrame = Math.max(speed * SPEED_SCALE, 0.5);
    windRef.current = {
      dx: Math.sin(rad) * pxPerFrame,
      dy: -Math.cos(rad) * pxPerFrame,
    };
  }, [direction, speed]);

  useEffect(() => {
    const container = map.getContainer();

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "400";
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d")!;

    // Init particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height)
    );

    // Respawn a particle on the upwind edge
    function respawn(p: Particle) {
      const { dx, dy } = windRef.current;
      p.age = 0;
      p.maxAge = 60 + Math.floor(Math.random() * 60);

      // Spawn on the upwind edge so particles flow across
      const edge = Math.random();
      if (Math.abs(dx) > Math.abs(dy)) {
        // Primarily horizontal wind
        p.x = dx > 0 ? -Math.random() * 20 : canvas.width + Math.random() * 20;
        p.y = Math.random() * canvas.height;
      } else if (Math.abs(dy) > 0.01) {
        // Primarily vertical wind
        p.x = Math.random() * canvas.width;
        p.y = dy > 0 ? -Math.random() * 20 : canvas.height + Math.random() * 20;
      } else {
        // Mixed — pick a random upwind edge
        if (edge < 0.5) {
          p.x = dx > 0 ? -Math.random() * 20 : canvas.width + Math.random() * 20;
          p.y = Math.random() * canvas.height;
        } else {
          p.x = Math.random() * canvas.width;
          p.y = dy > 0 ? -Math.random() * 20 : canvas.height + Math.random() * 20;
        }
      }
    }

    let lastTime = 0;

    function animate(time: number) {
      animRef.current = requestAnimationFrame(animate);

      if (time - lastTime < FRAME_INTERVAL) return;
      lastTime = time;

      const { dx, dy } = windRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += dx;
        p.y += dy;
        p.age++;

        // Respawn if off-screen or expired
        if (p.age > p.maxAge || p.x < -30 || p.x > w + 30 || p.y < -30 || p.y > h + 30) {
          respawn(p);
          continue;
        }

        // Fade in/out
        const lifeRatio = p.age / p.maxAge;
        let alpha: number;
        if (lifeRatio < 0.15) {
          alpha = (lifeRatio / 0.15) * 0.45;
        } else if (lifeRatio > 0.75) {
          alpha = ((1 - lifeRatio) / 0.25) * 0.45;
        } else {
          alpha = 0.45;
        }

        // Draw trail shadow then trail
        const tailLen = 6;
        ctx.beginPath();
        ctx.moveTo(p.x - dx * tailLen, p.y - dy * tailLen);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p.x - dx * tailLen, p.y - dy * tailLen);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw dot shadow then dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 180, 255, ${alpha})`;
        ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(animate);

    // Handle resize & map movement
    function resize() {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    map.on("resize", resize);
    map.on("moveend", resize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.off("resize", resize);
      map.off("moveend", resize);
      canvas.remove();
    };
  }, [map]);

  return null;
}

export default WindParticles;
