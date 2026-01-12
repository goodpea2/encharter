
// --- Rhythm Studio: Professional Vfx Editor v3.4 ---

import { GoogleGenAI } from "@google/genai";

// -- Types --
type LaneType = 'note' | 'vfx';
type VFXType = 
    'explode1' | 'explode2' | 'explode3' | 
    'wipeUp' | 'wipeDown' | 'wipeLeft' | 'wipeRight' | 
    'light1' | 'light2' | 'light3' | 
    'sparkle1' | 'sparkle2' | 'sparkle3' |
    'flames1' | 'flames2' | 'flames3' |
    'confetti1' | 'confetti2' | 'confetti3' |
    'glitter1' | 'glitter2' | 'glitter3' |
    'heart1' | 'heart2' | 'heart3';

interface LaneConfig {
    id: number;
    type: LaneType;
    vfxType?: VFXType;
}

interface TimelineEvent {
    laneId: number;
    tick: number;
    id: number;
}

interface VFXInstance {
    type: VFXType;
    startTime: number;
    progress: number;
    active: boolean;
    laneId?: number;
    randomSeed?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
}

interface Explosion {
    laneId: number;
    startTime: number;
    particles: Particle[];
}

interface ProjectData {
    lanes: LaneConfig[];
    events: TimelineEvent[];
    audioOffset: number;
    bpm: number;
    version: string;
    ticksPerBar: number;
}

// -- Constants --
const TICKS_PER_BAR = 96; 
const BEATS_PER_BAR = 4;   
const NOTE_COLOR = '#ff71ce';
const VFX_COLOR = '#06b6d4';
const GHOST_NOTE_COLOR = 'rgba(255, 113, 206, 0.25)';
const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';
const BEAT_LINE_COLOR = 'rgba(255, 255, 255, 0.15)';
const BAR_LINE_COLOR = 'rgba(255, 255, 255, 0.45)';
const WAVEFORM_COLOR = '#fce4ec'; 

const BURST_VFX: VFXType[] = [
    'explode1', 'explode2', 'explode3', 
    'wipeUp', 'wipeDown', 'wipeLeft', 'wipeRight', 
    'light1', 'light2', 'light3',
    'glitter1', 'glitter2', 'glitter3',
    'heart1', 'heart2', 'heart3'
];
const IDLE_VFX: VFXType[] = [
    'sparkle1', 'sparkle2', 'sparkle3',
    'flames1', 'flames2', 'flames3',
    'confetti1', 'confetti2', 'confetti3'
];

// -- App State --
let audioContext: AudioContext;
let audioBuffer: AudioBuffer | null = null;
let audioSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode;

let waveformPeaks: Float32Array | null = null;
const PEAK_RESOLUTION = 10000; 

let lanes: LaneConfig[] = [
    { id: 0, type: 'note' },
    { id: 1, type: 'note' },
    { id: 2, type: 'note' },
    { id: 3, type: 'note' }
];
let events: TimelineEvent[] = [];
let activeBurstVFX: VFXInstance[] = [];
let loopingVFX: Map<number, VFXType> = new Map(); // laneId -> VFXType
let activeExplosions: Explosion[] = [];

let bpm = 120;
let gridSnap = 6; 
let pixelsPerSecondEditor = 300; 
let pixelsPerSecondLive = 625;   
let noteThicknessLive = 18;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let audioOffset = 0; 
let duration = 0;
let nextId = 0;
let isInvertedScroll = true;

// Modal State
let editingLaneId: number | null = null;

// Input State
let ghostEvent: { laneId: number, tick: number } | null = null;
let isLeftDragging = false;
let isRightDragging = false;
let isMiddleDragging = false;
let lastMouseY = 0;
let isShiftPressed = false;

