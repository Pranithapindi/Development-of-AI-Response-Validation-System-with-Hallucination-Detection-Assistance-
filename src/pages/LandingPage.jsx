import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL CSS & ULTRA-PREMIUM AESTHETICS
══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root {
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    color: #fff;
    background: #02000a;
    overflow-x: hidden;
    position: relative;
    user-select: none;
  }

  /* ── Deep Cyber Grid ── */
  .lp-grid {
    position: fixed; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(124, 58, 237, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124, 58, 237, 0.07) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 100%);
    pointer-events: none;
  }

  /* ── Interactive Cursor Spotlight ── */
  .lp-spotlight {
    position: fixed; inset: 0; z-index: 1;
    background: radial-gradient(750px circle at var(--mx,50%) var(--my,50%),
      rgba(139,92,246,0.12) 0%, rgba(56,189,248,0.04) 40%, transparent 75%);
    pointer-events: none;
  }

  /* ── Gradient Orbs ── */
  .lp-orb {
    position: fixed; border-radius: 50%;
    filter: blur(100px); pointer-events: none; z-index: 0;
    animation: orbDrift var(--dur, 14s) ease-in-out var(--delay, 0s) infinite alternate;
  }
  @keyframes orbDrift {
    0%   { transform: translate(0,0) scale(1); }
    50%  { transform: translate(var(--tx,40px), var(--ty,-50px)) scale(1.2); }
    100% { transform: translate(var(--tx2,-30px), var(--ty2,40px)) scale(0.85); }
  }

  /* ── Navbar ── */
  .lp-nav {
    position: relative; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 52px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    backdrop-filter: blur(28px);
    background: rgba(2,0,10,0.7);
  }
  .lp-nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; cursor: pointer; }
  .lp-nav-logo-icon {
    width: 38px; height: 38px; border-radius: 12px;
    background: linear-gradient(135deg,#8b5cf6,#06b6d4);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem;
    box-shadow: 0 0 25px rgba(139,92,246,0.6);
    animation: logoPulse 3.5s ease-in-out infinite;
  }
  @keyframes logoPulse {
    0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.5); }
    50%     { box-shadow: 0 0 40px rgba(139,92,246,0.85), 0 0 60px rgba(6,182,212,0.4); }
  }
  .lp-nav-brand { font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:1.1rem; letter-spacing: -0.02em; }
  .lp-nav-links { display: flex; gap: 6px; }
  .lp-nav-link {
    background: none; border: none; color: rgba(255,255,255,0.55);
    font-size: 0.88rem; font-weight: 500; cursor: pointer;
    padding: 8px 16px; border-radius: 10px;
    transition: all 0.2s; font-family: 'Inter', sans-serif;
  }
  .lp-nav-link:hover { color: #fff; background: rgba(139,92,246,0.14); }
  .lp-nav-cta {
    background: linear-gradient(135deg,#7c3aed,#2563eb);
    border: none; color: #fff; font-size: 0.88rem;
    font-weight: 600; cursor: pointer; padding: 10px 22px;
    border-radius: 12px; font-family: 'Inter', sans-serif;
    transition: all 0.25s;
    box-shadow: 0 4px 20px rgba(124,58,237,0.4);
    display: flex; align-items: center; gap: 8px;
  }
  .lp-nav-cta:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 8px 30px rgba(124,58,237,0.7);
  }
  .lp-nav-auth-group { display: flex; align-items: center; gap: 10px; }
  .lp-nav-btn-login {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.14);
    color: #e2e8f0;
    font-size: 0.86rem; font-weight: 600; cursor: pointer;
    padding: 8px 18px; border-radius: 11px;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .lp-nav-btn-login:hover {
    background: rgba(139,92,246,0.22);
    border-color: rgba(139,92,246,0.6);
    color: #fff;
  }
  .lp-nav-btn-register {
    background: rgba(6,182,212,0.12);
    border: 1px solid rgba(6,182,212,0.4);
    color: #67e8f9;
    font-size: 0.86rem; font-weight: 600; cursor: pointer;
    padding: 8px 18px; border-radius: 11px;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .lp-nav-btn-register:hover {
    background: rgba(6,182,212,0.28);
    border-color: rgba(6,182,212,0.7);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(6,182,212,0.25);
  }
  .lp-nav-user-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.4);
    border-radius: 30px; padding: 5px 14px 5px 6px;
    font-size: 0.82rem; color: #fff; font-weight: 500;
  }

  /* ── Hero ── */
  .lp-hero {
    position: relative; z-index: 5;
    display: grid; grid-template-columns: 1.05fr 1fr;
    align-items: center; gap: 48px;
    max-width: 1360px; margin: 0 auto;
    padding: 70px 48px 50px;
  }
  @media (max-width:1024px) {
    .lp-hero { grid-template-columns: 1fr; padding: 50px 24px; gap: 40px; }
    .lp-hero-visual-wrap { height: 480px; }
  }

  /* Eyebrow badge */
  .lp-eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    background: rgba(139,92,246,0.12);
    border: 1px solid rgba(139,92,246,0.45);
    border-radius: 40px; padding: 6px 18px;
    margin-bottom: 24px;
    box-shadow: 0 0 20px rgba(139,92,246,0.2);
  }
  .lp-eyebrow-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #06b6d4;
    box-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
    animation: dotPulse 2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.8); }
  }
  .lp-eyebrow-text { font-size: 0.75rem; font-weight: 700; color: #e0e7ff; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }

  /* Title */
  .lp-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(2.6rem, 5vw, 4.1rem);
    font-weight: 800; line-height: 1.06;
    letter-spacing: -0.04em;
    margin-bottom: 8px;
  }
  .lp-title-gradient {
    background: linear-gradient(135deg, #c084fc 0%, #60a5fa 50%, #2dd4bf 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleShimmer 6s linear infinite;
  }
  @keyframes titleShimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }

  .lp-subtitle {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(1.1rem, 2vw, 1.45rem);
    font-weight: 600; color: rgba(255,255,255,0.6);
    margin-bottom: 20px; letter-spacing: -0.01em;
  }
  .lp-desc {
    font-size: 0.98rem; color: rgba(255,255,255,0.48);
    line-height: 1.75; max-width: 520px; margin-bottom: 34px;
  }

  /* Feature pills */
  .lp-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 38px; }
  .lp-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 40px; padding: 7px 15px;
    font-size: 0.82rem; color: rgba(255,255,255,0.75); font-weight: 500;
    transition: all 0.25s; cursor: default;
  }
  .lp-pill:hover {
    background: rgba(139,92,246,0.18);
    border-color: rgba(139,92,246,0.6);
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(139,92,246,0.25);
  }
  .lp-pill-dot { width:7px; height:7px; border-radius:50%; }

  /* CTA Buttons */
  .lp-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-btn-primary {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg,#7c3aed 0%,#3b82f6 100%);
    border: none; color: #fff; font-size: 1.02rem; font-weight: 700;
    cursor: pointer; padding: 16px 36px;
    border-radius: 14px; font-family: 'Inter', sans-serif;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 6px 28px rgba(124,58,237,0.5);
    display: flex; align-items: center; gap: 10px;
  }
  .lp-btn-primary::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.25), transparent);
    opacity: 0; transition: opacity 0.3s;
  }
  .lp-btn-primary:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 12px 45px rgba(124,58,237,0.75), 0 0 20px rgba(59,130,246,0.5);
  }
  .lp-btn-primary:hover::before { opacity: 1; }
  .lp-btn-primary:active { transform: scale(0.98); }

  .lp-btn-secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.85);
    font-size: 1.02rem; font-weight: 600;
    cursor: pointer; padding: 16px 34px;
    border-radius: 14px; font-family: 'Inter', sans-serif;
    backdrop-filter: blur(14px);
    transition: all 0.25s;
    display: flex; align-items: center; gap: 8px;
  }
  .lp-btn-secondary:hover {
    background: rgba(139,92,246,0.16);
    border-color: rgba(139,92,246,0.6);
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139,92,246,0.2);
  }

  /* ── 3D Visual Container ── */
  .lp-hero-visual-wrap {
    position: relative;
    width: 100%;
    height: 560px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lp-canvas-3d {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    cursor: grab;
  }
  .lp-canvas-3d:active { cursor: grabbing; }

  /* 3D Glass HUD Overlay Overlaying 3D scene */
  .lp-hud-overlay {
    position: absolute; inset: 0; pointer-events: none; z-index: 10;
  }

  .lp-hud-chip {
    position: absolute;
    background: rgba(10, 4, 30, 0.75);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(139, 92, 246, 0.35);
    padding: 8px 14px;
    border-radius: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: #c4b5fd;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    animation: floatHud 5s ease-in-out infinite alternate;
  }
  @keyframes floatHud {
    0% { transform: translateY(0px); }
    100% { transform: translateY(-8px); }
  }

  .lp-badge-3d {
    position: absolute; z-index: 20;
    display: flex; align-items: center; gap: 10px;
    background: rgba(8, 3, 26, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px; padding: 10px 16px;
    backdrop-filter: blur(24px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(139,92,246,0.25);
    transition: transform 0.3s ease, border-color 0.3s ease;
    pointer-events: auto;
    cursor: pointer;
  }
  .lp-badge-3d:hover {
    transform: scale(1.08) translateY(-4px);
    border-color: rgba(139,92,246,0.7);
  }
  .lp-badge-icon {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; flex-shrink: 0; font-weight: 700;
  }
  .lp-badge-score { font-size: 1.1rem; font-weight: 800; font-family: 'Space Grotesk', sans-serif; }
  .lp-badge-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }

  /* 3D Interactive Controls Helper */
  .lp-3d-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 7, 40, 0.7);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 30px;
    padding: 5px 14px;
    font-size: 0.68rem;
    color: rgba(196, 181, 253, 0.8);
    display: flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace;
    pointer-events: none;
    z-index: 15;
  }
  .lp-3d-hint-dot { width: 5px; height: 5px; border-radius: 50%; background: #06b6d4; animation: dotPulse 1.5s infinite; }

  /* ── Stats section ── */
  .lp-stats {
    position: relative; z-index: 5;
    max-width: 1360px; margin: 0 auto;
    padding: 20px 48px 70px;
    display: grid; grid-template-columns: repeat(4,1fr); gap: 22px;
  }
  @media (max-width: 860px) {
    .lp-stats { grid-template-columns: repeat(2,1fr); }
  }
  .lp-stat-card {
    position: relative; overflow: hidden;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px; padding: 30px;
    text-align: center;
    transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
    cursor: default;
  }
  .lp-stat-card::before {
    content:''; position:absolute; inset:0; border-radius: 22px;
    background: radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%);
    opacity: 0; transition: opacity 0.3s;
  }
  .lp-stat-card:hover {
    border-color: rgba(139,92,246,0.5);
    transform: translateY(-6px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.5), 0 0 25px rgba(139,92,246,0.2);
  }
  .lp-stat-card:hover::before { opacity: 1; }
  .lp-stat-top { height: 3px; position: absolute; top:0; left:0; right:0; }
  .lp-stat-icon { font-size: 1.8rem; margin-bottom: 12px; }
  .lp-stat-value { font-family:'Space Grotesk',sans-serif; font-size:2.6rem; font-weight:800; line-height:1; margin-bottom:8px; }
  .lp-stat-label { font-size:0.78rem; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; }

  /* ── Marquee / Ticker ── */
  .lp-marquee-wrap {
    position: relative; z-index:5;
    overflow: hidden;
    padding: 22px 0;
    margin-bottom: 80px;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.015);
  }
  .lp-marquee-wrap::before, .lp-marquee-wrap::after {
    content: ''; position:absolute; top:0; bottom:0; width:150px; z-index:2; pointer-events:none;
  }
  .lp-marquee-wrap::before { left:0; background:linear-gradient(90deg,#02000a,transparent); }
  .lp-marquee-wrap::after  { right:0; background:linear-gradient(-90deg,#02000a,transparent); }
  .lp-marquee-track {
    display: flex; gap: 46px; width: max-content;
    animation: marquee 30s linear infinite;
  }
  @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .lp-marquee-item {
    display: flex; align-items: center; gap: 12px;
    font-size: 0.85rem; font-weight: 600;
    color: rgba(255,255,255,0.4);
    white-space: nowrap;
  }

  /* ── Feature cards with 3D Tilt ── */
  .lp-features {
    position: relative; z-index:5;
    max-width:1360px; margin:0 auto;
    padding: 0 48px 90px;
  }
  .lp-section-header { text-align:center; margin-bottom:56px; }
  .lp-section-eyebrow { font-size:0.75rem; font-weight:700; color:#a855f7; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:12px; font-family:'JetBrains Mono', monospace; }
  .lp-section-title { font-family:'Space Grotesk',sans-serif; font-size:clamp(1.8rem,3.2vw,2.4rem); font-weight:800; letter-spacing:-0.03em; margin-bottom:14px; }
  .lp-section-desc { font-size:0.95rem; color:rgba(255,255,255,0.42); max-width:540px; margin:0 auto; line-height:1.75; }

  .lp-feature-grid { display:grid; grid-template-columns: repeat(3,1fr); gap:24px; }
  @media (max-width: 900px) {
    .lp-feature-grid { grid-template-columns: 1fr; }
  }
  .lp-feature-card {
    position:relative; overflow:hidden;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius:22px; padding:32px;
    transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
    cursor: pointer;
    transform-style: preserve-3d;
  }
  .lp-feature-card:hover {
    border-color: rgba(139,92,246,0.45);
    background: rgba(139,92,246,0.07);
    box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.25);
  }
  .lp-feature-icon-wrap {
    width:52px; height:52px; border-radius:16px;
    display:flex; align-items:center; justify-content:center;
    font-size:1.6rem; margin-bottom:20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .lp-feature-title { font-family:'Space Grotesk',sans-serif; font-size:1.1rem; font-weight:700; margin-bottom:10px; }
  .lp-feature-desc { font-size:0.86rem; color:rgba(255,255,255,0.45); line-height:1.7; }
  .lp-feature-arrow { position:absolute; right:24px; bottom:24px; font-size:1.1rem; color:rgba(255,255,255,0.25); transition: all 0.25s; }
  .lp-feature-card:hover .lp-feature-arrow { color:#c084fc; transform: translate(4px,-4px); }

  /* ── Pipeline ── */
  .lp-pipeline {
    position:relative; z-index:5;
    max-width:1360px; margin:0 auto;
    padding: 0 48px 90px;
  }
  .lp-pipe-track {
    display:flex; align-items:stretch; gap:0; margin-top:54px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px; overflow:hidden;
  }
  @media (max-width: 860px) {
    .lp-pipe-track { flex-direction: column; }
  }
  .lp-pipe-step {
    flex:1; padding:32px 24px; text-align:center;
    position:relative; transition:all 0.3s; cursor:pointer;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .lp-pipe-step:last-child { border-right:none; }
  .lp-pipe-step::after {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background: var(--c, #6366f1);
    transform:scaleX(0); transition: transform 0.3s; transform-origin:left;
  }
  .lp-pipe-step:hover::after { transform:scaleX(1); }
  .lp-pipe-step:hover { background: rgba(139,92,246,0.07); }
  .lp-pipe-num { font-size:0.68rem; font-weight:800; color:rgba(255,255,255,0.25); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:14px; font-family:'JetBrains Mono', monospace; }
  .lp-pipe-icon { font-size:2.2rem; margin-bottom:14px; }
  .lp-pipe-label { font-family:'Space Grotesk',sans-serif; font-size:0.95rem; font-weight:700; margin-bottom:8px; }
  .lp-pipe-sub { font-size:0.75rem; color:rgba(255,255,255,0.38); }

  /* ── Footer ── */
  .lp-footer {
    position:relative; z-index:5;
    border-top:1px solid rgba(255,255,255,0.06);
    padding:32px 52px;
    display:flex; align-items:center; justify-content:space-between; gap:24px;
    background: rgba(0,0,0,0.5); backdrop-filter:blur(24px);
    flex-wrap:wrap;
  }
  .lp-footer-brand { font-family:'Space Grotesk',sans-serif; font-size:0.9rem; font-weight:600; color:rgba(255,255,255,0.5); }
  .lp-footer-tags { display:flex; gap:10px; flex-wrap:wrap; }
  .lp-footer-tag { font-size:0.74rem; padding:5px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.09); color:rgba(255,255,255,0.4); font-family:'JetBrains Mono', monospace; }
  .lp-footer-btn {
    background:linear-gradient(135deg,rgba(124,58,237,0.3),rgba(37,99,235,0.3));
    border:1px solid rgba(139,92,246,0.4); color:#c4b5fd;
    font-size:0.86rem; font-weight:600; cursor:pointer; padding:10px 22px;
    border-radius:12px; font-family:'Inter',sans-serif; transition:all 0.2s;
  }
  .lp-footer-btn:hover {
    background:linear-gradient(135deg,rgba(124,58,237,0.6),rgba(37,99,235,0.6));
    border-color:rgba(139,92,246,0.8); color:#fff;
    box-shadow: 0 4px 20px rgba(124,58,237,0.4);
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   3D NEURAL CORE ENGINE (THREE.JS WEBGL CANVAS)
══════════════════════════════════════════════════════════════════════════ */
function ThreeDNeuralCore() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02000a, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'lp-canvas-3d';

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 4, 25);
    pointLightCyan.position.set(4, 3, 4);
    scene.add(pointLightCyan);

    const pointLightPurple = new THREE.PointLight(0xa855f7, 5, 25);
    pointLightPurple.position.set(-4, -3, 3);
    scene.add(pointLightPurple);

    // Group for entire interactive rotating neural sphere
    const neuralGroup = new THREE.Group();
    scene.add(neuralGroup);

    // 3. Central Morphing Geodesic Core (Icosahedron Wireframe + Inner Glow)
    const coreGeo = new THREE.IcosahedronGeometry(1.65, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.6,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    neuralGroup.add(coreMesh);

    // Inner Quantum Energy Crystal
    const innerGeo = new THREE.OctahedronGeometry(0.9, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false,
    });
    const innerCrystal = new THREE.Mesh(innerGeo, innerMat);
    neuralGroup.add(innerCrystal);

    // 4. Orbital Rings (Gyroscopic 3D Rings)
    const ring1Geo = new THREE.TorusGeometry(2.55, 0.02, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    neuralGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.1, 0.015, 16, 140);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 5;
    neuralGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(3.6, 0.018, 16, 160);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.4 });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.y = Math.PI / 2.2;
    neuralGroup.add(ring3);

    // Orbiting Data Packets
    const packetGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const packet1 = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    const packet2 = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
    const packet3 = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: 0x34d399 }));
    neuralGroup.add(packet1);
    neuralGroup.add(packet2);
    neuralGroup.add(packet3);

    // 5. 3D Synaptic Cloud & Network Connections
    const nodeCount = 70;
    const nodePositions = [];
    const nodeSpeeds = [];

    for (let i = 0; i < nodeCount; i++) {
      // Distribute randomly in a spherical shell
      const r = 1.8 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      nodePositions.push(new THREE.Vector3(x, y, z));
      nodeSpeeds.push(new THREE.Vector3((Math.random() - 0.5) * 0.005, (Math.random() - 0.5) * 0.005, (Math.random() - 0.5) * 0.005));
    }

    // Glowing Node Points
    const pGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(nodeCount * 3);
    const colArr = new Float32Array(nodeCount * 3);

    const cCyan = new THREE.Color(0x38bdf8);
    const cViolet = new THREE.Color(0xa855f7);
    const cGreen = new THREE.Color(0x10b981);

    for (let i = 0; i < nodeCount; i++) {
      posArr[i * 3] = nodePositions[i].x;
      posArr[i * 3 + 1] = nodePositions[i].y;
      posArr[i * 3 + 2] = nodePositions[i].z;

      const chosenColor = i % 3 === 0 ? cCyan : i % 3 === 1 ? cViolet : cGreen;
      colArr[i * 3] = chosenColor.r;
      colArr[i * 3 + 1] = chosenColor.g;
      colArr[i * 3 + 2] = chosenColor.b;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const pointsMesh = new THREE.Points(pGeo, pMat);
    neuralGroup.add(pointsMesh);

    // Dynamic Synapse Connection Lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    const maxLineSegments = 120;
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(maxLineSegments * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    neuralGroup.add(linesMesh);

    // 6. Deep 3D Starfield / Cyber Dust
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 35;
      starPos[i + 1] = (Math.random() - 0.5) * 35;
      starPos[i + 2] = (Math.random() - 0.5) * 35;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.05, color: 0x818cf8, transparent: true, opacity: 0.65 });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // 7. Interactive Mouse / Drag Control
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let pulseScale = 1;

    const onMouseDown = e => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = e => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        targetRotY = nx * 0.45;
        targetRotX = -ny * 0.35;
      }
    };

    const onMouseUp = () => { isDragging = false; };

    const onClick = () => {
      pulseScale = 1.35; // shockwave pulse
    };

    window.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera / group rotation with lerp
      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;

      neuralGroup.rotation.x = currentRotX + Math.sin(elapsed * 0.5) * 0.08;
      neuralGroup.rotation.y = currentRotY + elapsed * 0.22;
      neuralGroup.rotation.z = Math.cos(elapsed * 0.3) * 0.06;

      // Inner crystal counter-rotation & pulsing
      innerCrystal.rotation.x -= 0.02;
      innerCrystal.rotation.y -= 0.03;
      const s = 1 + Math.sin(elapsed * 4) * 0.12;
      innerCrystal.scale.set(s, s, s);

      // Pulse decay
      if (pulseScale > 1) {
        pulseScale -= 0.02;
        if (pulseScale < 1) pulseScale = 1;
      }
      coreMesh.scale.set(pulseScale, pulseScale, pulseScale);

      // Orbital packet positions along mathematical tracks
      const t1 = elapsed * 1.8;
      packet1.position.set(2.55 * Math.cos(t1), 2.55 * Math.sin(t1) * Math.sin(Math.PI / 3), 2.55 * Math.sin(t1) * Math.cos(Math.PI / 3));

      const t2 = -elapsed * 1.4;
      packet2.position.set(3.1 * Math.cos(t2) * Math.cos(Math.PI / 4), 3.1 * Math.sin(t2), 3.1 * Math.cos(t2) * Math.sin(Math.PI / 4));

      const t3 = elapsed * 2.2;
      packet3.position.set(3.6 * Math.sin(t3) * Math.cos(Math.PI / 2.2), 3.6 * Math.cos(t3), 3.6 * Math.sin(t3) * Math.sin(Math.PI / 2.2));

      // Update Node positions & Dynamic Synaptic connections
      let lineIdx = 0;
      const positions = pGeo.attributes.position.array;

      for (let i = 0; i < nodeCount; i++) {
        nodePositions[i].add(nodeSpeeds[i]);
        if (nodePositions[i].length() > 3.4 || nodePositions[i].length() < 1.7) {
          nodeSpeeds[i].negate();
        }
        positions[i * 3] = nodePositions[i].x;
        positions[i * 3 + 1] = nodePositions[i].y;
        positions[i * 3 + 2] = nodePositions[i].z;

        // Build connection lines to nearby nodes
        if (lineIdx < maxLineSegments) {
          for (let j = i + 1; j < nodeCount; j++) {
            const dist = nodePositions[i].distanceTo(nodePositions[j]);
            if (dist < 1.15 && lineIdx < maxLineSegments) {
              linePositions[lineIdx * 6] = nodePositions[i].x;
              linePositions[lineIdx * 6 + 1] = nodePositions[i].y;
              linePositions[lineIdx * 6 + 2] = nodePositions[i].z;
              linePositions[lineIdx * 6 + 3] = nodePositions[j].x;
              linePositions[lineIdx * 6 + 4] = nodePositions[j].y;
              linePositions[lineIdx * 6 + 5] = nodePositions[j].z;
              lineIdx++;
            }
          }
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, lineIdx * 2);

      // Starfield subtle drift
      starMesh.rotation.y = elapsed * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);

      // Clean up Three.js resources
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      ring3Geo.dispose();
      pGeo.dispose();
      pMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="lp-canvas-3d" />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PARTICLE CANVAS (BACKGROUND AMBIENCE)
