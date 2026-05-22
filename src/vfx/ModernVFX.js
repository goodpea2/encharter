
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
    } else if (type === 'LoopCircleSpawning') {
        const circleCount = 6;
        for (let i = 0; i < circleCount; i++) {
            const t = (now * 0.0007 + i / circleCount) % 1;
            const x = (Math.sin(i * 345.67) * 0.3 + 0.5) * width;
            const y = 50 + t * 50; 
            const radius = t * 150 + 10;
            const op = (1 - t) * 0.3;
            ctx.strokeStyle = `rgba(255, 113, 206, ${op})`; 
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 113, 206, ${op * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'LoopFlashyDotSpawning') {
        const dotCount = 35;
        for (let i = 0; i < dotCount; i++) {
            const phase = (now * 0.003 + i * 15.7) % (Math.PI * 2);
            const opacity = Math.max(0, Math.sin(phase)) * 0.8;
            const scale = 0.5 + 0.5 * Math.sin(phase * 1.5);
            const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * width;
            const y = (Math.cos(i * 47.3) * 0.5 + 0.5) * height;
            const radius = (Math.sin(i * 92.1) * 3 + 4) * scale;
            
            const hue = (i * 15 + now * 0.05) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (opacity > 0.5) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity - 0.2})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - radius * 2, y);
                ctx.lineTo(x + radius * 2, y);
                ctx.moveTo(x, y - radius * 2);
                ctx.lineTo(x, y + radius * 2);
                ctx.stroke();
            }
        }
    } else if (type === 'LoopEmoji') {
        const heartCount = 15;
        for (let i = 0; i < heartCount; i++) {
            const t = (now * 0.0006 + i / heartCount) % 1;
            const fade = Math.sin(t * Math.PI); 
            const x = (0.6 + 0.35 * (Math.sin(i * 88.4 + now * 0.001) * 0.5 + 0.5)) * width;
            const y = height - (t * 200); 
            const size = 12 + Math.sin(i * 43.2) * 4;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(now * 0.002 + i) * 0.2);
            ctx.fillStyle = `rgba(255, 50, 100, ${fade * 0.65})`;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-size/2, -size/2, -size, size/2, 0, size);
            ctx.bezierCurveTo(size, size/2, size/2, -size/2, 0, 0);
            ctx.fill();
            ctx.restore();
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
    } else if (type === 'CircleSwipeRight') {
        const x = p * width;
        const radius = 30;
        const grad = ctx.createRadialGradient(x, 50, 0, x, 50, radius * 1.5);
        grad.addColorStop(0, `rgba(255, 113, 206, ${invP})`);
        grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, 50, radius * 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, 50, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'CircleSwipeLeft') {
        const x = (1 - p) * width;
        const radius = 30;
        const grad = ctx.createRadialGradient(x, 50, 0, x, 50, radius * 1.5);
        grad.addColorStop(0, `rgba(6, 182, 212, ${invP})`);
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, 50, radius * 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, 50, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'FadeSwipeRight') {
        const centerX = p * (width + 300) - 150;
        const grad = ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${invP * 0.45})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'FadeSwipeLeft') {
        const centerX = (1 - p) * (width + 300) - 150;
        const grad = ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${invP * 0.45})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'BottomFire') {
        const fireY = height - (p * 120);
        const fireScale = invP * 50 + 10;
        const grad = ctx.createRadialGradient(width/2, fireY, 0, width/2, fireY, fireScale);
        grad.addColorStop(0, `rgba(255, 100, 10, ${invP * 0.85})`);
        grad.addColorStop(0.5, `rgba(255, 50, 0, ${invP * 0.4})`);
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(width/2, fireY, fireScale, 0, Math.PI * 2); ctx.fill();

        for (let i = 0; i < 5; i++) {
            const sx = width/2 + (Math.sin(i * 10 + now * 0.05) * 20);
            const sy = height - (p * 180) - (i * 10);
            ctx.fillStyle = `rgba(255, 150, 50, ${invP * 0.6})`;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
        }
    } else if (type === 'CircleBlurSpreadL') {
        const maxRadius = Math.max(width, height) * 1.3;
        const radius = outQuad * maxRadius;
        const grad = ctx.createRadialGradient(0, 50, 0, 0, 50, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(Math.max(0, 1 - 0.2 * invP), `rgba(255, 113, 206, ${invP * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 50, radius, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'CircleBlurSpread') {
        const maxRadius = Math.max(width, height) * 1.3;
        const radius = outQuad * maxRadius;
        const grad = ctx.createRadialGradient(width/2, 50, 0, width/2, 50, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(Math.max(0, 1 - 0.2 * invP), `rgba(6, 182, 212, ${invP * 0.5})`);
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(width/2, 50, radius, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'CircleBlurSpreadR') {
        const maxRadius = Math.max(width, height) * 1.4;
        const radius = outQuad * maxRadius;
        const grad = ctx.createRadialGradient(width, 50, 0, width, 50, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(Math.max(0, 1 - 0.2 * invP), `rgba(255, 113, 206, ${invP * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(width, 50, radius, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'CircleThickSpreadL') {
        const maxLength = Math.max(width, height) * 1.4;
        const radius = outQuad * maxLength;
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 15 * invP;
        ctx.beginPath(); ctx.arc(0, 50, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'CircleThickSpread') {
        const maxLength = Math.max(width, height) * 1.4;
        const radius = outQuad * maxLength;
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 15 * invP;
        ctx.beginPath(); ctx.arc(width/2, 50, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'CircleThickSpreadR') {
        const maxLength = Math.max(width, height) * 1.4;
        const radius = outQuad * maxLength;
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP})`;
        ctx.lineWidth = 15 * invP;
        ctx.beginPath(); ctx.arc(width, 50, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'SideMultiLightL') {
        const xCoords = [20, 50, 85, 120];
        xCoords.forEach((cx, idx) => {
            const itemP = Math.max(0, Math.min(1, p * 1.1 - idx * 0.05));
            const itemInvP = 1 - itemP;
            if (itemP > 0 && itemP < 1) {
                const grad = ctx.createLinearGradient(cx, height, cx, 0);
                grad.addColorStop(0, `rgba(6, 182, 212, ${itemInvP * 0.45})`);
                grad.addColorStop(0.7, `rgba(6, 182, 212, ${itemInvP * 0.1})`);
                grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(cx - 15, 0, 30, height);
            }
        });
    } else if (type === 'SideMultiLightR') {
        const xCoords = [width - 20, width - 50, width - 85, width - 120];
        xCoords.forEach((cx, idx) => {
            const itemP = Math.max(0, Math.min(1, p * 1.1 - idx * 0.05));
            const itemInvP = 1 - itemP;
            if (itemP > 0 && itemP < 1) {
                const grad = ctx.createLinearGradient(cx, height, cx, 0);
                grad.addColorStop(0, `rgba(255, 113, 206, ${itemInvP * 0.45})`);
                grad.addColorStop(0.7, `rgba(255, 113, 206, ${itemInvP * 0.1})`);
                grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(cx - 15, 0, 30, height);
            }
        });
    } else if (type === 'RandomBottomCircle') {
        if (!vfx.randomX) {
            vfx.randomX = Math.random() * width;
        }
        const rx = vfx.randomX;
        const rRadius = outQuad * 150 + 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${invP * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, height, rRadius, Math.PI, Math.PI * 2);
        ctx.stroke();
    } else if (type === 'XLightTopUp') {
        const xMid = width / 2;
        const bullet1X = xMid - 100 + p * 200;
        const bullet1Y = 50 - 50 + p * 100;
        const bullet2X = xMid + 100 - p * 200;
        const bullet2Y = 50 - 50 + p * 100;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xMid - 100, 50 - 50); ctx.lineTo(xMid + 100, 50 + 50);
        ctx.moveTo(xMid + 100, 50 - 50); ctx.lineTo(xMid - 100, 50 + 50);
        ctx.stroke();

        const colors = ['#06b6d4', '#ff71ce'];
        [ {x: bullet1X, y: bullet1Y, c: colors[0], dir: 1}, {x: bullet2X, y: bullet2Y, c: colors[1], dir: -1} ].forEach((pt) => {
            ctx.fillStyle = pt.c;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = pt.c;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - pt.dir * 15 * invP, pt.y - 7.5 * invP);
            ctx.stroke();
        });
    } else if (type === 'XLightTopDown') {
        const xMid = width / 2;
        const bullet1X = xMid + 100 - p * 200;
        const bullet1Y = 50 + 50 - p * 100;
        const bullet2X = xMid - 100 + p * 200;
        const bullet2Y = 50 + 50 - p * 100;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xMid - 100, 50 - 50); ctx.lineTo(xMid + 100, 50 + 50);
        ctx.moveTo(xMid + 100, 50 - 50); ctx.lineTo(xMid - 100, 50 + 50);
        ctx.stroke();

        const colors = ['#06b6d4', '#ff71ce'];
        [ {x: bullet1X, y: bullet1Y, c: colors[0], dir: -1}, {x: bullet2X, y: bullet2Y, c: colors[1], dir: 1} ].forEach((pt) => {
            ctx.fillStyle = pt.c;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = pt.c;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - pt.dir * 15 * invP, pt.y + 7.5 * invP);
            ctx.stroke();
        });
    } else if (type === 'XLightBottomUp') {
        const xMid = width / 2;
        const yCenter = height - 100;
        const bullet1X = xMid - 120 + p * 240;
        const bullet1Y = yCenter + 60 - p * 120;
        const bullet2X = xMid + 120 - p * 240;
        const bullet2Y = yCenter + 60 - p * 120;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xMid - 120, yCenter + 60); ctx.lineTo(xMid + 120, yCenter - 60);
        ctx.moveTo(xMid + 120, yCenter + 60); ctx.lineTo(xMid - 120, yCenter - 60);
        ctx.stroke();

        const colors = ['#06b6d4', '#ff71ce'];
        [ {x: bullet1X, y: bullet1Y, c: colors[0], dir: 1}, {x: bullet2X, y: bullet2Y, c: colors[1], dir: -1} ].forEach((pt) => {
            ctx.fillStyle = pt.c;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = pt.c;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - pt.dir * 15 * invP, pt.y + 7.5 * invP);
            ctx.stroke();
        });
    } else if (type === 'XLightBottomDown') {
        const xMid = width / 2;
        const yCenter = height - 100;
        const bullet1X = xMid - 120 + p * 240;
        const bullet1Y = yCenter - 60 + p * 120;
        const bullet2X = xMid + 120 - p * 240;
        const bullet2Y = yCenter - 60 + p * 120;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xMid - 120, yCenter - 60); ctx.lineTo(xMid + 120, yCenter + 60);
        ctx.moveTo(xMid + 120, yCenter - 60); ctx.lineTo(xMid - 120, yCenter + 60);
        ctx.stroke();

        const colors = ['#06b6d4', '#ff71ce'];
        [ {x: bullet1X, y: bullet1Y, c: colors[0], dir: 1}, {x: bullet2X, y: bullet2Y, c: colors[1], dir: -1} ].forEach((pt) => {
            ctx.fillStyle = pt.c;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = pt.c;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x - pt.dir * 15 * invP, pt.y - 7.5 * invP);
            ctx.stroke();
        });
    } else if (type === 'BurstSideLevels') {
        const barCount = 15;
        const barSpacing = height / barCount;
        const maxBarLength = 60 * Math.sin(p * Math.PI); 
        for (let i = 0; i < barCount; i++) {
            const y = i * barSpacing + barSpacing / 2;
            const subScale = 0.4 + 0.6 * Math.sin(i * 1.7 + now * 0.01);
            const len = maxBarLength * subScale;

            const gradL = ctx.createLinearGradient(0, y, len, y);
            gradL.addColorStop(0, `hsla(${(now * 0.05 + i * 20) % 360}, 90%, 65%, ${invP * 0.8})`);
            gradL.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradL;
            ctx.fillRect(0, y - 2, len, 4);

            const gradR = ctx.createLinearGradient(width, y, width - len, y);
            gradR.addColorStop(0, `hsla(${(now * 0.05 + 180 + i * 20) % 360}, 90%, 65%, ${invP * 0.8})`);
            gradR.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradR;
            ctx.fillRect(width - len, y - 2, len, 4);
        }
    } else if (type === 'LevelsTop') {
        const barCount = 20;
        const barWidth = width / barCount;
        const maxBarHeight = 120 * Math.sin(p * Math.PI); 
        for (let i = 0; i < barCount; i++) {
            const x = i * barWidth;
            const subScale = 0.3 + 0.7 * Math.sin(i * 1.1 + now * 0.015);
            const h = maxBarHeight * subScale;
            const grad = ctx.createLinearGradient(x, 0, x, h);
            grad.addColorStop(0, `rgba(255, 113, 206, ${invP})`);
            grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 2, 0, barWidth - 4, h);
        }
    } else if (type === 'LevelsTopStrong') {
        const barCount = 20;
        const barWidth = width / barCount;
        const maxBarHeight = 220 * Math.sin(p * Math.PI); 
        for (let i = 0; i < barCount; i++) {
            const x = i * barWidth;
            const subScale = 0.3 + 0.7 * Math.sin(i * 1.3 + now * 0.02);
            const h = maxBarHeight * subScale;
            const grad = ctx.createLinearGradient(x, 0, x, h);
            grad.addColorStop(0, `rgba(251, 191, 36, ${invP})`); 
            grad.addColorStop(0.5, `rgba(255, 113, 206, ${invP * 0.7})`); 
            grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 1, 0, barWidth - 2, h);
        }
    }

    ctx.restore();
}
