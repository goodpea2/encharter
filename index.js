// --- Rhythm Studio: Professional Vfx Editor v3.9 (JS Edition) ---

import { GoogleGenAI } from "@google/genai";

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

const BURST_VFX = [
    'explode1', 'explode2', 'explode3', 
    'wipeUp', 'wipeDown', 'wipeLeft', 'wipeRight', 
    'light1', 'light2', 'light3',
    'glitter1', 'glitter2', 'glitter3',
    'heart1', 'heart2', 'heart3'
];
const IDLE_VFX = [
    'sparkle1', 'sparkle2', 'sparkle3',
    'flames1', 'flames2', 'flames3',
    'confetti1', 'confetti2', 'confetti3'
];

// -- App State --
let audioContext;
let audioBuffer = null;
let audioSource = null;
let gainNode;

let waveformPeaks = null;
const PEAK_RESOLUTION = 10000; 

let lanes = [
    { id: 0, type: 'note' },
    { id: 1, type: 'note' },
    { id: 2, type: 'note' },
    { id: 3, type: 'note' }
];
let events = [];
let activeBurstVFX = [];
let loopingVFX = new Map(); // laneId -> VFXType
let activeExplosions = [];

let bpm = 120;
let gridSnap = 6; 
let pixelsPerSecondEditor = 300; 
let pixelsPerSecondLive = 625;   
let noteThicknessLive = 18;
let noteWidthScale = 0.8; // 80%
let vfxAlpha = 0.25;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let audioOffset = 0; 
let duration = 300; // Default 5 mins for silent composition
let nextId = 0;
let isInvertedScroll = true;

// Custom Assets
let customBgImage = null;
let customNoteImage = null;
let customNoteRect = { x: 0, y: 0, w: 0, h: 0 }; // in IMAGE PIXELS

// Modal State
let editingLaneId = null;

// Input State
let ghostEvent = null;
let isLeftDragging = false;
let isRightDragging = false;
let isMiddleDragging = false;
let lastMouseY = 0;
let isShiftPressed = false;

// Sprite Editor State
let spriteEditorActive = false;
let dragTarget = null; // 'tl', 'tr', 'bl', 'br', 'center'
let dragOffset = { x: 0, y: 0 };
let currentSpriteRect = { x: 0, y: 0, w: 0, h: 0 }; // in IMAGE PIXELS
let displayScale = 1.0;

// -- DOM Elements --
let audioInput, projectInput, trackNameLabel, playBtn, playIcon, pauseIcon, bpmInput, volumeSlider, zoomInput, liveSpeedInput, thicknessInput, widthScaleInput, vfxAlphaInput, invertScrollToggle, snapSelect, exportBtn, importBtn, addLaneBtn, currentTimeDisplay, offsetDisplay, laneHeaders, vfxModal, burstVfxList, idleVfxList, waveformCanvas, editorCanvas, previewCanvas, ctxWave, ctxEdit, ctxPrev;
let bgInput, noteSpriteInput, noteEditBtn, spriteModal, spriteEditorCanvas, ctxSprite, saveSpriteBtn, closeSpriteBtn, spriteUploadBtn;
let resizer1, resizer2, waveformPanel, editorPanel, previewPanel, dragOverlay;

