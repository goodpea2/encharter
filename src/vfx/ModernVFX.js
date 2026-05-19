
export function drawModernIdleVFX(ctx, now, width, height, type, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;

    if (type === 'LoopGlitter') {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const t = (now * 0.001 + i * 0.5) % 5 / 5;
            const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
            const y = (Math.cos(i * 678.9) * 0.5 + 0.5) * height;
            const size = (1 - Math.abs(t - 0.5) * 2) * 5;
            ctx.fillStyle = `hsla(${i * 20}, 70%, 80%, ${1 - Math.abs(t-0.5)*2})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'LoopConfetti') {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const t = (now * 0.0005 + i * 0.1) % 1;
            const x = (Math.sin(i * 456.7) * 0.5 + 0.5) * width;
            const y = t * height;
            ctx.fillStyle = `hsl(${i * 40}, 80%, 60%)`;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(now * 0.01 + i);
            ctx.fillRect(-3, -3, 6, 6);
            ctx.restore();
        }
    } else if (type === 'LoopFireAsh') {
        const count = 50;
        for (let i = 0; i < count; i++) {
            const t = (now * 0.0015 + i * 0.2) % 1;
            const x = (Math.sin(i * 789.1 + now * 0.001) * 0.1 + (i / count)) * width;
            const y = (1 - t) * height;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = `rgba(255, ${Math.random() * 100 + 50}, 0, ${1 - t})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'LoopRain') {
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 60; i++) {
            const t = (now * 0.002 + i * 0.05) % 1;
            const x = ((i / 60) * width + t * 100) % width;
            const y = t * height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 5, y + 15);
            ctx.stroke();
        }
    } else if (type === 'LoopSnow') {
        const count = 80;
        for (let i = 0; i < count; i++) {
            const t = (now * 0.0003 + i * 0.1) % 1;
            const x = (Math.sin(i * 123 + now * 0.0005) * 0.2 + (i / count)) * width;
            const y = t * height;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'LoopDiscoBall') {
        const t = now * 0.001;
        ctx.translate(width / 2, 50);
        for (let i = 0; i < 24; i++) {
            const angle = t + (i / 24) * Math.PI * 2;
            const dx = Math.cos(angle) * width;
            const dy = Math.sin(angle) * height;
            const grad = ctx.createRadialGradient(0, 0, 0, dx, dy, 100);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dx - 50, dy);
            ctx.lineTo(dx + 50, dy);
            ctx.fill();
        }
    } else if (type === 'LoopVirus') {
        ctx.translate(width / 2, 50);
        for (let i = 0; i < 3; i++) {
            ctx.rotate(now * 0.001 + i * Math.PI / 3);
            ctx.beginPath();
            ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'cyan';
            ctx.stroke();
        }
    } else if (type === 'FeverFire') {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const x = (i / count) * width + (Math.sin(now * 0.01 + i) * 20);
            const grad = ctx.createLinearGradient(x, height, x, height - 150);
            grad.addColorStop(0, 'rgba(255, 50, 0, 0.8)');
            grad.addColorStop(1, 'rgba(255, 200, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - 40, height - 200, 80, 200);
        }
    } else if (type === 'FeverRainbow') {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        const t = (now * 0.001) % 1;
        for (let i = 0; i <= 10; i++) {
            grad.addColorStop(i / 10, `hsla(${(i * 36 + t * 360) % 360}, 80%, 50%, 0.3)`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'FeverGolden') {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        const t = (now * 0.0005) % 1;
        grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
        grad.addColorStop((t + 0.5) % 1, 'rgba(255, 255, 100, 0.4)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'FeverSpeed') {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 40; i++) {
            const x = (Math.sin(i * 123) * 0.5 + 0.5) * width;
            const t = (now * 0.005 + i * 0.1) % 1;
            const y = t * height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 100);
            ctx.stroke();
        }
    }

    ctx.restore();
}

