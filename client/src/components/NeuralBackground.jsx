import { useEffect, useRef } from 'react';

const NeuralBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current, parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    let frameId, width = 0, height = 0, initialized = false;
    const nodes = [], prefersMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resizeObserver = new ResizeObserver(() => {
      const w = parent.offsetWidth, h = parent.offsetHeight;
      if (w > 0 && h > 0) {
        if (!initialized) {
          for (let i = 0; i < 45; i++) {
            nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6 });
          }
          initialized = true;
        }
        width = canvas.width = w; height = canvas.height = h;
        if (!prefersMotion) draw();
      }
    });
    resizeObserver.observe(parent);

    const handleMouseMove = (e) => {
      if (!prefersMotion || !initialized) return;
      const rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
      nodes.forEach(p => {
        const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy);
        if (d < 150 && d > 0) { p.vx += (dx / d) * 0.5; p.vy += (dy / d) * 0.5; }
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      nodes.forEach((p, i) => {
        if (prefersMotion && initialized) {
          p.vx = Math.max(-0.3, Math.min(0.3, p.vx));
          p.vy = Math.max(-0.3, Math.min(0.3, p.vy));
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } else if (p.x > width) { p.x = width; p.vx = -Math.abs(p.vx); }
          if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } else if (p.y > height) { p.y = height; p.vy = -Math.abs(p.vy); }
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const p2 = nodes[j], d = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - d / 120) * 0.25})`;
            ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
      });
      if (prefersMotion) frameId = requestAnimationFrame(draw);
    };

    if (prefersMotion) draw();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
};

export default NeuralBackground;