// -- Initialization --
function init() {
    audioInput = document.getElementById('audioInput');
    projectInput = document.getElementById('projectInput');
    trackNameLabel = document.getElementById('trackName');
    playBtn = document.getElementById('playBtn');
    playIcon = document.getElementById('playIcon');
    pauseIcon = document.getElementById('pauseIcon');
    bpmInput = document.getElementById('bpmInput');
    volumeSlider = document.getElementById('volumeSlider');
    zoomInput = document.getElementById('zoomInput');
    liveSpeedInput = document.getElementById('liveSpeedInput');
    thicknessInput = document.getElementById('thicknessInput');
    widthScaleInput = document.getElementById('widthScaleInput');
    vfxAlphaInput = document.getElementById('vfxAlphaInput');
    invertScrollToggle = document.getElementById('invertScrollToggle');
    snapSelect = document.getElementById('snapSelect');
    exportBtn = document.getElementById('exportBtn');
    importBtn = document.getElementById('importBtn');
    addLaneBtn = document.getElementById('addLaneBtn');
    currentTimeDisplay = document.getElementById('currentTimeDisplay');
    offsetDisplay = document.getElementById('offsetDisplay');
    laneHeaders = document.getElementById('laneHeaders');

    vfxModal = document.getElementById('vfxModal');
    burstVfxList = document.getElementById('burstVfxList');
    idleVfxList = document.getElementById('idleVfxList');

    waveformCanvas = document.getElementById('waveformCanvas');
    editorCanvas = document.getElementById('editorCanvas');
    previewCanvas = document.getElementById('previewCanvas');

    ctxWave = waveformCanvas.getContext('2d', { alpha: false });
    ctxEdit = editorCanvas.getContext('2d');
    ctxPrev = previewCanvas.getContext('2d');

    // Sprite Elements
    bgInput = document.getElementById('bgInput');
    noteSpriteInput = document.getElementById('noteSpriteInput');
    noteEditBtn = document.getElementById('noteEditBtn');
    spriteModal = document.getElementById('spriteModal');
    spriteEditorCanvas = document.getElementById('spriteEditorCanvas');
    ctxSprite = spriteEditorCanvas.getContext('2d');
    saveSpriteBtn = document.getElementById('saveSpriteBtn');
    closeSpriteBtn = document.getElementById('closeSpriteBtn');
    spriteUploadBtn = document.getElementById('spriteUploadBtn');

    // Resizers
    resizer1 = document.getElementById('resizer1');
    resizer2 = document.getElementById('resizer2');
    waveformPanel = document.getElementById('waveformPanel');
    editorPanel = document.getElementById('editorPanel');
    previewPanel = document.getElementById('previewPanel');
    dragOverlay = document.getElementById('dragOverlay');

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.5;

    setupListeners();
    renderLaneHeaders();
    renderVfxOptions();
    handleResize();
    requestAnimationFrame(renderLoop);
    
    // Load default project and audio track
    loadDefaultData();
}

async function loadDefaultData() {
    try {
        // Fetch project JSON
        const projectRes = await fetch('data/sample.json');
        if (projectRes.ok) {
            const data = await projectRes.json();
            lanes = data.lanes || [];
            events = data.events || [];
            audioOffset = data.audioOffset || 0;
            bpm = data.bpm || 120;
            bpmInput.value = bpm;
            nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
            updateOffsetDisplay();
            renderLaneHeaders();
        }

        // Fetch audio file
        const audioRes = await fetch('audio/sample.mp3');
        if (audioRes.ok) {
            trackNameLabel.textContent = "sample.mp3";
            const arrayBuffer = await audioRes.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration;
            calculateWaveformPeaks();
        } else {
            console.log("No default audio found. Metronome mode active.");
            trackNameLabel.textContent = "No Audio loaded";
        }
    } catch (err) {
        console.warn("Default data load failed. App will initialize empty.", err);
    }
}

// -- Helper Conversions --
function tickToTime(tick) {
    return tick / ((TICKS_PER_BAR * bpm) / 240);
}

function timeToTick(time) {
    return Math.round(time * ((TICKS_PER_BAR * bpm) / 240));
}

