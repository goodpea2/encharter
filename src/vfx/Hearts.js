import { drawHeart } from '../utils/rendering.js';

export function drawHearts(ctx, now, width, height, vfx, vfxAlpha) {
    const dur = 700; vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    const p = vfx.progress; const easeOut = 1 - Math.pow(1 - p, 4);
    
    const hCount = vfx.type === 'heart1' ? 8 : vfx.type === 'heart2' ? 16 : 32;
    ctx.globalAlpha = (1 - p) * vfxAlpha;
    for (let i = 0; i < hCount; i++) {
        const angle = (i / hCount) * Math.PI * 2; const dist = easeOut * (vfx.type === 'heart3' ? 400 : 200);
        const hx = width/2 + Math.cos(angle) * dist + Math.sin(now * 0.005 + i) * 20;
        const hy = height * 0.8 - (p * height) + Math.sin(angle) * 50;
        const hSize = (1 - p) * 15 + 5; ctx.fillStyle = i % 2 === 0 ? '#ff0044' : '#ff71ce';
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle; drawHeart(ctx, hx, hy, hSize);
    }
}