// -- DOM Elements --
let audioInput: HTMLInputElement;
let projectInput: HTMLInputElement;
let trackNameLabel: HTMLElement;
let playBtn: HTMLButtonElement;
let playIcon: HTMLElement;
let pauseIcon: HTMLElement;
let bpmInput: HTMLInputElement;
let volumeSlider: HTMLInputElement;
let zoomInput: HTMLInputElement;
let liveSpeedInput: HTMLInputElement;
let thicknessInput: HTMLInputElement;
let invertScrollToggle: HTMLInputElement;
let snapSelect: HTMLSelectElement;
let exportBtn: HTMLButtonElement;
let importBtn: HTMLButtonElement;
let addLaneBtn: HTMLButtonElement;
let currentTimeDisplay: HTMLElement;
let offsetDisplay: HTMLElement;
let laneHeaders: HTMLElement;

let vfxModal: HTMLElement;
let burstVfxList: HTMLElement;
let idleVfxList: HTMLElement;

let waveformCanvas: HTMLCanvasElement;
let editorCanvas: HTMLCanvasElement;
let previewCanvas: HTMLCanvasElement;

let ctxWave: CanvasRenderingContext2D;
let ctxEdit: CanvasRenderingContext2D;
let ctxPrev: CanvasRenderingContext2D;

// -- Helper Conversions --
function tickToTime(tick: number): number {
    return tick / ((TICKS_PER_BAR * bpm) / 240);
}

function timeToTick(time: number): number {
    return Math.round(time * ((TICKS_PER_BAR * bpm) / 240));
}

// -- Initialization --
function init() {
    audioInput = document.getElementById('audioInput') as HTMLInputElement;
    projectInput = document.getElementById('projectInput') as HTMLInputElement;
    trackNameLabel = document.getElementById('trackName') as HTMLElement;
    playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    playIcon = document.getElementById('playIcon') as HTMLElement;
    pauseIcon = document.getElementById('pauseIcon') as HTMLElement;
    bpmInput = document.getElementById('bpmInput') as HTMLInputElement;
    volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    zoomInput = document.getElementById('zoomInput') as HTMLInputElement;
    liveSpeedInput = document.getElementById('liveSpeedInput') as HTMLInputElement;
    thicknessInput = document.getElementById('thicknessInput') as HTMLInputElement;
    invertScrollToggle = document.getElementById('invertScrollToggle') as HTMLInputElement;
    snapSelect = document.getElementById('snapSelect') as HTMLSelectElement;
    exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    importBtn = document.getElementById('importBtn') as HTMLButtonElement;
    addLaneBtn = document.getElementById('addLaneBtn') as HTMLButtonElement;
    currentTimeDisplay = document.getElementById('currentTimeDisplay') as HTMLElement;
    offsetDisplay = document.getElementById('offsetDisplay') as HTMLElement;
    laneHeaders = document.getElementById('laneHeaders') as HTMLElement;

    vfxModal = document.getElementById('vfxModal') as HTMLElement;
    burstVfxList = document.getElementById('burstVfxList') as HTMLElement;
    idleVfxList = document.getElementById('idleVfxList') as HTMLElement;

    waveformCanvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;
    editorCanvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
    previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;

    ctxWave = waveformCanvas.getContext('2d', { alpha: false })!;
    ctxEdit = editorCanvas.getContext('2d')!;
    ctxPrev = previewCanvas.getContext('2d')!;

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.5;

    setupListeners();
    renderLaneHeaders();
    renderVfxOptions();
    handleResize();
    requestAnimationFrame(renderLoop);
}

function isModalOpen() {
    return vfxModal && vfxModal.style.display === 'block';
}

