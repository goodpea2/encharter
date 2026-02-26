export function drawSparkles(ctx, now, width, height, vfxType, vfxAlpha) {
    const density = vfxType === 'sparkle1' ? 20 : vfxType === 'sparkle2' ? 50 : 100;
    for (let i = 0; i < density; i++) {
        const seed = i * 1234.56;
        const x = ((Math.sin(seed) + 1) / 2) * width;
        const y = ((Math.cos(seed * 0.8) + 1) / 2) * height;
        const flicker = (Math.sin(now * 0.005 + seed) + 1) / 2;
        const size = (flicker * 3) + 1;
        ctx.globalAlpha = flicker * 0.8 * vfxAlpha;
        ctx.fillStyle = "#fff"; ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
        ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI * 2); ctx.fill();
    }
}
