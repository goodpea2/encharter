export function drawConfetti(ctx, now, width, height, vfxType, vfxAlpha) {
    const cCount = vfxType === 'confetti1' ? 40 : vfxType === 'confetti2' ? 80 : 160;
    const colors = ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'];
    for (let i = 0; i < cCount; i++) {
        const t = (now * 0.0004 + i * 0.13) % 1;
        const x = ((Math.sin(i * 99) + 1) / 2) * width + Math.sin(now * 0.001 + i) * 20;
        const y = t * height;
        const rotate = now * 0.01 + i; const flip = Math.sin(now * 0.008 + i);
        ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.9 * vfxAlpha;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.scale(1, flip); ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    }
}