function setupListeners() {
    audioInput.addEventListener('change', handleAudioUpload);
    projectInput.addEventListener('change', handleProjectImportFile);
    
    playBtn.addEventListener('click', togglePlayback);
    exportBtn.addEventListener('click', exportProject);
    importBtn.addEventListener('click', () => projectInput.click());
    addLaneBtn.addEventListener('click', addNewLane);

    bpmInput.addEventListener('change', () => { bpm = parseInt(bpmInput.value) || 120; });
    volumeSlider.addEventListener('input', () => { gainNode.gain.value = parseFloat(volumeSlider.value); });
    zoomInput.addEventListener('input', () => { pixelsPerSecondEditor = parseInt(zoomInput.value); });
    liveSpeedInput.addEventListener('input', () => { pixelsPerSecondLive = parseInt(liveSpeedInput.value); });
    thicknessInput.addEventListener('input', () => { noteThicknessLive = parseInt(thicknessInput.value); });
    invertScrollToggle.addEventListener('change', () => { isInvertedScroll = invertScrollToggle.checked; });
    snapSelect.addEventListener('change', () => { gridSnap = parseInt(snapSelect.value); });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => { vfxModal.style.display = 'none'; });
    document.getElementById('setNoteOption')?.addEventListener('click', () => setLaneType('note'));
    document.getElementById('deleteLaneBtn')?.addEventListener('click', deleteCurrentLane);

    window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) isLeftDragging = false;
        if (e.button === 2) isRightDragging = false;
        if (e.button === 1) isMiddleDragging = false;
    });

    editorCanvas.addEventListener('mousedown', (e) => {
        if (isModalOpen()) return;
        if (e.button === 0) { isLeftDragging = true; tryPlaceEvent(); }
        if (e.button === 2) { isRightDragging = true; tryRemoveEvent(); }
        if (e.button === 1) { isMiddleDragging = true; lastMouseY = e.clientY; e.preventDefault(); }
    });

    editorCanvas.addEventListener('mousemove', (e) => {
        const rect = editorCanvas.getBoundingClientRect();
        const hitZoneY = rect.height * 0.8;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const laneWidth = rect.width / lanes.length;
        const laneIdx = Math.floor(x / laneWidth);
        const laneId = lanes[laneIdx]?.id;
        
        const currentTime = isPlaying ? (audioContext.currentTime - startTime) : pauseOffset;
        const timeAtMouse = currentTime + (hitZoneY - y) / pixelsPerSecondEditor;
        
        const rawTick = timeToTick(timeAtMouse);
        const snappedTick = Math.round(rawTick / gridSnap) * gridSnap;

        ghostEvent = laneId !== undefined ? { laneId, tick: snappedTick } : null;

        if (isModalOpen()) return;

        if (isLeftDragging) tryPlaceEvent();
        if (isRightDragging) tryRemoveEvent();
        
        if (isMiddleDragging) {
            const deltaY = e.clientY - lastMouseY;
            lastMouseY = e.clientY;
            const timeDelta = (deltaY) / pixelsPerSecondEditor;
            pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset - timeDelta));
            if (isPlaying) startTime = audioContext.currentTime - pauseOffset;
        }
    });

    editorCanvas.addEventListener('mouseleave', () => { ghostEvent = null; });

    let isScrubbing = false;
    waveformCanvas.addEventListener('mousedown', (e) => { 
        if (isModalOpen()) return;
        isScrubbing = true; 
        lastMouseY = e.clientY; 
    });
    window.addEventListener('mouseup', () => isScrubbing = false);
    waveformCanvas.addEventListener('mousemove', (e) => {
        if (isModalOpen() || !isScrubbing || !audioBuffer) return;
        const currentY = e.clientY;
        const deltaY = currentY - lastMouseY;
        const timeDelta = deltaY / pixelsPerSecondEditor;
        if (isShiftPressed) {
            audioOffset -= timeDelta; 
            updateOffsetDisplay();
        } else {
            const direction = isInvertedScroll ? 1 : -1;
            pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset + timeDelta * direction));
            if (isPlaying) startTime = audioContext.currentTime - pauseOffset;
        }
        lastMouseY = currentY;
    });

    editorCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', (e) => {
        if (isModalOpen()) return;
        const direction = isInvertedScroll ? 1 : -1;
        const delta = e.deltaY * 0.002 * direction;
        pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset + delta));
        if (isPlaying) startTime = audioContext.currentTime - pauseOffset;
    }, { passive: true });
}

// -- Lane Management --
function renderLaneHeaders() {
    laneHeaders.innerHTML = '';
    lanes.forEach(lane => {
        const div = document.createElement('div');
        div.className = 'lane-label';
        const label = lane.type === 'note' ? 'NOTE' : (lane.vfxType || 'NONE');
        div.textContent = label;
        div.onclick = () => openVfxModal(lane.id);
        laneHeaders.appendChild(div);
    });
}