function setupListeners() {
    audioInput.addEventListener('change', handleAudioUpload);
    projectInput.addEventListener('change', handleProjectImportFile);
    bgInput.addEventListener('change', handleBgUpload);
    noteSpriteInput.addEventListener('change', handleNoteSpriteUpload);

    noteEditBtn.addEventListener('click', () => {
        if (customNoteImage) {
            openSpriteEditor();
        } else {
            noteSpriteInput.click();
        }
    });

    spriteUploadBtn.addEventListener('click', () => noteSpriteInput.click());

    playBtn.addEventListener('click', togglePlayback);
    exportBtn.addEventListener('click', exportProject);
    importBtn.addEventListener('click', () => projectInput.click());
    addLaneBtn.addEventListener('click', addNewLane);

    bpmInput.addEventListener('change', () => { bpm = parseInt(bpmInput.value) || 120; });
    volumeSlider.addEventListener('input', () => { gainNode.gain.value = parseFloat(volumeSlider.value); });
    zoomInput.addEventListener('input', () => { pixelsPerSecondEditor = parseInt(zoomInput.value); });
    liveSpeedInput.addEventListener('input', () => { pixelsPerSecondLive = parseInt(liveSpeedInput.value); });
    thicknessInput.addEventListener('input', () => { noteThicknessLive = parseInt(thicknessInput.value); });
    widthScaleInput.addEventListener('input', () => { noteWidthScale = parseInt(widthScaleInput.value) / 100; });
    vfxAlphaInput.addEventListener('input', () => { vfxAlpha = parseFloat(vfxAlphaInput.value); });
    invertScrollToggle.addEventListener('change', () => { isInvertedScroll = invertScrollToggle.checked; });
    snapSelect.addEventListener('change', () => { gridSnap = parseInt(snapSelect.value); });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => { vfxModal.style.display = 'none'; });
    document.getElementById('setNoteOption')?.addEventListener('click', () => setLaneType('note'));
    document.getElementById('deleteLaneBtn')?.addEventListener('click', deleteCurrentLane);

    saveSpriteBtn.onclick = saveSpriteRect;
    closeSpriteBtn.onclick = () => { spriteModal.style.display = 'none'; spriteEditorActive = false; };

    // Column Resizing
    const initResizer = (resizer, targetPanel, isRightSide) => {
        let startX = 0;
        let startBasis = 0;
        const onMouseMove = (e) => {
            let dx = e.clientX - startX;
            if (isRightSide) dx = -dx; 
            const containerWidth = document.getElementById('workspaceLayout').clientWidth;
            const newBasis = ((startBasis + dx) / containerWidth) * 100;
            targetPanel.style.flexBasis = `${Math.max(5, Math.min(80, newBasis))}%`;
            handleResize();
        };
        const onMouseUp = () => {
            resizer.classList.remove('dragging');
            dragOverlay.style.display = 'none';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        resizer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startBasis = targetPanel.getBoundingClientRect().width;
            resizer.classList.add('dragging');
            dragOverlay.style.display = 'block';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };
    initResizer(resizer1, waveformPanel, false);
    initResizer(resizer2, previewPanel, true);

    window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) isLeftDragging = false;
        if (e.button === 2) isRightDragging = false;
        if (e.button === 1) isMiddleDragging = false;
        if (spriteEditorActive) dragTarget = null;
    });

    editorCanvas.addEventListener('mousedown', (e) => {
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
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
        const snappedTick = Math.round(timeToTick(timeAtMouse) / gridSnap) * gridSnap;
        ghostEvent = laneId !== undefined ? { laneId, tick: snappedTick } : null;
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        if (isLeftDragging) tryPlaceEvent();
        if (isRightDragging) tryRemoveEvent();
        if (isMiddleDragging) {
            const deltaY = e.clientY - lastMouseY;
            lastMouseY = e.clientY;
            const timeDelta = deltaY / pixelsPerSecondEditor;
            pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset - timeDelta));
            if (isPlaying) startTime = audioContext.currentTime - pauseOffset;
        }
    });

    editorCanvas.addEventListener('mouseleave', () => { ghostEvent = null; });

    const getHandleAt = (mx, my) => {
        const r = currentSpriteRect;
        const hSize = 15 / displayScale; 
        if (Math.abs(mx - r.x) < hSize && Math.abs(my - r.y) < hSize) return 'tl';
        if (Math.abs(mx - (r.x + r.w)) < hSize && Math.abs(my - r.y) < hSize) return 'tr';
        if (Math.abs(mx - r.x) < hSize && Math.abs(my - (r.y + r.h)) < hSize) return 'bl';
        if (Math.abs(mx - (r.x + r.w)) < hSize && Math.abs(my - (r.y + r.h)) < hSize) return 'br';
        if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) return 'center';
        return null;
    };

    spriteEditorCanvas.addEventListener('mousedown', (e) => {
        if (!spriteEditorActive) return;
        const rect = spriteEditorCanvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / displayScale;
        const my = (e.clientY - rect.top) / displayScale;
        dragTarget = getHandleAt(mx, my);
        if (dragTarget === 'center') {
            dragOffset = { x: mx - currentSpriteRect.x, y: my - currentSpriteRect.y };
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!spriteEditorActive || !dragTarget) return;
        const rect = spriteEditorCanvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / displayScale;
        const my = (e.clientY - rect.top) / displayScale;
        const s = currentSpriteRect;
        if (dragTarget === 'tl') {
            const dx = mx - s.x; const dy = my - s.y;
            s.x = mx; s.y = my; s.w -= dx; s.h -= dy;
        } else if (dragTarget === 'tr') {
            const dy = my - s.y;
            s.w = mx - s.x; s.y = my; s.h -= dy;
        } else if (dragTarget === 'bl') {
            const dx = mx - s.x;
            s.x = mx; s.w -= dx; s.h = my - s.y;
        } else if (dragTarget === 'br') {
            s.w = mx - s.x; s.h = my - s.y;
        } else if (dragTarget === 'center') {
            s.x = mx - dragOffset.x;
            s.y = my - dragOffset.y;
        }
        s.x = Math.max(0, Math.min(customNoteImage.width - 10, s.x));
        s.y = Math.max(0, Math.min(customNoteImage.height - 10, s.y));
        s.w = Math.min(customNoteImage.width - s.x, Math.max(10, s.w));
        s.h = Math.min(customNoteImage.height - s.y, Math.max(10, s.h));
        renderSpriteEditor();
    });

    spriteEditorCanvas.addEventListener('mousemove', (e) => {
        if (!spriteEditorActive || dragTarget) return;
        const rect = spriteEditorCanvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / displayScale;
        const my = (e.clientY - rect.top) / displayScale;
        const handle = getHandleAt(mx, my);
        if (handle === 'tl' || handle === 'br') spriteEditorCanvas.style.cursor = 'nwse-resize';
        else if (handle === 'tr' || handle === 'bl') spriteEditorCanvas.style.cursor = 'nesw-resize';
        else if (handle === 'center') spriteEditorCanvas.style.cursor = 'move';
        else spriteEditorCanvas.style.cursor = 'default';
    });

    let isScrubbing = false;
    waveformCanvas.addEventListener('mousedown', (e) => { 
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        isScrubbing = true; 
        lastMouseY = e.clientY; 
    });
    window.addEventListener('mouseup', () => isScrubbing = false);
    waveformCanvas.addEventListener('mousemove', (e) => {
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block' || !isScrubbing) return;
        const currentY = e.clientY;
        const deltaY = currentY - lastMouseY;
        const timeDelta = deltaY / pixelsPerSecondEditor;
        if (isShiftPressed && audioBuffer) {
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
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        const direction = isInvertedScroll ? 1 : -1;
        const delta = e.deltaY * 0.002 * direction;
        pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset + delta));
        if (isPlaying) startTime = audioContext.currentTime - pauseOffset;
    }, { passive: true });
}