export function drawModernBurstVFX(ctx, now, width, height, vfx, alpha) {
    const dur = vfx.duration || 600;
    vfx.progress = (now - vfx.startTime) / dur;
    if (vfx.progress >= 1) { vfx.active = false; return; }
    
    const p = vfx.progress;
    const type = vfx.type;
    const invP = 1 - p;
    const outQuad = 1 - (1 - p) * (1 - p);

    ctx.save();
    ctx.globalAlpha *= alpha;

    if (type === 'LightBottom' || type === 'LightTop') {
        const yStart = (type === 'LightBottom') ? height : 0;
        const yEnd = (type === 'LightBottom') ? 0 : height;
        const grad = ctx.createLinearGradient(width/2, yStart, width/2, yEnd);
        grad.addColorStop(0, `rgba(255, 255, 255, ${invP * 0.8})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(width/2 - 200, yStart);
        ctx.lineTo(width/2 + 200, yStart);
        ctx.lineTo(width/2 + 50, yEnd);
        ctx.lineTo(width/2 - 50, yEnd);
        ctx.fill();
    } else if (type === 'LightSwipeUp' || type === 'LightSwipeDown') {
        const isUp = type === 'LightSwipeUp';
        const yBase = isUp ? height : 0;
        const angleRange = Math.PI / 3;
        const angleStart = isUp ? -Math.PI / 4 : Math.PI / 4;
        const currentAngle = angleStart + (isUp ? -1 : 1) * outQuad * angleRange;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${invP * 0.4})`;
        [0, width].forEach(x => {
            ctx.save();
            ctx.translate(x, yBase);
            ctx.rotate(x === 0 ? currentAngle : -currentAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(isUp ? 1000 : -1000, -200);
            ctx.lineTo(isUp ? 1000 : -1000, 200);
            ctx.fill();
            ctx.restore();
        });
    } else if (type.startsWith('CircleTop')) {
        const isThin = type.includes('Thin');
        let x = width / 2;
        if (type.endsWith('L')) x = width * 0.2;
        if (type.endsWith('R')) x = width * 0.8;
        
        const radius = outQuad * 200;
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = isThin ? 2 : 20 * invP;
        ctx.beginPath();
        ctx.arc(x, 50, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (!isThin) {
            ctx.fillStyle = `rgba(255, 255, 255, ${invP * 0.3})`;
            ctx.fill();
        }
    } else if (type === 'LaserTop') {
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const angle = i * Math.PI / 6 + p;
            ctx.beginPath();
            ctx.moveTo(width/2, 50);
            ctx.lineTo(width/2 + Math.cos(angle) * width, 50 + Math.sin(angle) * height);
            ctx.stroke();
        }
    } else if (type === 'ElectricTop') {
        ctx.strokeStyle = `rgba(150, 200, 255, ${invP})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let curX = 0;
        ctx.moveTo(0, 50);
        while (curX < width) {
            curX += 20 + Math.random() * 40;
            ctx.lineTo(curX, 50 + (Math.random() - 0.5) * 40);
        }
        ctx.stroke();
    } else if (type === 'BurstConfetti' || type === 'BurstFirework' || type === 'BurstHeart') {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + vfx.randomSeed;
            const dist = outQuad * 300;
            const x = width / 2 + Math.cos(angle) * dist;
            const y = 80 + Math.sin(angle) * dist + (p * p * 200); // gravity
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(p * 10);
            if (type === 'BurstHeart') {
                ctx.fillStyle = `rgba(255, 100, 150, ${invP})`;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-5, -5, -10, 5, 0, 10); ctx.bezierCurveTo(10, 5, 5, -5, 0, 0); ctx.fill();
            } else {
                ctx.fillStyle = `hsla(${i * 20}, 80%, 60%, ${invP})`;
                ctx.fillRect(-4, -4, 8, 8);
            }
            ctx.restore();
        }
    } else if (type === 'FlashSide') {
        const gradL = ctx.createLinearGradient(0, 0, 100, 0);
        gradL.addColorStop(0, `rgba(255, 255, 255, ${invP * 0.5})`); gradL.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradL; ctx.fillRect(0, 0, 100, height);
        const gradR = ctx.createLinearGradient(width, 0, width - 100, 0);
        gradR.addColorStop(0, `rgba(255, 255, 255, ${invP * 0.5})`); gradR.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradR; ctx.fillRect(width - 100, 0, 100, height);
    } else if (type === 'SideSwipeUp' || type === 'SideSwipeDown') {
        const isUp = type === 'SideSwipeUp';
        const y = isUp ? (1 - outQuad) * height : outQuad * height;
        ctx.fillStyle = `rgba(255, 255, 255, ${invP * 0.6})`;
        ctx.fillRect(0, y, width, 50 * invP);
    } else if (type.startsWith('BurstSide')) {
        const color = type.includes('Dots') ? 'yellow' : (type.includes('Electric') ? 'cyan' : 'white');
        for (let i = 0; i < 20; i++) {
            const side = i % 2 === 0 ? 0 : width;
            const dir = i % 2 === 0 ? 1 : -1;
            const y = (i / 20) * height;
            const x = side + dir * outQuad * 200;
            ctx.fillStyle = color;
            ctx.globalAlpha = invP * alpha;
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        }
    } else if (type.includes('FlashFull')) {
        ctx.fillStyle = `rgba(255, 255, 255, ${invP * (type.startsWith('Super') ? 1 : 0.4)})`;
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'SuperFlashBeam') {
        ctx.fillStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.fillRect(width/2 - 100 * invP, 0, 200 * invP, height);
    } else if (type === 'SuperFlashFull') {
        ctx.fillStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.fillRect(width/2 - 2, 0, 4, height);
    } else if (type.includes('CircleBuildUp')) {
        const scale = 1 - p; // 1 -> 0
        const radius = scale * 500;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(width/2, 80, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type.includes('LightBuildUp')) {
        const scale = 1 - p; // 1 -> 0
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const x = width/2 + Math.cos(angle) * scale * 500;
            const y = 80 + Math.sin(angle) * scale * 500;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(width/2, 80); ctx.stroke();
        }
    } else if (type === 'SongComplete') {
        ctx.fillStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SONG COMPLETE', width/2, height/2);
        // Add some random sparkles
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.restore();
}