function renderVfxOptions() {
    const createBtn = (type: VFXType, target: HTMLElement) => {
        const btn = document.createElement('button');
        btn.className = 'vfx-btn bg-white/5 border border-white/10 text-white/70 text-[9px] px-2 py-1 rounded hover:bg-white/10';
        btn.textContent = type;
        btn.onclick = () => setVfxType(type);
        target.appendChild(btn);
    };
    burstVfxList.innerHTML = '';
    idleVfxList.innerHTML = '';
    BURST_VFX.forEach(v => createBtn(v, burstVfxList));
    IDLE_VFX.forEach(v => createBtn(v, idleVfxList));
}

function addNewLane() {
    const maxId = lanes.reduce((max, l) => Math.max(max, l.id), -1);
    lanes.push({ id: maxId + 1, type: 'note' });
    renderLaneHeaders();
}

function openVfxModal(laneId: number) {
    editingLaneId = laneId;
    vfxModal.style.display = 'block';
}

function setLaneType(type: LaneType) {
    if (editingLaneId === null) return;
    const lane = lanes.find(l => l.id === editingLaneId);
    if (lane) {
        lane.type = type;
        lane.vfxType = undefined;
        renderLaneHeaders();
        vfxModal.style.display = 'none';
    }
}

function setVfxType(vfx: VFXType) {
    if (editingLaneId === null) return;
    const lane = lanes.find(l => l.id === editingLaneId);
    if (lane) {
        lane.type = 'vfx';
        lane.vfxType = vfx;
        renderLaneHeaders();
        vfxModal.style.display = 'none';
    }
}

function deleteCurrentLane() {
    if (editingLaneId === null) return;
    lanes = lanes.filter(l => l.id !== editingLaneId);
    events = events.filter(e => e.laneId !== editingLaneId);
    loopingVFX.delete(editingLaneId);
    renderLaneHeaders();
    vfxModal.style.display = 'none';
}

// -- Project Import / Export --
function exportProject() {
    const data: ProjectData = {
        lanes,
        events,
        audioOffset,
        bpm,
        ticksPerBar: TICKS_PER_BAR,
        version: "3.4"
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleProjectImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data: ProjectData = JSON.parse(text);
        
        if (data.version.startsWith("2.") || data.version === "3.0" || data.version === "3.1") {
            events = (data as any).notes.map((n: any) => ({ laneId: n.lane, tick: n.tick, id: n.id }));
            lanes = [{ id: 0, type: 'note' }, { id: 1, type: 'note' }, { id: 2, type: 'note' }, { id: 3, type: 'note' }];
        } else {
            lanes = data.lanes || [];
            events = data.events || [];
        }

        audioOffset = data.audioOffset || 0;
        bpm = data.bpm || 120;
        bpmInput.value = bpm.toString();
        nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
        updateOffsetDisplay();
        renderLaneHeaders();
    } catch (err) {
        console.error(err);
        alert("Load Error");
    }
    projectInput.value = ''; 
}

function updateOffsetDisplay() {
    offsetDisplay.textContent = `${Math.round(audioOffset * 1000)}ms`;
}

function tryPlaceEvent() {
    if (!ghostEvent) return;
    const existing = events.find(e => e.laneId === ghostEvent!.laneId && e.tick === ghostEvent!.tick);
    if (!existing) {
        events.push({ ...ghostEvent!, id: nextId++ });
    }
}

function tryRemoveEvent() {
    if (!ghostEvent) return;
    events = events.filter(e => !(e.laneId === ghostEvent!.laneId && e.tick === ghostEvent!.tick));
}

function handleResize() {
    [waveformCanvas, editorCanvas, previewCanvas].forEach(canvas => {
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (parent) {
            const rect = parent.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    });
}

// -- Audio Handling --
async function handleAudioUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    trackNameLabel.textContent = file.name;
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    duration = audioBuffer.duration;
    calculateWaveformPeaks();
}

function calculateWaveformPeaks() {
    if (!audioBuffer) return;
    const data = audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / PEAK_RESOLUTION);
    waveformPeaks = new Float32Array(PEAK_RESOLUTION);
    for (let i = 0; i < PEAK_RESOLUTION; i++) {
        let max = 0;
        const start = i * step;
        for (let j = 0; j < step; j++) {
            const datum = Math.abs(data[start + j]);
            if (datum > max) max = datum;
        }
        waveformPeaks[i] = max;
    }
}