// -- Assets Handling --
function handleBgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => { customBgImage = img; };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function handleNoteSpriteUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            customNoteImage = img;
            openSpriteEditor();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function openSpriteEditor() {
    spriteModal.style.display = 'block';
    spriteEditorActive = true;
    const container = spriteEditorCanvas.parentElement;
    const cWidth = container.clientWidth - 40;
    const cHeight = container.clientHeight - 40;
    displayScale = Math.min(cWidth / customNoteImage.width, cHeight / customNoteImage.height);
    spriteEditorCanvas.width = customNoteImage.width * displayScale;
    spriteEditorCanvas.height = customNoteImage.height * displayScale;
    if (customNoteRect.w === 0) {
        const w = customNoteImage.width * 0.8;
        const h = customNoteImage.height * 0.2;
        currentSpriteRect = { x: (customNoteImage.width - w) / 2, y: (customNoteImage.height - h) / 2, w: w, h: h };
    } else {
        currentSpriteRect = { ...customNoteRect };
    }
    renderSpriteEditor();
}

function renderSpriteEditor() {
    const { width, height } = spriteEditorCanvas;
    ctxSprite.clearRect(0, 0, width, height);
    ctxSprite.drawImage(customNoteImage, 0, 0, width, height);
    const rx = currentSpriteRect.x * displayScale;
    const ry = currentSpriteRect.y * displayScale;
    const rw = currentSpriteRect.w * displayScale;
    const rh = currentSpriteRect.h * displayScale;
    ctxSprite.fillStyle = 'rgba(0,0,0,0.7)';
    ctxSprite.fillRect(0, 0, width, ry);
    ctxSprite.fillRect(0, ry + rh, width, height - (ry + rh));
    ctxSprite.fillRect(0, ry, rx, rh);
    ctxSprite.fillRect(rx + rw, ry, width - (rx + rw), rh);
    ctxSprite.strokeStyle = '#ff71ce';
    ctxSprite.lineWidth = 2;
    ctxSprite.strokeRect(rx, ry, rw, rh);
    ctxSprite.fillStyle = '#fff';
    ctxSprite.strokeStyle = '#000';
    ctxSprite.lineWidth = 1;
    const hSize = 5;
    [ [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh] ].forEach(([hx, hy]) => {
        ctxSprite.beginPath(); ctxSprite.arc(hx, hy, hSize, 0, Math.PI * 2); ctxSprite.fill(); ctxSprite.stroke();
    });
}

