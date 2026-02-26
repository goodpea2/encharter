export function drawWipes(ctx, now, width, height, vfx, vfxAlpha) {
    const dur = 700; vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    const p = vfx.progress; const easeOut = 1 - Math.pow(1 - p, 4);

    ctx.fillStyle = `rgba(255, 255, 255, ${(1-p)*0.4 * vfxAlpha})`;
    if (vfx.type === 'wipeDown') {
        ctx.fillRect(0, 0, width, height * easeOut);
    } else if (vfx.type === 'wipeUp') {
        ctx.fillRect(0, height * (1 - easeOut), width, height);
    }
}
