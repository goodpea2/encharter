export function drawLights(ctx, now, width, height, vfx, vfxAlpha) {
    const dur = 700; vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    const p = vfx.progress;
    
    const beams = 12; ctx.globalAlpha = (1 - p) * 0.5 * vfxAlpha;
    for (let i = 0; i < beams; i++) {
        const angle = (Math.PI / beams) * i + (p * 0.5);
        ctx.beginPath(); ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2 + Math.cos(angle) * width * 2, Math.sin(angle) * height);
        ctx.lineTo(width/2 + Math.cos(angle + 0.1) * width * 2, Math.sin(angle + 0.1) * height);
        ctx.fillStyle = '#fff'; ctx.fill();
    }
}