function togglePlayback() {
    if (!audioBuffer) return;
    isPlaying ? pausePlayback() : startPlayback();
}

function startPlayback() {
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(gainNode);
    const chartTimeNow = pauseOffset;
    const audioTimeNow = Math.max(0, chartTimeNow - audioOffset);
    const whenToStart = audioContext.currentTime + Math.max(0, audioOffset - chartTimeNow);
    startTime = audioContext.currentTime - pauseOffset;
    audioSource.start(whenToStart, audioTimeNow);
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    audioSource.onended = () => { if (isPlaying) pausePlayback(true); };
}

function pausePlayback(atEnd = false) {
    if (!isPlaying) return;
    if (audioSource) { audioSource.stop(); audioSource = null; }
    pauseOffset = atEnd ? 0 : audioContext.currentTime - startTime;
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    
    // Stop all VFX on pause
    activeBurstVFX = [];
    loopingVFX.clear();
    activeExplosions = [];
}

// -- VFX Engine --
function triggerVFX(laneId: number, type: VFXType) {
    if (BURST_VFX.includes(type)) {
        activeBurstVFX.push({ type, startTime: performance.now(), progress: 0, active: true, laneId, randomSeed: Math.random() });
    } else if (IDLE_VFX.includes(type)) {
        if (loopingVFX.get(laneId) === type) {
            loopingVFX.delete(laneId);
        } else {
            loopingVFX.set(laneId, type);
        }
    }
}

function createNoteExplosion(laneId: number, laneIdx: number, totalLanes: number) {
    const laneWidth = previewCanvas.width / totalLanes;
    const centerX = laneIdx * laneWidth + laneWidth / 2;
    const centerY = previewCanvas.height * 0.8;
    const particles: Particle[] = [];
    for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x: centerX, y: centerY,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
            size: 1 + Math.random() * 4, color: NOTE_COLOR, alpha: 1
        });
    }
    activeExplosions.push({ laneId, startTime: performance.now(), particles });
}

