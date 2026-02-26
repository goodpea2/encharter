import { drawSparkles } from './Sparkles.js';
import { drawFlames } from './Flames.js';
import { drawConfetti } from './Confetti.js';
import { drawHearts } from './Hearts.js';
import { drawGlitter } from './Glitter.js';
import { drawExplosionRings, drawParticleExplosion } from './Explosions.js';
import { drawLights } from './Lights.js';
import { drawWipes } from './Wipes.js';

export function renderAllVFX(ctx, width, height, now, loopingVFX, activeBurstVFX, activeExplosions, vfxAlpha) {
    // Idle VFX
    loopingVFX.forEach((vfxType) => {
        ctx.save();
        if (vfxType.startsWith('sparkle')) drawSparkles(ctx, now, width, height, vfxType, vfxAlpha);
        else if (vfxType.startsWith('flames')) drawFlames(ctx, now, width, height, vfxType, vfxAlpha);
        else if (vfxType.startsWith('confetti')) drawConfetti(ctx, now, width, height, vfxType, vfxAlpha);
        ctx.restore();
    });

    // Burst VFX
    activeBurstVFX.forEach(vfx => {
        ctx.save();
        if (vfx.type.startsWith('heart')) drawHearts(ctx, now, width, height, vfx, vfxAlpha);
        else if (vfx.type.startsWith('glitter')) drawGlitter(ctx, now, width, height, vfx, vfxAlpha);
        else if (vfx.type.startsWith('explode')) drawExplosionRings(ctx, now, width, height, vfx, vfxAlpha);
        else if (vfx.type.startsWith('light')) drawLights(ctx, now, width, height, vfx, vfxAlpha);
        else if (vfx.type.startsWith('wipe')) drawWipes(ctx, now, width, height, vfx, vfxAlpha);
        ctx.restore();
    });

    // Particle Explosions
    activeExplosions.forEach(ex => {
        drawParticleExplosion(ctx, now, ex, vfxAlpha);
    });
}
