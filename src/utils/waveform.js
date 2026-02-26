export function calculateWaveformPeaks(audioBuffer, resolution) {
    if (!audioBuffer) return null;
    const data = audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / resolution);
    const peaks = new Float32Array(resolution);
    for (let i = 0; i < resolution; i++) {
        let max = 0;
        const start = i * step;
        for (let j = 0; j < step; j++) {
            const datum = Math.abs(data[start + j]);
            if (datum > max) max = datum;
        }
        peaks[i] = max;
    }
    return peaks;
}