function saveSpriteRect() {
    customNoteRect = { ...currentSpriteRect };
    spriteModal.style.display = 'none';
    spriteEditorActive = false;
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
    const createBtn = (type, target) => {
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

function openVfxModal(laneId) {
    editingLaneId = laneId;
    vfxModal.style.display = 'block';
}

function setLaneType(type) {
    if (editingLaneId === null) return;
    const lane = lanes.find(l => l.id === editingLaneId);
    if (lane) {
        lane.type = type;
        lane.vfxType = undefined;
        renderLaneHeaders();
        vfxModal.style.display = 'none';
    }
}

function setVfxType(vfx) {
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
    const data = { lanes, events, audioOffset, bpm, ticksPerBar: TICKS_PER_BAR, version: "3.5" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleProjectImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        lanes = data.lanes || [];
        events = data.events || [];
        audioOffset = data.audioOffset || 0;
        bpm = data.bpm || 120;
        bpmInput.value = bpm;
        nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
        updateOffsetDisplay();
        renderLaneHeaders();
    } catch (err) { alert("Load Error"); }
    projectInput.value = ''; 
}

function updateOffsetDisplay() {
    offsetDisplay.textContent = `${Math.round(audioOffset * 1000)}ms`;
}

function tryPlaceEvent() {
    if (!ghostEvent) return;
    const existing = events.find(e => e.laneId === ghostEvent.laneId && e.tick === ghostEvent.tick);
    if (!existing) {
        events.push({ ...ghostEvent, id: nextId++ });
    }
}

function tryRemoveEvent() {
    if (!ghostEvent) return;
    events = events.filter(e => !(e.laneId === ghostEvent.laneId && e.tick === ghostEvent.tick));
}

function handleResize() {
    [waveformCanvas, editorCanvas, previewCanvas].forEach(canvas => {
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }
    });
}

// -- Audio Handling --
async function handleAudioUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    trackNameLabel.textContent = file.name;
    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        duration = audioBuffer.duration;
        calculateWaveformPeaks();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    } catch (err) {
        alert("Audio decode failed. Ensure it is a valid MP3/WAV.");
    }
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

async function togglePlayback() {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    isPlaying ? pausePlayback() : startPlayback();
}

function startPlayback() {
    if (audioBuffer) {
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(gainNode);
        const audioTimeNow = Math.max(0, pauseOffset - audioOffset);
        const whenToStart = audioContext.currentTime + Math.max(0, audioOffset - pauseOffset);
        audioSource.start(whenToStart, audioTimeNow);
        audioSource.onended = () => { if (isPlaying) pausePlayback(true); };
    }
    startTime = audioContext.currentTime - pauseOffset;
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
}

function pausePlayback(atEnd = false) {
    if (!isPlaying) return;
    if (audioSource) { audioSource.stop(); audioSource = null; }
    pauseOffset = atEnd ? 0 : audioContext.currentTime - startTime;
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    activeBurstVFX = [];
    loopingVFX.clear();
    activeExplosions = [];
}

// -- VFX Engine --
function triggerVFX(laneId, type) {
    if (BURST_VFX.includes(type)) {
        activeBurstVFX.push({ type, startTime: performance.now(), progress: 0, active: true, laneId, randomSeed: Math.random() });
    } else if (IDLE_VFX.includes(type)) {
        if (loopingVFX.get(laneId) === type) loopingVFX.delete(laneId);
        else loopingVFX.set(laneId, type);
    }
}

function createNoteExplosion(laneId, laneIdx, totalLanes) {
    const laneWidth = previewCanvas.width / totalLanes;
    const centerX = laneIdx * laneWidth + laneWidth / 2;
    const centerY = previewCanvas.height * 0.8;
    const particles = [];
    for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x: centerX, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
            size: 1 + Math.random() * 4, color: NOTE_COLOR, alpha: 1
        });
    }
    activeExplosions.push({ laneId, startTime: performance.now(), particles });
}

function drawHeart(ctx, x, y, size) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - size/2, y - size/2, x - size, y + size/4, x, y + size);
    ctx.bezierCurveTo(x + size, y + size/4, x + size/2, y - size/2, x, y);
    ctx.fill();
}

