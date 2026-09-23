'use client';
import { useEffect, useRef } from 'react';
import { Cpu, Wifi, Zap, Activity } from 'lucide-react';

/**
 * Electronics-lab 3D hero. A spinning MERN orb surrounded by floating
 * component cards + a debug-style telemetry panel, all tilting gently
 * with the mouse. Pure CSS 3D (no WebGL) → zero runtime cost on mobile.
 */
export default function Hero3D() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tiltx', `${(-y * 8).toFixed(2)}deg`);
      el.style.setProperty('--tilty', `${(x * 10).toFixed(2)}deg`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="scene3d grid" ref={ref}>
      <div className="scene-grid3d" />
      <div className="scene-glow3d" style={{ animation: 'orb-glow 6s ease-in-out infinite' }} />

      {/* floating component cards */}
      <div className="lab-shelf shelf-1">
        <div className="lab-card">
          <small>SENSOR TOWER</small>
          <b>DHT22 · Live</b>
          <span className="lab-chip">IN STOCK</span>
        </div>
      </div>
      <div className="lab-shelf shelf-2">
        <div className="lab-card">
          <small>ACTION BOARD</small>
          <b>ESP32-S3</b>
          <span className="lab-chip">RARE</span>
        </div>
      </div>
      <div className="lab-shelf shelf-3">
        <div className="lab-card">
          <small>TELEMETRY</small>
          <b>IMU · 3-AXIS</b>
          <span className="lab-chip">NEW</span>
        </div>
      </div>

      {/* central orb */}
      <div className="orb" aria-hidden="true">
        <div className="ring-y" />
        <div className="ring-x" />
        <div className="ring-tilt" />
        <div className="core" />
      </div>

      {/* debug panel */}
      <div className="debug-panel">
        <div><span>salvage</span><b>OK</b></div>
        <div><span>current</span><b>47 mA</b></div>
        <div><span>temp</span><b>28.4 °C</b></div>
        <div><span>link</span><b>SYNC</b></div>
        <div className="debug-live"><i /> LIVE TELEMETRY</div>
      </div>

      {/* floating pill tags */}
      <span className="hero-tag-3d tag-a" style={{ bottom: '13%' }}>
        <Cpu /> Made in India · ₹
      </span>
      <span className="hero-tag-3d tag-b" style={{ top: '8%', animationDelay: '-2.4s' }}>
        <Zap size={11} /> ESP32 · Sensors · AI
      </span>
      <span className="hero-tag-3d tag-c" style={{ bottom: '3%', animationDelay: '-4s' }}>
        <Wifi size={11} /> Pan-India delivery
      </span>
    </div>
  );
}
