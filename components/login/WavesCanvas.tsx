"use client";

import { useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import s from "./login.module.css";

const GAP = 26;
const SIGMA = 22;

export type WavesHandle = { pulse: () => void };
type Dot = { x: number; y: number };
type Ripple = { x: number; y: number; t0: number; v: number; amp: number; max: number };

/**
 * Ondas de antena EAS sobre el banner: iluminan una malla de puntos.
 * El cursor y los clics sobre `targetRef` generan ondas propias.
 * Expone `pulse()` para lanzar una ráfaga (por ejemplo, al ingresar con éxito).
 */
export default function WavesCanvas({ targetRef, ref }: { targetRef: RefObject<HTMLElement | null>; ref?: RefObject<WavesHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef<() => void>(() => {});

  useImperativeHandle(ref, () => ({ pulse: () => pulseRef.current() }), []);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const target: HTMLElement = targetRef.current ?? cv;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0, H = 0, AX = 0, AY = 0, wide = true;
    let dots: Dot[] = [], ripples: Ripple[] = [], raf = 0, lastAmbient = 0, lastPointer = 0;

    const emit = (now: number, x: number, y: number, amp: number, v: number, delay = 0) => {
      ripples.push({ x, y, t0: now + delay, v, amp, max: Math.hypot(W, H) * 0.75 });
      if (ripples.length > 14) ripples.shift();
    };

    function render(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ripples = ripples.filter((rp) => (now - rp.t0) * rp.v < rp.max);
      for (const d of dots) {
        let e = 0;
        for (const rp of ripples) {
          const r = (now - rp.t0) * rp.v;
          if (r < 0) continue;
          const delta = Math.hypot(d.x - rp.x, d.y - rp.y) - r;
          if (delta > SIGMA * 3 || delta < -SIGMA * 3) continue;
          e += rp.amp * (1 - r / rp.max) * Math.exp(-(delta * delta) / (2 * SIGMA * SIGMA));
        }
        e = Math.min(e, 1);
        const mask = wide ? Math.max(0, Math.min(1, (d.y / H - 0.6) / 0.3)) : 0;
        const a = (0.1 + 0.8 * e) * (1 - 0.75 * mask);
        ctx.fillStyle = `rgba(238,222,246,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.3 + 2 * e, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      for (const rp of ripples) {
        const r = (now - rp.t0) * rp.v;
        if (r <= 0) continue;
        ctx.strokeStyle = `rgba(195,155,211,${(0.2 * (1 - r / rp.max)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function staticFrame() {
      const now = performance.now();
      ripples = [];
      emit(now, AX, AY, 0.9, 0.17, -1800);
      emit(now, AX, AY, 0.7, 0.17, -4200);
      render(now);
    }

    function resize() {
      if (!cv || !ctx) return;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      wide = W > 700 && H > 400;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      AX = W * 0.5;
      AY = H * (wide ? 0.52 : 0.5);
      dots = [];
      const rows = Math.ceil(H / GAP) + 1;
      const cols = Math.ceil(W / GAP) + 1;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) dots.push({ x: i * GAP + (j % 2 ? GAP / 2 : 0), y: j * GAP });
      if (reduce.matches) staticFrame();
    }

    function frame(now: number) {
      if (now - lastAmbient > 2600) {
        emit(now, AX, AY, 0.9, 0.17);
        lastAmbient = now;
      }
      render(now);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduce.matches) staticFrame();
      else raf = requestAnimationFrame(frame);
    }

    const pointerWave = (ev: PointerEvent, amp: number, v: number) => {
      if (reduce.matches || !cv) return;
      const r = cv.getBoundingClientRect();
      emit(performance.now(), ev.clientX - r.left, ev.clientY - r.top, amp, v);
    };
    const onMove = (ev: Event) => {
      const n = performance.now();
      if (n - lastPointer < 180) return;
      lastPointer = n;
      pointerWave(ev as PointerEvent, 0.55, 0.15);
    };
    const onDown = (ev: Event) => pointerWave(ev as PointerEvent, 0.95, 0.2);
    // Pausa la animación cuando la pestaña no está visible.
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const onReduceChange = () => { resize(); start(); };

    pulseRef.current = () => {
      if (reduce.matches) return;
      const now = performance.now();
      emit(now, AX, AY, 1.2, 0.3, 0);
      emit(now, AX, AY, 1.0, 0.3, 180);
      emit(now, AX, AY, 0.8, 0.3, 360);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerdown", onDown);
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onReduceChange);
    resize();
    start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onReduceChange);
      pulseRef.current = () => {};
    };
  }, [targetRef]);

  return <canvas className={s.waves} ref={canvasRef} />;
}
