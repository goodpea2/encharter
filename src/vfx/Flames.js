export function drawFlames(ctx, now, width, height, vfxType, vfxAlpha) {
    const fCount = vfxType === 'flames1' ? 60 : vfxType === 'flames2' ? 120 : 250;
    for (let i = 0; i < fCount; i++) {
        const t = (now * 0.001 + i * (1/fCount) * 10) % 1;
        const x = (Math.sin(i * 555) * 0.45 + 0.5) * width + Math.sin(now * 0.002 + i) * 30;
        const y = height * (1 - t);
        const size = (1 - t) * (vfxType === 'flames1' ? 15 : 25);
        const alpha = (1 - t) * 0.6 * vfxAlpha;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); grad.addColorStop(0.2, `rgba(255, 220, 0, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`); grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }
}
