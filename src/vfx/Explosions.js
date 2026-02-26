import { NOTE_COLOR } from '../constants.js';

export function drawExplosionRings(ctx, now, width, height, vfx, vfxAlpha) {
    const dur = 700; vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    const p = vfx.progress; const easeOut = 1 - Math.pow(1 - p, 4);

    const maxR = vfx.type === 'explode1' ? 150 : vfx.type === 'explode2' ? 300 : 500;
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - p) * vfxAlpha})`;
    ctx.beginPath(); ctx.arc(width/2, 0, maxR * easeOut, 0, Math.PI); ctx.stroke();
    const gradE = ctx.createRadialGradient(width/2, 0, 0, width/2, 0, maxR * easeOut);
    gradE.addColorStop(0, 'rgba(255, 255, 255, 0)'); gradE.addColorStop(1, `rgba(255, 255, 255, ${(1 - p) * 0.3 * vfxAlpha})`);
    ctx.fillStyle = gradE; ctx.beginPath(); ctx.arc(width/2, 0, maxR * easeOut, 0, Math.PI); ctx.fill();
}

export function drawParticleExplosion(ctx, now, ex, vfxAlpha) {
    ex.particles.forEach(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.12; pt.alpha *= 0.95;
        ctx.save(); ctx.globalAlpha = pt.alpha * vfxAlpha; ctx.fillStyle = pt.color;
        ctx.shadowBlur = 8; ctx.shadowColor = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
}

export function createNoteExplosion(laneId, laneIdx, totalLanes, previewWidth, previewHeight) {
    const laneWidth = previewWidth / totalLanes;
    const centerX = laneIdx * laneWidth + laneWidth / 2;
    const centerY = previewHeight * 0.8;
    const particles = [];
    for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x: centerX, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
            size: 1 + Math.random() * 4, color: NOTE_COLOR, alpha: 1
        });
    }
    return { laneId, startTime: performance.now(), particles };
}