function renderVFX(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const now = performance.now();
    
    // Render Looping Idle VFX
    loopingVFX.forEach((vfxType) => {
        ctx.save();
        switch (vfxType) {
            case 'sparkle1':
            case 'sparkle2':
            case 'sparkle3':
                const density = vfxType === 'sparkle1' ? 20 : vfxType === 'sparkle2' ? 40 : 80;
                ctx.globalAlpha = 0.6;
                for (let i = 0; i < density; i++) {
                    const phase = (now * 0.001 + i * 0.2) % 1;
                    const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
                    const y = (1 - phase) * height;
                    const size = Math.abs(Math.sin(now * 0.005 + i)) * 3;
                    ctx.fillStyle = '#fff';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#fff';
                    ctx.fillRect(x, y, size, size);
                }
                break;
            case 'flames1':
            case 'flames2':
            case 'flames3':
                const fCount = vfxType === 'flames1' ? 40 : vfxType === 'flames2' ? 80 : 150;
                for (let i = 0; i < fCount; i++) {
                    const t = (now * 0.001 + i * 0.3) % 1;
                    const x = (Math.sin(i * 555) * 0.45 + 0.5) * width + Math.sin(now * 0.005 + i) * 10;
                    const y = height * (1 - t);
                    const size = (1 - t) * (vfxType === 'flames1' ? 10 : 20);
                    const alpha = (1 - t) * 0.5;
                    const colors = ['#ff4d00', '#ff8c00', '#ffd700'];
                    ctx.fillStyle = colors[i % 3];
                    ctx.globalAlpha = alpha;
                    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'confetti1':
            case 'confetti2':
            case 'confetti3':
                const cCount = vfxType === 'confetti1' ? 30 : vfxType === 'confetti2' ? 60 : 120;
                for (let i = 0; i < cCount; i++) {
                    const t = (now * 0.0005 + i * 0.7) % 1;
                    const x = (Math.sin(i * 999) * 0.5 + 0.5) * width;
                    const y = t * height;
                    const rotate = now * 0.005 + i;
                    const colors = ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'];
                    ctx.fillStyle = colors[i % 5];
                    ctx.globalAlpha = 0.8;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(rotate);
                    ctx.fillRect(-4, -4, 8, 8);
                    ctx.restore();
                }
                break;
        }
        ctx.restore();
    });

    // Render Burst VFX
    activeBurstVFX = activeBurstVFX.filter(v => v.active);
    activeBurstVFX.forEach(vfx => {
        const duration = 600;
        vfx.progress = (now - vfx.startTime) / duration;
        if (vfx.progress >= 1) { vfx.active = false; return; }

        const p = vfx.progress;
        const easeOut = 1 - Math.pow(1 - p, 4);

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';

        switch (vfx.type) {
            case 'explode1':
            case 'explode2':
            case 'explode3':
                // Subtler rings and gradients
                const maxRadius = vfx.type === 'explode1' ? 100 : vfx.type === 'explode2' ? 220 : 380;
                ctx.globalAlpha = (1 - easeOut) * 0.6;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(width / 2, 0, maxRadius * easeOut, 0, Math.PI);
                ctx.stroke();
                
                const gradE = ctx.createRadialGradient(width/2, 0, 0, width/2, 0, maxRadius * easeOut);
                gradE.addColorStop(0, `rgba(255, 255, 255, ${0.2 * (1-p)})`);
                gradE.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradE;
                ctx.beginPath();
                ctx.arc(width / 2, 0, maxRadius * easeOut, 0, Math.PI);
                ctx.fill();
                break;
            case 'light1':
            case 'light2':
            case 'light3':
                // Spotlight with rays
                const lIntensity = vfx.type === 'light1' ? 0.2 : vfx.type === 'light2' ? 0.4 : 0.7;
                const beamCount = 8;
                ctx.globalAlpha = (1 - easeOut) * lIntensity;
                for (let i = 0; i < beamCount; i++) {
                    const angle = (Math.PI / (beamCount - 1)) * i;
                    ctx.beginPath();
                    ctx.moveTo(width / 2, 0);
                    ctx.lineTo(width / 2 + Math.cos(angle) * width * 1.5, Math.sin(angle) * height);
                    ctx.lineTo(width / 2 + Math.cos(angle + 0.1) * width * 1.5, Math.sin(angle + 0.1) * height);
                    ctx.closePath();
                    const gradL = ctx.createRadialGradient(width/2, 0, 0, width/2, 0, width);
                    gradL.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                    gradL.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = gradL;
                    ctx.fill();
                }
                break;
            case 'glitter1':
            case 'glitter2':
            case 'glitter3':
                const glCount = vfx.type === 'glitter1' ? 30 : vfx.type === 'glitter2' ? 60 : 120;
                ctx.globalAlpha = 1 - easeOut;
                for (let i = 0; i < glCount; i++) {
                    const gx = (Math.sin(i * 123 + (vfx.randomSeed || 0)) * 0.5 + 0.5) * width;
                    const gy = (Math.cos(i * 456 + (vfx.randomSeed || 0)) * 0.5 + 0.5) * height;
                    const gSize = Math.random() * 4 * (1 - p);
                    ctx.fillStyle = '#fff';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#fff';
                    ctx.beginPath(); ctx.arc(gx, gy, gSize, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'heart1':
            case 'heart2':
            case 'heart3':
                // Fixed reference to undefined 'vfxType' by using 'vfx.type'
                const hCount = vfx.type === 'heart1' ? 5 : vfx.type === 'heart2' ? 12 : 25;
                ctx.globalAlpha = 1 - easeOut;
                for (let i = 0; i < hCount; i++) {
                    const hx = (Math.sin(i * 777 + (vfx.randomSeed || 0)) * 0.5 + 0.5) * width;
                    const hy = (1 - easeOut) * height - i * 20;
                    ctx.fillStyle = '#ff0044';
                    ctx.beginPath();
                    ctx.moveTo(hx, hy);
                    ctx.bezierCurveTo(hx - 10, hy - 10, hx - 20, hy + 5, hx, hy + 15);
                    ctx.bezierCurveTo(hx + 20, hy + 5, hx + 10, hy - 10, hx, hy);
                    ctx.fill();
                }
                break;
            case 'wipeDown':
                ctx.globalAlpha = 1 - easeOut;
                ctx.fillRect(0, 0, width, height * easeOut);
                break;
            case 'wipeUp':
                ctx.globalAlpha = 1 - easeOut;
                ctx.fillRect(0, height * (1 - easeOut), width, height);
                break;
            case 'wipeLeft':
                ctx.globalAlpha = 1 - easeOut;
                ctx.fillRect(0, 0, width * easeOut, height);
                break;
            case 'wipeRight':
                ctx.globalAlpha = 1 - easeOut;
                ctx.fillRect(width * (1 - easeOut), 0, width * easeOut, height);
                break;
        }
        ctx.restore();
    });

    // Render Note Explosions
    activeExplosions = activeExplosions.filter(ex => now - ex.startTime < 500);
    activeExplosions.forEach(ex => {
        const p = (now - ex.startTime) / 500;
        ex.particles.forEach(pt => {
            pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.1; pt.alpha *= 0.96;
            ctx.save();
            ctx.globalAlpha = pt.alpha;
            ctx.fillStyle = pt.color;
            ctx.shadowBlur = 5;
            ctx.shadowColor = pt.color;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    });
}

// -- Drawing Logic --
function drawWaveform(currentTime: number) {
    if (!waveformPeaks) return;
    const { width, height } = waveformCanvas;
    const hitZoneY = height * 0.8;
    ctxWave.fillStyle = '#0a0a0c'; 
    ctxWave.fillRect(0, 0, width, height);
    ctxWave.fillStyle = WAVEFORM_COLOR;
    const barHeight = 1;
    for (let y = 0; y < height; y += barHeight) {
        const timeAtY = (currentTime - audioOffset) + (hitZoneY - y) / pixelsPerSecondEditor;
        if (timeAtY < 0 || timeAtY > duration) continue;
        const peakIdx = Math.floor((timeAtY / duration) * PEAK_RESOLUTION);
        const val = waveformPeaks[peakIdx] || 0;
        ctxWave.fillRect(width / 2 - (val * width * 0.8) / 2, y, val * width * 0.8, barHeight);
    }
}

function drawEditor(currentTime: number) {
    const { width, height } = editorCanvas;
    const hitZoneY = height * 0.8;
    ctxEdit.clearRect(0, 0, width, height);
    const laneWidth = width / lanes.length;
    const timeMin = currentTime - (height - hitZoneY) / pixelsPerSecondEditor;
    const timeMax = currentTime + (hitZoneY) / pixelsPerSecondEditor;

    lanes.forEach((l, i) => {
        ctxEdit.strokeStyle = GRID_COLOR;
        ctxEdit.beginPath(); ctxEdit.moveTo(i * laneWidth, 0); ctxEdit.lineTo(i * laneWidth, height); ctxEdit.stroke();
    });

    const timePerBeat = tickToTime(TICKS_PER_BAR / BEATS_PER_BAR);
    const timePerBar = tickToTime(TICKS_PER_BAR);
    const firstBar = Math.floor(timeMin / timePerBar) * timePerBar;
    for (let t = firstBar; t < timeMax; t += timePerBeat) {
        const y = hitZoneY - (t - currentTime) * pixelsPerSecondEditor;
        const tickCount = timeToTick(t);
        const isBar = tickCount % TICKS_PER_BAR === 0;
        ctxEdit.strokeStyle = isBar ? BAR_LINE_COLOR : BEAT_LINE_COLOR;
        ctxEdit.lineWidth = isBar ? 2 : 1;
        ctxEdit.beginPath(); ctxEdit.moveTo(0, y); ctxEdit.lineTo(width, y); ctxEdit.stroke();
    }

    events.forEach(e => {
        const laneIdx = lanes.findIndex(l => l.id === e.laneId);
        if (laneIdx === -1) return;
        const eventTime = tickToTime(e.tick);
        if (eventTime >= timeMin && eventTime <= timeMax) {
            const y = hitZoneY - (eventTime - currentTime) * pixelsPerSecondEditor;
            const lane = lanes[laneIdx];
            ctxEdit.fillStyle = lane.type === 'note' ? NOTE_COLOR : VFX_COLOR;
            ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
        }
    });

    if (ghostEvent) {
        const laneIdx = lanes.findIndex(l => l.id === ghostEvent!.laneId);
        if (laneIdx !== -1) {
            const ghostTime = tickToTime(ghostEvent.tick);
            const y = hitZoneY - (ghostTime - currentTime) * pixelsPerSecondEditor;
            ctxEdit.fillStyle = GHOST_NOTE_COLOR;
            ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
        }
    }
}

function drawPreview(currentTime: number) {
    const { width, height } = previewCanvas;
    const hitZoneY = height * 0.8;
    ctxPrev.clearRect(0, 0, width, height);
    
    // Background VFX
    renderVFX(ctxPrev, width, height);
    
    // Only filter 'note' lanes for LIVE PREVIEW
    const noteLanes = lanes.filter(l => l.type === 'note');
    if (noteLanes.length === 0) return;
    
    const laneWidth = width / noteLanes.length;
    
    // Draw lit-up lanes on note hit
    const now = performance.now();
    activeExplosions.forEach(ex => {
        const laneIdx = noteLanes.findIndex(l => l.id === ex.laneId);
        if (laneIdx !== -1) {
            const age = now - ex.startTime;
            const alpha = (1 - age / 240) * 0.2;
            const grad = ctxPrev.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, `rgba(255, 113, 206, ${alpha})`);
            grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
            ctxPrev.fillStyle = grad;
            ctxPrev.fillRect(laneIdx * laneWidth, 0, laneWidth, height);
        }
    });

    const timeMaxInView = currentTime + (hitZoneY / pixelsPerSecondLive);
    
    events.forEach(e => {
        const laneIdx = noteLanes.findIndex(l => l.id === e.laneId);
        if (laneIdx === -1) return;
        
        const noteTime = tickToTime(e.tick);
        if (noteTime >= currentTime && noteTime <= timeMaxInView) {
            const y = hitZoneY - (noteTime - currentTime) * pixelsPerSecondLive;
            ctxPrev.fillStyle = NOTE_COLOR;
            ctxPrev.shadowBlur = 15; ctxPrev.shadowColor = NOTE_COLOR;
            ctxPrev.beginPath(); ctxPrev.roundRect(laneIdx * laneWidth + 12, y - noteThicknessLive/2, laneWidth - 24, noteThicknessLive, 4); ctxPrev.fill();
            ctxPrev.shadowBlur = 0;
        }
    });
}

function updateTimeDisplay(time: number) {
    const t = Math.max(0, time);
    const mins = Math.floor(t / 60).toString().padStart(2, '0');
    const secs = Math.floor(t % 60).toString().padStart(2, '0');
    const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
    currentTimeDisplay.textContent = `${mins}:${secs}.${ms}`;
}

let lastFrameTime = 0;
function renderLoop() {
    if (!ctxWave) { requestAnimationFrame(renderLoop); return; }
    const currentTime = isPlaying ? (audioContext.currentTime - startTime) : pauseOffset;
    drawWaveform(currentTime);
    drawEditor(currentTime);
    drawPreview(currentTime);
    updateTimeDisplay(currentTime);
    
    if (isPlaying) {
        const noteLanes = lanes.filter(l => l.type === 'note');
        events.forEach(e => {
            const eventTime = tickToTime(e.tick);
            if (eventTime <= currentTime && eventTime > lastFrameTime) {
                const lane = lanes.find(l => l.id === e.laneId);
                if (lane) {
                    if (lane.type === 'note') {
                        const laneIdx = noteLanes.indexOf(lane);
                        createNoteExplosion(lane.id, laneIdx, noteLanes.length);
                    } else if (lane.type === 'vfx' && lane.vfxType) {
                        triggerVFX(lane.id, lane.vfxType);
                    }
                }
            }
        });
    }
    lastFrameTime = currentTime;
    requestAnimationFrame(renderLoop);
}

init();