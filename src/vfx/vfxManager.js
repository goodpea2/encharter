import { drawModernIdleVFX, drawModernBurstVFX } from './ModernVFX.js';
import { drawParticleExplosion } from './Explosions.js';

export function renderAllVFX(ctx, width, height, now, loopingVFX, activeBurstVFX, activeExplosions, vfxAlpha) {
    // Idle VFX
    loopingVFX.forEach((vfxType) => {
        drawModernIdleVFX(ctx, now, width, height, vfxType, vfxAlpha);
    });

    // Burst VFX
    activeBurstVFX.forEach(vfx => {
        drawModernBurstVFX(ctx, now, width, height, vfx, vfxAlpha);
    });

    // Particle Explosions (Track Hits)
    activeExplosions.forEach(ex => {
        drawParticleExplosion(ctx, now, ex, vfxAlpha);
    });
}
