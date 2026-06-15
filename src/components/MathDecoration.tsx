'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

export default function MathDecoration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formulaRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Renders the tiny decorative ODE math formula below the canvas
  useEffect(() => {
    if (formulaRef.current && mounted) {
      try {
        katex.render(
          `\\begin{cases} 
            \\dot{x} = 10.0(y - x) \\\\ 
            \\dot{y} = x(28.0 - z) - y \\\\ 
            \\dot{z} = xy - \\frac{8}{3}z 
          \\end{cases}`,
          formulaRef.current,
          {
            displayMode: false,
            throwOnError: false,
          }
        );
      } catch (e) {
        console.error(e);
      }
    }
  }, [mounted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    // Simulation state
    let x = 0.1;
    let y = 0.0;
    let z = 0.0;
    const points: [number, number, number][] = [];
    const maxPoints = 1200;

    // Lorenz parameters
    const sigma = 10.0;
    const rho = 28.0;
    const beta = 8.0 / 3.0;

    // Animation state
    let angle = 0.0;
    let colorOffset = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Warmup: pre-calculate initial points so the butterfly is already partially drawn
    const dt = 0.005;
    for (let i = 0; i < 600; i++) {
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      x += dx;
      y += dy;
      z += dz;
      points.push([x, y, z]);
    }

    const render = () => {
      // Clear with white semi-transparent fill for a motion blur tail effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; // white with transparency for light trail
      ctx.fillRect(0, 0, width, height);

      // Draw light white semi-transparent coordinate grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let gx = 30; gx < width - 10; gx += 30) {
        ctx.moveTo(gx, 10);
        ctx.lineTo(gx, height - 10);
      }
      for (let gy = 30; gy < height - 10; gy += 30) {
        ctx.moveTo(10, gy);
        ctx.lineTo(width - 10, gy);
      }
      ctx.stroke();

      // Simulation step
      const stepDt = 0.005;
      for (let i = 0; i < 4; i++) {
        const dx = sigma * (y - x) * stepDt;
        const dy = (x * (rho - z) - y) * stepDt;
        const dz = (x * y - beta * z) * stepDt;
        x += dx;
        y += dy;
        z += dz;
        points.push([x, y, z]);
        if (points.length > maxPoints) points.shift();
      }

      // Update rotation angles and colors
      angle += 0.003;
      colorOffset = (colorOffset + 0.3) % 360;

      // Draw mathematical attractor path
      if (points.length > 1) {
        ctx.save();
        ctx.translate(width / 2, height / 2 + 15);

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const cosP = Math.cos(0.5); // pitch rotation
        const sinP = Math.sin(0.5);

        const project = (pt: [number, number, number]): [number, number] => {
          const px = pt[0];
          const py = pt[1];
          const pz = pt[2] - 25; // center Z

          // Rotate around Z and X axis
          const rx = px * cosA - py * sinA;
          const ry = px * sinA + py * cosA;
          const ry2 = ry * cosP - pz * sinP;
          const rz2 = ry * sinP + pz * cosP;

          const scale = Math.min(width, height) / 8.5;
          return [rx * scale, -rz2 * scale];
        };

        // Draw path with glowing gradient colors
        ctx.lineWidth = 1.25;
        for (let i = 1; i < points.length; i++) {
          const pt1 = project(points[i - 1]);
          const pt2 = project(points[i]);

          const ratio = i / points.length;
          const hue = (colorOffset + ratio * 60) % 360;
          ctx.strokeStyle = `hsla(${hue}, 85%, 45%, ${ratio * 0.8})`; // darker, rich colors for light theme

          ctx.beginPath();
          ctx.moveTo(pt1[0], pt1[1]);
          ctx.lineTo(pt2[0], pt2[1]);
          ctx.stroke();
        }

        // Draw particle head
        const currentPt = project([x, y, z]);
        ctx.beginPath();
        ctx.arc(currentPt[0], currentPt[1], 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0891b2'; // cyan-600 for contrast
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#0891b2';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // Draw subtle math annotation grid borders
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'; // white semi-transparent border
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Draw ticks in four corners
      ctx.beginPath();
      // top-left
      ctx.moveTo(10, 20); ctx.lineTo(10, 10); ctx.lineTo(20, 10);
      // top-right
      ctx.moveTo(width - 10, 20); ctx.lineTo(width - 10, 10); ctx.lineTo(width - 20, 10);
      // bottom-left
      ctx.moveTo(10, height - 20); ctx.lineTo(10, height - 10); ctx.lineTo(20, height - 10);
      // bottom-right
      ctx.moveTo(width - 10, height - 20); ctx.lineTo(width - 10, height - 10); ctx.lineTo(width - 20, height - 10);
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[420px] mx-auto glass-card rounded-[32px] p-4 sm:p-5 overflow-hidden animate-float text-slate-850">
      {/* Decorative neon gradient header bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500" />
      
      {/* Simulation Screen */}
      <div className="relative rounded-2xl overflow-hidden bg-white/20 border border-white/40 shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full aspect-square block cursor-pointer"
        />
        
        {/* Decorative Grid Grid Markings */}
        <div className="absolute top-4 right-4 flex gap-1.5 items-center bg-white/70 px-2.5 py-1 rounded-md text-[8px] font-mono tracking-widest text-slate-700 border border-white/60 shadow-sm">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
          SIM_LORENZ_3D
        </div>
      </div>

      {/* Label and Formula Details */}
      <div className="mt-4 flex items-center justify-between gap-4 px-1">
        <div>
          <h4 className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase">Phase Space Attractor</h4>
          <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">Lorenz chaotic orbit system simulation</p>
        </div>
        <div 
          ref={formulaRef} 
          className="text-slate-600 font-mono text-[9px] text-right bg-white/40 py-1.5 px-3 rounded-xl border border-white/60 shadow-sm"
        />
      </div>
    </div>
  );
}