══════════════════════════════════════════════════════════════════════════ */
function AmbientCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let id;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.4 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.fillStyle = `rgba(139,92,246,${p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════════════════════════════════════ */
function Counter({ target, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPEWRITER
══════════════════════════════════════════════════════════════════════════ */
function Typewriter({ words, speed = 80, pause = 2200 }) {
  const [text, setText] = useState('');
  const [wIdx, setWIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wIdx % words.length];
    let t;
    if (!deleting && text === word) {
      t = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === '') {
      setDeleting(false);
      setWIdx(i => i + 1);
    } else {
      t = setTimeout(() => {
        setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
      }, deleting ? speed / 2 : speed);
    }
    return () => clearTimeout(t);
  }, [text, deleting, wIdx, words, speed, pause]);
  return (
    <>
      {text}
      <span style={{ display: 'inline-block', width: '2px', height: '1em', background: '#06b6d4', marginLeft: '3px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
      <style>{`@keyframes blink { 0%,100%{ opacity:1; } 50%{ opacity:0; } }`}</style>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage({ onEnter, currentUser, onOpenAuth, onLogout }) {
  // Cursor spotlight
  useEffect(() => {
    const move = e => {
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  const nav = [
    { label: 'Platform',      page: 'dashboard' },
    { label: 'Architecture',  page: 'architecture' },
    { label: 'Documentation', page: 'documentation' },
    { label: 'Research',      page: 'about' },
  ];

  const pills = [
    { dot: '#10b981', text: 'Claim Extraction' },
    { dot: '#f59e0b', text: 'Hallucination Detection' },
    { dot: '#6366f1', text: 'Multi-Agent Scoring' },
    { dot: '#a855f7', text: 'PDF Export' },
    { dot: '#ec4899', text: 'Batch Evaluation' },
    { dot: '#06b6d4', text: 'ChromaDB Grounding' },
  ];

  const stats = [
    { icon: '🧠', val: 5,   suffix: '',   label: 'Judge Agents',        grad: 'linear-gradient(90deg,#a855f7,#6366f1)' },
    { icon: '✅', val: 70,  suffix: '+',  label: 'E2E Tests Passed',    grad: 'linear-gradient(90deg,#10b981,#06b6d4)' },
    { icon: '🎯', val: 100, suffix: '%',  label: 'Test Pass Rate',      grad: 'linear-gradient(90deg,#f59e0b,#ef4444)' },
    { icon: '🤖', val: 2,   suffix: '',   label: 'AI Systems Evaluated',grad: 'linear-gradient(90deg,#ec4899,#8b5cf6)' },
  ];

  const features = [
    { icon: '🔬', bg: 'rgba(99,102,241,0.15)', color: '#818cf8', title: 'Claim-Level Analysis', desc: 'Each AI response is segmented into individual claims and verified against the reference knowledge base.', page: 'validate' },
    { icon: '🧬', bg: 'rgba(139,92,246,0.15)', color: '#a855f7', title: 'Hallucination Detection', desc: 'Named-entity mismatch, negation logic, and numerical conflict detection catch subtle hallucinations.', page: 'batch' },
    { icon: '📊', bg: 'rgba(236,72,153,0.15)', color: '#ec4899', title: 'Multi-Dimension Scoring', desc: 'Five judge agents score Accuracy, Completeness, Relevance, Coherence, and Hallucination independently.', page: 'evaldash' },
    { icon: '⚡', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', title: 'Semantic Grounding', desc: 'SentenceTransformers + ChromaDB provide deep semantic vector search for accurate evidence retrieval.', page: 'architecture' },
    { icon: '📄', bg: 'rgba(16,185,129,0.15)', color: '#10b981', title: 'PDF Report Export', desc: 'Generate structured PDF evaluation reports with dimension breakdowns, flagged claims, and recommendations.', page: 'documentation' },
    { icon: '🎯', bg: 'rgba(6,182,212,0.15)', color: '#06b6d4', title: 'Evaluation Dashboard', desc: 'Real-time analytics dashboard with pass/fail trends, hallucination frequency, and quality distribution charts.', page: 'evaldash' },
  ];

  const pipeline = [
    { icon: '📝', label: 'Input',             sub: 'Query + AI Response', color: '#6366f1', page: 'validate' },
    { icon: '✂️', label: 'Claim Extraction', sub: 'NLP Segmentation',     color: '#8b5cf6', page: 'walkthrough' },
    { icon: '🔬', label: 'Judge Ensemble',   sub: '5 Specialized Agents', color: '#a855f7', page: 'batch' },
    { icon: '📈', label: 'Aggregation',       sub: 'Weighted Scoring',     color: '#c026d3', page: 'evaldash' },
    { icon: '📄', label: 'Report',            sub: 'PDF + Dashboard',      color: '#db2777', page: 'documentation' },
  ];

  const marqueeItems = [
    '🧠 Accuracy Judge', '🔍 Hallucination Judge', '📋 Completeness Judge',
    '🎯 Relevance Judge', '✨ Coherence Judge', '📊 Score Aggregator',
    '🗄️ ChromaDB Vector Store', '🤖 SentenceTransformers', '⚡ FastAPI Microservice',
    '⚛️ React 19 Frontend', '📄 ReportLab PDF Generator', '🔒 Claim Verification Engine',
  ];

  const badges = [
    { label: 'Accuracy',  score: '94%', icon: '✓', bg: 'rgba(16,185,129,0.2)',  color: '#10b981', top: '12%',  left: '-6%', page: 'validate' },
    { label: 'Hallucination', score: 'LOW', icon: '⚠', bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', top: '10%',  right: '-6%', page: 'batch' },
    { label: 'Completeness', score: '89%', icon: '◉', bg: 'rgba(99,102,241,0.2)',  color: '#6366f1', bottom: '15%', left: '-8%', page: 'evaldash' },
    { label: 'Relevance', score: '96%', icon: '◎', bg: 'rgba(6,182,212,0.2)', color: '#06b6d4', bottom: '14%', right: '-8%', page: 'architecture' },
  ];

  return (
    <div className="lp-root">
      <style>{STYLES}</style>

      {/* Ambient background layers */}
      <div className="lp-grid" />
      <div className="lp-spotlight" />
      <AmbientCanvas />

      {/* Deep gradient orbs */}
      <div className="lp-orb" style={{ width:'750px', height:'750px', top:'-18%', left:'-14%', background:'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)', '--dur':'15s', '--tx':'50px','--ty':'-40px','--tx2':'-30px','--ty2':'45px' }} />
      <div className="lp-orb" style={{ width:'650px', height:'650px', bottom:'-12%', right:'-12%', background:'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)', '--dur':'12s', '--delay':'1.5s','--tx':'-40px','--ty':'50px','--tx2':'30px','--ty2':'-40px' }} />
      <div className="lp-orb" style={{ width:'450px', height:'450px', top:'35%', left:'25%', background:'radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)', '--dur':'20s', '--delay':'3s','--tx':'60px','--ty':'-25px','--tx2':'-50px','--ty2':'30px' }} />

      {/* ── NAVBAR ────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-logo" onClick={() => onEnter('dashboard')}>
          <div className="lp-nav-logo-icon">⚡</div>
          <span className="lp-nav-brand">AI<span style={{ color: '#06b6d4' }}>Validator</span></span>
        </div>
        <div className="lp-nav-links">
          {nav.map(({ label, page }) => (
            <button key={label} className="lp-nav-link" onClick={() => onEnter(page)}>{label}</button>
          ))}
        </div>
        
        {/* Auth & Launch Group */}
        <div className="lp-nav-auth-group">
          {currentUser ? (
            <>
              <div className="lp-nav-user-pill">
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: currentUser.color || '#8b5cf6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 'bold', color: '#fff'
                }}>
                  {currentUser.avatarInitials || 'AI'}
                </div>
                <span>{currentUser.name}</span>
              </div>
              <button className="lp-nav-btn-login" onClick={onLogout}>Sign Out</button>
              <button className="lp-nav-cta" onClick={() => onEnter('dashboard')}>
                <span>Platform</span>
                <span>→</span>
              </button>
            </>
          ) : (
            <>
              <button className="lp-nav-btn-login" onClick={() => onOpenAuth ? onOpenAuth('login') : onEnter('auth')}>
                Sign In
              </button>
              <button className="lp-nav-btn-register" onClick={() => onOpenAuth ? onOpenAuth('register') : onEnter('auth')}>
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────── */}
      <div className="lp-hero">
        {/* Left: Headline & Copy */}
        <div>
          <div className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            <span className="lp-eyebrow-text">AI Response Validation Platform</span>
          </div>

          <h1 className="lp-title">
            <span>Development of</span><br />
            <span className="lp-title-gradient">AI Response</span><br />
            <span>Validation System</span>
          </h1>

          <p className="lp-subtitle">
            with{' '}
            <span style={{ color: '#38bdf8' }}>
              <Typewriter words={['Hallucination Detection Assistance', 'Multi-Agent Judge Ensembles', 'Deep Semantic ChromaDB Grounding', 'Automated PDF Factuality Reports']} />
            </span>
          </p>

          <p className="lp-desc">
            An advanced, real-time validation pipeline with 5 specialized judge agents. Segment responses into individual claims, detect named-entity discrepancies, numerical contradictions, and ungrounded hallucinations with mathematical precision.
          </p>

          <div className="lp-pills">
            {pills.map(p => (
              <div key={p.text} className="lp-pill">
                <span className="lp-pill-dot" style={{ background: p.dot, boxShadow: `0 0 8px ${p.dot}` }} />
                {p.text}
              </div>
            ))}
          </div>

          <div className="lp-ctas">
            <button
              className="lp-btn-secondary"
              onClick={() => onOpenAuth ? onOpenAuth(currentUser ? 'login' : 'register') : onEnter('auth')}
            >
              <span>{currentUser ? `👤 ${currentUser.name}` : '🔐 Sign In / Register'}</span>
            </button>
            <button className="lp-btn-secondary" onClick={() => onEnter('documentation')}>
              <span>📖 Technical Docs</span>
            </button>
          </div>
        </div>

        {/* Right: 3D Holographic WebGL Neural Core */}
        <div className="lp-hero-visual-wrap">
          {/* Three.js Interactive 3D WebGL Canvas */}
          <ThreeDNeuralCore />

          {/* Holographic Status Chips */}
          <div className="lp-hud-overlay">
            <div className="lp-hud-chip" style={{ top: '6%', left: '20%' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span>JUDGE_ENSEMBLE: ONLINE [5/5]</span>
            </div>

            <div className="lp-hud-chip" style={{ bottom: '8%', right: '15%', animationDelay: '-2s' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
              <span>CHROMADB_LATENCY: 18ms</span>
            </div>
          </div>

          {/* Interactive 3D Status Badges */}
          {badges.map(b => (
            <div
              key={b.label}
              className="lp-badge-3d"
              style={{ top: b.top, left: b.left, right: b.right, bottom: b.bottom }}
              onClick={() => onEnter(b.page)}
            >
              <div className="lp-badge-icon" style={{ background: b.bg, color: b.color }}>
                {b.icon}
              </div>
              <div>
                <div className="lp-badge-score" style={{ color: b.color }}>{b.score}</div>
                <div className="lp-badge-label">{b.label}</div>
              </div>
            </div>
          ))}

          {/* Interactive Drag & Click Hint */}
          <div className="lp-3d-hint">
            <span className="lp-3d-hint-dot" />
            <span>Click & Drag to Rotate in 3D • Click for shockwave</span>
          </div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────── */}
      <div className="lp-stats">
        {stats.map(s => (
          <div key={s.label} className="lp-stat-card">
            <div className="lp-stat-top" style={{ background: s.grad }} />
            <div className="lp-stat-icon">{s.icon}</div>
            <div className="lp-stat-value" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <Counter target={s.val} suffix={s.suffix} />
            </div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MARQUEE ───────────────────────────────── */}
      <div className="lp-marquee-wrap">
        <div className="lp-marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <div key={i} className="lp-marquee-item">
              <span>{item}</span>
              <span style={{ color: '#06b6d4', opacity: 0.6 }}>✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES WITH 3D PERSPECTIVE TILT ──────────────── */}
      <div className="lp-features">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">Enterprise Capabilities</div>
          <h2 className="lp-section-title">Engineered for Zero Hallucinations</h2>
          <p className="lp-section-desc">A unified architecture for multi-dimensional factuality verification, claim-level truth grounding, and compliance-ready audit reports.</p>
        </div>
        <div className="lp-feature-grid">
          {features.map(f => (
            <div
              key={f.title}
              className="lp-feature-card"
              onClick={() => onEnter(f.page)}
            >
              <div className="lp-feature-icon-wrap" style={{ background: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <div className="lp-feature-title" style={{ color: '#fff' }}>{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
              <div className="lp-feature-arrow">↗</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PIPELINE ──────────────────────────────── */}
      <div className="lp-pipeline">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">Validation Lifecycle</div>
          <h2 className="lp-section-title">5-Stage AI Response Verification</h2>
          <p className="lp-section-desc">Every response undergoes rigorous claim decomposition, vector similarity comparison, and multi-agent consensus before final certification.</p>
        </div>
        <div className="lp-pipe-track">
          {pipeline.map((step, i) => (
            <div key={step.label} className="lp-pipe-step" style={{ '--c': step.color }} onClick={() => onEnter(step.page)}>
              <div className="lp-pipe-num">Phase 0{i + 1}</div>
              <div className="lp-pipe-icon">{step.icon}</div>
              <div className="lp-pipe-label">{step.label}</div>
              <div className="lp-pipe-sub">{step.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          🧠 AI Response Validation System
        </div>
        <div className="lp-footer-tags">
          {['Three.js WebGL', 'React 19', 'FastAPI', 'ChromaDB', 'SentenceTransformers', 'ReportLab'].map(t => (
            <span key={t} className="lp-footer-tag">{t}</span>
          ))}
        </div>
        <button className="lp-footer-btn" onClick={() => onEnter('dashboard')}>
          Launch Platform →
        </button>
      </footer>
    </div>
  );
}
