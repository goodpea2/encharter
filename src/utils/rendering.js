export function drawHeart(ctx, x, y, size) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - size/2, y - size/2, x - size, y + size/4, x, y + size);
    ctx.bezierCurveTo(x + size, y + size/4, x + size/2, y - size/2, x, y);
    ctx.fill();
}

export function draw9Slice(ctx, img, rect, x, y, w, h) {
    const { x: rx, y: ry, w: rw, h: rh, s1, s2, v1, v2 } = rect;
    // Source sizes
    const sw = [s1, s2 - s1, rw - s2];
    const sh = [v1, v2 - v1, rh - v2];
    // Scale horizontal based on lane width fit
    const scaleX = w / rw;
    // For vertical elements, we use scaleX as the baseline scale to maintain visual consistency of the caps
    const scaleCap = scaleX; 
    const dw = [sw[0] * scaleX, Math.max(0, w - (sw[0] + sw[2]) * scaleX), sw[2] * scaleX];
    const dh = [sh[0] * scaleCap, Math.max(0, h - (sh[0] + sh[2]) * scaleCap), sh[2] * scaleCap];
    // Correct logic: Only center segment (index 1) should soak up the duration height
    const sourceX = [rx, rx + s1, rx + s2];
    const sourceY = [ry, ry + v1, ry + v2];
    const destX = [x, x + dw[0], x + dw[0] + dw[1]];
    const destY = [y, y + dh[0], y + dh[0] + dh[1]];
    for (let iy = 0; iy < 3; iy++) {
        for (let ix = 0; ix < 3; ix++) {
            if (sw[ix] <= 0 || sh[iy] <= 0 || dw[ix] <= 0 || dh[iy] <= 0) continue;
            ctx.drawImage(img, sourceX[ix], sourceY[iy], sw[ix], sh[iy], destX[ix], destY[iy], dw[ix], dh[iy]);
        }
    }
}
