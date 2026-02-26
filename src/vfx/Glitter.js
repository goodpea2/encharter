export function drawGlitter(ctx, now, width, height, vfx, vfxAlpha) {
    const dur = 700; vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    const p = vfx.progress;
    
    const glCount = vfx.type === 'glitter1' ? 40 : vfx.type === 'glitter2' ? 80 : 150;
    for (let i = 0; i < glCount; i++) {
        const seed = i + (vfx.randomSeed * 500); const gx = ((Math.sin(seed) + 1)/2) * width;
        const gy = ((Math.cos(seed * 0.7) + 1)/2) * height;
        const gAlpha = (1 - p) * ((Math.sin(now * 0.02 + i) + 1)/2);
        ctx.globalAlpha = gAlpha * vfxAlpha; ctx.fillStyle = "#fff"; ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
        ctx.beginPath(); ctx.arc(gx, gy, Math.random() * 3 + 1, 0, Math.PI * 2); ctx.fill();
    }
}