function renderVFX(ctx, width, height) {
    const now = performance.now();
    loopingVFX.forEach((vfxType) => {
        ctx.save();
        switch (vfxType) {
            case 'sparkle1':
            case 'sparkle2':
            case 'sparkle3':
                const density = vfxType === 'sparkle1' ? 20 : vfxType === 'sparkle2' ? 50 : 100;
                for (let i = 0; i < density; i++) {
                    const seed = i * 1234.56;
                    const x = ((Math.sin(seed) + 1) / 2) * width;
                    const y = ((Math.cos(seed * 0.8) + 1) / 2) * height;
                    const flicker = (Math.sin(now * 0.005 + seed) + 1) / 2;
                    const size = (flicker * 3) + 1;
                    ctx.globalAlpha = flicker * 0.8 * vfxAlpha;
                    ctx.fillStyle = "#fff";
                    ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
                    ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
                    ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
                    ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'flames1':
            case 'flames2':
            case 'flames3':
                const fCount = vfxType === 'flames1' ? 60 : vfxType === 'flames2' ? 120 : 250;
                for (let i = 0; i < fCount; i++) {
                    const t = (now * 0.001 + i * (1/fCount) * 10) % 1;
                    const x = (Math.sin(i * 555) * 0.45 + 0.5) * width + Math.sin(now * 0.002 + i) * 30;
                    const y = height * (1 - t);
                    const size = (1 - t) * (vfxType === 'flames1' ? 15 : 25);
                    const alpha = (1 - t) * 0.6 * vfxAlpha;
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); grad.addColorStop(0.2, `rgba(255, 220, 0, ${alpha})`);
                    grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`); grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'confetti1':
            case 'confetti2':
            case 'confetti3':
                const cCount = vfxType === 'confetti1' ? 40 : vfxType === 'confetti2' ? 80 : 160;
                const colors = ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'];
                for (let i = 0; i < cCount; i++) {
                    const t = (now * 0.0004 + i * 0.13) % 1;
                    const x = ((Math.sin(i * 99) + 1) / 2) * width + Math.sin(now * 0.001 + i) * 20;
                    const y = t * height;
                    const rotate = now * 0.01 + i; const flip = Math.sin(now * 0.008 + i);
                    ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.9 * vfxAlpha;
                    ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.scale(1, flip); ctx.fillRect(-5, -5, 10, 10); ctx.restore();
                }
                break;
        }
        ctx.restore();
    });

    activeBurstVFX = activeBurstVFX.filter(v => v.active);
    activeBurstVFX.forEach(vfx => {
        const dur = 700;
        vfx.progress = (now - vfx.startTime) / dur;
        if (vfx.progress >= 1) { vfx.active = false; return; }
        const p = vfx.progress; const easeOut = 1 - Math.pow(1 - p, 4);
        ctx.save();
        switch (vfx.type) {
            case 'heart1':
            case 'heart2':
            case 'heart3':
                const hCount = vfx.type === 'heart1' ? 8 : vfx.type === 'heart2' ? 16 : 32;
                ctx.globalAlpha = (1 - p) * vfxAlpha;
                for (let i = 0; i < hCount; i++) {
                    const angle = (i / hCount) * Math.PI * 2; const dist = easeOut * (vfx.type === 'heart3' ? 400 : 200);
                    const hx = width/2 + Math.cos(angle) * dist + Math.sin(now * 0.005 + i) * 20;
                    const hy = height * 0.8 - (p * height) + Math.sin(angle) * 50;
                    const hSize = (1 - p) * 15 + 5; ctx.fillStyle = i % 2 === 0 ? '#ff0044' : '#ff71ce';
                    ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle; drawHeart(ctx, hx, hy, hSize);
                }
                break;
            case 'glitter1':
            case 'glitter2':
            case 'glitter3':
                const glCount = vfx.type === 'glitter1' ? 40 : vfx.type === 'glitter2' ? 80 : 150;
                for (let i = 0; i < glCount; i++) {
                    const seed = i + (vfx.randomSeed * 500); const gx = ((Math.sin(seed) + 1)/2) * width;
                    const gy = ((Math.cos(seed * 0.7) + 1)/2) * height;
                    const gAlpha = (1 - p) * ((Math.sin(now * 0.02 + i) + 1)/2);
                    ctx.globalAlpha = gAlpha * vfxAlpha; ctx.fillStyle = "#fff"; ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
                    ctx.beginPath(); ctx.arc(gx, gy, Math.random() * 3 + 1, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'explode1':
            case 'explode2':
            case 'explode3':
                const maxR = vfx.type === 'explode1' ? 150 : vfx.type === 'explode2' ? 300 : 500;
                ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - p) * vfxAlpha})`;
                ctx.beginPath(); ctx.arc(width/2, 0, maxR * easeOut, 0, Math.PI); ctx.stroke();
                const gradE = ctx.createRadialGradient(width/2, 0, 0, width/2, 0, maxR * easeOut);
                gradE.addColorStop(0, 'rgba(255, 255, 255, 0)'); gradE.addColorStop(1, `rgba(255, 255, 255, ${(1 - p) * 0.3 * vfxAlpha})`);
                ctx.fillStyle = gradE; ctx.beginPath(); ctx.arc(width/2, 0, maxR * easeOut, 0, Math.PI); ctx.fill();
                break;
            case 'light1':
            case 'light2':
            case 'light3':
                const beams = 12; ctx.globalAlpha = (1 - p) * 0.5 * vfxAlpha;
                for (let i = 0; i < beams; i++) {
                    const angle = (Math.PI / beams) * i + (p * 0.5);
                    ctx.beginPath(); ctx.moveTo(width/2, 0);
                    ctx.lineTo(width/2 + Math.cos(angle) * width * 2, Math.sin(angle) * height);
                    ctx.lineTo(width/2 + Math.cos(angle + 0.1) * width * 2, Math.sin(angle + 0.1) * height);
                    ctx.fillStyle = '#fff'; ctx.fill();
                }
                break;
            case 'wipeDown':
                ctx.fillStyle = `rgba(255, 255, 255, ${(1-p)*0.4 * vfxAlpha})`; ctx.fillRect(0, 0, width, height * easeOut);
                break;
            case 'wipeUp':
                ctx.fillStyle = `rgba(255, 255, 255, ${(1-p)*0.4 * vfxAlpha})`; ctx.fillRect(0, height * (1 - easeOut), width, height);
                break;
        }
        ctx.restore();
    });

    activeExplosions = activeExplosions.filter(ex => now - ex.startTime < 500);
    activeExplosions.forEach(ex => {
        ex.particles.forEach(pt => {
            pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.12; pt.alpha *= 0.95;
            ctx.save(); ctx.globalAlpha = pt.alpha * vfxAlpha; ctx.fillStyle = pt.color;
            ctx.shadowBlur = 8; ctx.shadowColor = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    });
}

// -- Drawing Logic --
function drawWaveform(currentTime) {
    if (!waveformPeaks) return;
    const { width, height } = waveformCanvas;
    const hitZoneY = height * 0.8;
    ctxWave.fillStyle = '#0a0a0c'; ctxWave.fillRect(0, 0, width, height);
    ctxWave.fillStyle = WAVEFORM_COLOR;
    for (let y = 0; y < height; y++) {
        const timeAtY = (currentTime - audioOffset) + (hitZoneY - y) / pixelsPerSecondEditor;
        if (timeAtY < 0 || timeAtY > duration) continue;
        const peakIdx = Math.floor((timeAtY / duration) * PEAK_RESOLUTION);
        const val = waveformPeaks[peakIdx] || 0;
        ctxWave.fillRect(width / 2 - (val * width * 0.8) / 2, y, val * width * 0.8, 1);
    }
}

function drawEditor(currentTime) {
    const { width, height } = editorCanvas;
    const hitZoneY = height * 0.8;
    ctxEdit.clearRect(0, 0, width, height);
    const laneWidth = width / lanes.length;
    const timeMin = currentTime - (height - hitZoneY) / pixelsPerSecondEditor;
    const timeMax = currentTime + (hitZoneY) / pixelsPerSecondEditor;
    lanes.forEach((l, i) => {
        ctxEdit.strokeStyle = GRID_COLOR; ctxEdit.beginPath(); ctxEdit.moveTo(i * laneWidth, 0); ctxEdit.lineTo(i * laneWidth, height); ctxEdit.stroke();
    });
    const timePerBeat = tickToTime(TICKS_PER_BAR / BEATS_PER_BAR);
    const timePerBar = tickToTime(TICKS_PER_BAR);
    const firstBar = Math.floor(timeMin / timePerBar) * timePerBar;
    for (let t = firstBar; t < timeMax; t += timePerBeat) {
        const y = hitZoneY - (t - currentTime) * pixelsPerSecondEditor;
        const tickCount = timeToTick(t);
        const isBar = tickCount % TICKS_PER_BAR === 0;
        ctxEdit.strokeStyle = isBar ? BAR_LINE_COLOR : BEAT_LINE_COLOR; ctxEdit.lineWidth = isBar ? 2 : 1;
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
        const laneIdx = lanes.findIndex(l => l.id === ghostEvent.laneId);
        if (laneIdx !== -1) {
            const y = hitZoneY - (tickToTime(ghostEvent.tick) - currentTime) * pixelsPerSecondEditor;
            ctxEdit.fillStyle = GHOST_NOTE_COLOR;
            ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
        }
    }
}

function drawPreview(currentTime) {
    const { width, height } = previewCanvas;
    const hitZoneY = height * 0.8;
    ctxPrev.clearRect(0, 0, width, height);
    if (customBgImage) {
        const scale = Math.max(width / customBgImage.width, height / customBgImage.height);
        const x = (width / 2) - (customBgImage.width / 2) * scale;
        const y = (height / 2) - (customBgImage.height / 2) * scale;
        ctxPrev.drawImage(customBgImage, x, y, customBgImage.width * scale, customBgImage.height * scale);
        ctxPrev.fillStyle = 'rgba(0,0,0,0.3)'; ctxPrev.fillRect(0,0,width,height);
    }
    renderVFX(ctxPrev, width, height);
    const noteLanes = lanes.filter(l => l.type === 'note');
    if (noteLanes.length === 0) return;
    const laneWidth = width / noteLanes.length;
    activeExplosions.forEach(ex => {
        const laneIdx = noteLanes.findIndex(l => l.id === ex.laneId);
        if (laneIdx !== -1) {
            const age = performance.now() - ex.startTime;
            const alpha = (1 - age / 240) * 0.25 * vfxAlpha;
            const grad = ctxPrev.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, `rgba(255, 113, 206, ${alpha})`); grad.addColorStop(1, 'rgba(255, 113, 206, 0)');
            ctxPrev.fillStyle = grad; ctxPrev.fillRect(laneIdx * laneWidth, 0, laneWidth, height);
        }
    });
    const timeMaxInView = currentTime + (hitZoneY / pixelsPerSecondLive);
    events.forEach(e => {
        const laneIdx = noteLanes.findIndex(l => l.id === e.laneId);
        if (laneIdx === -1) return;
        const noteTime = tickToTime(e.tick);
        if (noteTime >= currentTime && noteTime <= timeMaxInView) {
            const y = hitZoneY - (noteTime - currentTime) * pixelsPerSecondLive;
            const visualWidth = laneWidth * noteWidthScale;
            const destX = laneIdx * laneWidth + (laneWidth - visualWidth) / 2;
            const destY = y - noteThicknessLive/2;
            const destW = visualWidth; const destH = noteThicknessLive;
            if (customNoteImage && customNoteRect.w > 0) {
                ctxPrev.drawImage(customNoteImage, customNoteRect.x, customNoteRect.y, customNoteRect.w, customNoteRect.h, destX, destY, destW, destH);
            } else {
                ctxPrev.fillStyle = NOTE_COLOR; ctxPrev.shadowBlur = 20; ctxPrev.shadowColor = NOTE_COLOR;
                ctxPrev.beginPath(); ctxPrev.roundRect(destX, destY, destW, destH, 4); ctxPrev.fill(); ctxPrev.shadowBlur = 0;
            }
        }
    });
}

function updateTimeDisplay(time) {
    const t = Math.max(0, time);
    const mins = Math.floor(t / 60).toString().padStart(2, '0');
    const secs = Math.floor(t % 60).toString().padStart(2, '0');
    const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
    currentTimeDisplay.textContent = `${mins}:${secs}.${ms}`;
}

let lastFrameTime = 0;
function renderLoop() {
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
                    if (lane.type === 'note') createNoteExplosion(lane.id, noteLanes.indexOf(lane), noteLanes.length);
                    else if (lane.type === 'vfx' && lane.vfxType) triggerVFX(lane.id, lane.vfxType);
                }
            }
        });
    }
    lastFrameTime = currentTime;
    requestAnimationFrame(renderLoop);
}

init();