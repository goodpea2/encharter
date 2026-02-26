export function getHandleAt(mx, my, rect, displayScale, mode) {
    const r = rect;
    const hSize = 15 / displayScale; 
    if (mode === 'long') {
        const sx1 = r.x + r.s1; const sx2 = r.x + r.s2;
        const sv1 = r.y + r.v1; const sv2 = r.y + r.v2;
        if (Math.abs(mx - sx1) < hSize && my > r.y && my < r.y + r.h) return 's1';
        if (Math.abs(mx - sx2) < hSize && my > r.y && my < r.y + r.h) return 's2';
        if (Math.abs(my - sv1) < hSize && mx > r.x && mx < r.x + r.w) return 'v1';
        if (Math.abs(my - sv2) < hSize && mx > r.x && mx < r.x + r.w) return 'v2';
    }
    if (Math.abs(mx - r.x) < hSize && Math.abs(my - r.y) < hSize) return 'tl';
    if (Math.abs(mx - (r.x + r.w)) < hSize && Math.abs(my - r.y) < hSize) return 'tr';
    if (Math.abs(mx - r.x) < hSize && Math.abs(my - (r.y + r.h)) < hSize) return 'bl';
    if (Math.abs(mx - (r.x + r.w)) < hSize && Math.abs(my - (r.y + r.h)) < hSize) return 'br';
    if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) return 'center';
    return null;
}

export function renderSpriteEditor(ctx, img, rect, displayScale, mode, canvasWidth, canvasHeight) {
    if (!img) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    
    const rx = rect.x * displayScale;
    const ry = rect.y * displayScale;
    const rw = rect.w * displayScale;
    const rh = rect.h * displayScale;
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasWidth, ry);
    ctx.fillRect(0, ry + rh, canvasWidth, canvasHeight - (ry + rh));
    ctx.fillRect(0, ry, rx, rh);
    ctx.fillRect(rx + rw, ry, canvasWidth - (rx + rw), rh);
    
    ctx.strokeStyle = '#ff71ce';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    
    if (mode === 'long') {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        const sx1 = (rect.x + rect.s1) * displayScale;
        const sx2 = (rect.x + rect.s2) * displayScale;
        const sv1 = (rect.y + rect.v1) * displayScale;
        const sv2 = (rect.y + rect.v2) * displayScale;
        
        ctx.beginPath(); ctx.moveTo(sx1, ry); ctx.lineTo(sx1, ry + rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx2, ry); ctx.lineTo(sx2, ry + rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx, sv1); ctx.lineTo(rx + rw, sv1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx, sv2); ctx.lineTo(rx + rw, sv2); ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const hSize = 5;
    [ [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh] ].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, hSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
}
