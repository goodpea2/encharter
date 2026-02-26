import { 
    TICKS_PER_BAR, BEATS_PER_BAR, NOTE_COLOR, LONG_NOTE_COLOR, VFX_COLOR, 
    GHOST_NOTE_COLOR, GRID_COLOR, BEAT_LINE_COLOR, BAR_LINE_COLOR, 
    WAVEFORM_COLOR, HOLD_GAP_THRESHOLD, BURST_VFX, IDLE_VFX 
} from './constants.js';
import { lerp } from './utils/math.js';
import { tickToTime, timeToTick } from './utils/time.js';
import { draw9Slice } from './utils/rendering.js';
import { getNoteSegments } from './utils/noteUtils.js';
import { calculateWaveformPeaks } from './utils/waveform.js';
import { AudioEngine } from './core/audioEngine.js';
import { renderAllVFX } from './vfx/vfxManager.js';
import { createNoteExplosion } from './vfx/Explosions.js';
import { getHandleAt, renderSpriteEditor } from './core/spriteEditor.js';

// -- App State --
let audioEngine;
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
let speedLerp = 0;
let noteThicknessLive = 18;
let noteWidthScale = 0.8; 
let vfxAlpha = 0.25;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let audioOffset = 0; 
let duration = 300; 
let nextId = 0;
let isInvertedScroll = true;

// Custom Assets
let customBgImage = null;
let customNoteImage = null;
let customNoteRect = { x: 0, y: 0, w: 0, h: 0 };
let customLongNoteImage = null;
let customLongNoteRect = { x: 0, y: 0, w: 0, h: 0, s1: 0, s2: 0, v1: 0, v2: 0 }; 

// Modal State
let editingLaneId = null;
let spriteEditorMode = 'normal'; // 'normal' or 'long'

// Input State
let ghostEvent = null;
let isLeftDragging = false;
let isRightDragging = false;
let isMiddleDragging = false;
let lastMouseY = 0;
let isShiftPressed = false;

// Sprite Editor State
let spriteEditorActive = false;
let dragTarget = null; // 'tl', 'tr', 'bl', 'br', 'center', 's1', 's2', 'v1', 'v2'
let dragOffset = { x: 0, y: 0 };
let currentSpriteRect = { x: 0, y: 0, w: 0, h: 0, s1: 0, s2: 0, v1: 0, v2: 0 }; 
let displayScale = 1.0;

// -- DOM Elements --
let audioInput, projectInput, trackNameLabel, playBtn, playIcon, pauseIcon, bpmInput, volumeSlider, zoomInput, liveSpeedInput, thicknessInput, widthScaleInput, vfxAlphaInput, speedLerpInput, invertScrollToggle, snapSelect, exportBtn, importBtn, addLaneBtn, currentTimeDisplay, offsetDisplay, laneHeaders, vfxModal, burstVfxList, idleVfxList, waveformCanvas, editorCanvas, previewCanvas, ctxWave, ctxEdit, ctxPrev;
let bgInput, noteSpriteInput, longNoteSpriteInput, noteEditBtn, spriteModal, spriteEditorCanvas, ctxSprite, saveSpriteBtn, closeSpriteBtn, spriteUploadBtn, clearTextureBtn;
let resizer1, resizer2, waveformPanel, editorPanel, previewPanel, dragOverlay;
let tabNormalBtn, tabLongBtn, hintNormal, hintLong;

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
    speedLerpInput = document.getElementById('speedLerpInput');
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
    longNoteSpriteInput = document.getElementById('longNoteSpriteInput');
    noteEditBtn = document.getElementById('noteEditBtn');
    spriteModal = document.getElementById('spriteModal');
    spriteEditorCanvas = document.getElementById('spriteEditorCanvas');
    ctxSprite = spriteEditorCanvas.getContext('2d');
    saveSpriteBtn = document.getElementById('saveSpriteBtn');
    closeSpriteBtn = document.getElementById('closeSpriteBtn');
    spriteUploadBtn = document.getElementById('spriteUploadBtn');
    clearTextureBtn = document.getElementById('clearTextureBtn');
    tabNormalBtn = document.getElementById('tabNormalBtn');
    tabLongBtn = document.getElementById('tabLongBtn');
    hintNormal = document.getElementById('hintNormal');
    hintLong = document.getElementById('hintLong');

    // Resizers
    resizer1 = document.getElementById('resizer1');
    resizer2 = document.getElementById('resizer2');
    waveformPanel = document.getElementById('waveformPanel');
    editorPanel = document.getElementById('editorPanel');
    previewPanel = document.getElementById('previewPanel');
    dragOverlay = document.getElementById('dragOverlay');

    audioEngine = new AudioEngine();

    setupListeners();
    renderLaneHeaders();
    renderVfxOptions();
    handleResize();
    requestAnimationFrame(renderLoop);
    loadDefaultData();
}

async function loadDefaultData() {
    try {
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
        const audioRes = await fetch('audio/sample.mp3');
        if (audioRes.ok) {
            trackNameLabel.textContent = "sample.mp3";
            const arrayBuffer = await audioRes.arrayBuffer();
            const audioBuffer = await audioEngine.decodeAudio(arrayBuffer);
            duration = audioBuffer.duration;
            waveformPeaks = calculateWaveformPeaks(audioBuffer, PEAK_RESOLUTION);
        } else {
            trackNameLabel.textContent = "Silent Mode";
        }
    } catch (err) {
        console.warn("Init load failed.", err);
    }
}

function setupListeners() {
    audioInput.addEventListener('change', handleAudioUpload);
    projectInput.addEventListener('change', handleProjectImportFile);
    bgInput.addEventListener('change', handleBgUpload);
    noteSpriteInput.addEventListener('change', (e) => handleSpriteUpload(e, 'normal'));
    longNoteSpriteInput.addEventListener('change', (e) => handleSpriteUpload(e, 'long'));

    tabNormalBtn.addEventListener('click', () => { spriteEditorMode = 'normal'; updateSpriteModalUI(); });
    tabLongBtn.addEventListener('click', () => { spriteEditorMode = 'long'; updateSpriteModalUI(); });

    noteEditBtn.addEventListener('click', () => {
        openSpriteEditor();
    });

    spriteUploadBtn.addEventListener('click', () => {
        spriteEditorMode === 'normal' ? noteSpriteInput.click() : longNoteSpriteInput.click();
    });

    clearTextureBtn.addEventListener('click', () => {
        if (spriteEditorMode === 'normal') {
            customNoteImage = null;
            customNoteRect = { x: 0, y: 0, w: 0, h: 0 };
        } else {
            customLongNoteImage = null;
            customLongNoteRect = { x: 0, y: 0, w: 0, h: 0, s1: 0, s2: 0, v1: 0, v2: 0 };
        }
        renderSpriteEditorInternal();
    });

    playBtn.addEventListener('click', togglePlayback);
    exportBtn.addEventListener('click', exportProject);
    importBtn.addEventListener('click', () => projectInput.click());
    addLaneBtn.addEventListener('click', addNewLane);

    bpmInput.addEventListener('change', () => { bpm = parseInt(bpmInput.value) || 120; });
    volumeSlider.addEventListener('input', () => { audioEngine.setVolume(parseFloat(volumeSlider.value)); });
    zoomInput.addEventListener('input', () => { pixelsPerSecondEditor = parseInt(zoomInput.value); });
    liveSpeedInput.addEventListener('input', () => { pixelsPerSecondLive = parseInt(liveSpeedInput.value); });
    thicknessInput.addEventListener('input', () => { noteThicknessLive = parseInt(thicknessInput.value); });
    widthScaleInput.addEventListener('input', () => { noteWidthScale = parseInt(widthScaleInput.value) / 100; });
    vfxAlphaInput.addEventListener('input', () => { vfxAlpha = parseFloat(vfxAlphaInput.value); });
    speedLerpInput.addEventListener('input', () => { speedLerp = parseFloat(speedLerpInput.value); });
    invertScrollToggle.addEventListener('change', () => { isInvertedScroll = invertScrollToggle.checked; });
    snapSelect.addEventListener('change', () => { gridSnap = parseInt(snapSelect.value); });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => { vfxModal.style.display = 'none'; });
    document.getElementById('setNoteOption')?.addEventListener('click', () => setLaneType('note'));
    document.getElementById('deleteLaneBtn')?.addEventListener('click', deleteCurrentLane);

    saveSpriteBtn.onclick = saveSpriteRect;
    closeSpriteBtn.onclick = () => { spriteModal.style.display = 'none'; spriteEditorActive = false; };

    editorCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    window.addEventListener('blur', () => {
        isLeftDragging = false;
        isRightDragging = false;
        isMiddleDragging = false;
        dragTarget = null;
    });

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
        const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
        const timeAtMouse = currentTime + (hitZoneY - y) / pixelsPerSecondEditor;
        const snappedTick = Math.round(timeToTick(timeAtMouse, bpm) / gridSnap) * gridSnap;
        ghostEvent = laneId !== undefined ? { laneId, tick: snappedTick } : null;
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        if (isLeftDragging) tryPlaceEvent();
        if (isRightDragging) tryRemoveEvent();
        if (isMiddleDragging) {
            const deltaY = e.clientY - lastMouseY;
            lastMouseY = e.clientY;
            const timeDelta = deltaY / pixelsPerSecondEditor;
            pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset - timeDelta));
            if (isPlaying) startTime = audioEngine.currentTime - pauseOffset;
        }
    });

    spriteEditorCanvas.addEventListener('mousedown', (e) => {
        if (!spriteEditorActive) return;
        const rect = spriteEditorCanvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / displayScale;
        const my = (e.clientY - rect.top) / displayScale;
        dragTarget = getHandleAt(mx, my, currentSpriteRect, displayScale, spriteEditorMode);
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
        const img = spriteEditorMode === 'normal' ? customNoteImage : customLongNoteImage;
        if (!img) return;

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
        } else if (dragTarget === 's1') {
            s.s1 = Math.max(0, Math.min(s.s2 - 1, mx - s.x));
        } else if (dragTarget === 's2') {
            s.s2 = Math.max(s.s1 + 1, Math.min(s.w, mx - s.x));
        } else if (dragTarget === 'v1') {
            s.v1 = Math.max(0, Math.min(s.v2 - 1, my - s.y));
        } else if (dragTarget === 'v2') {
            s.v2 = Math.max(s.v1 + 1, Math.min(s.h, my - s.y));
        }

        s.x = Math.max(0, Math.min(img.width - 10, s.x));
        s.y = Math.max(0, Math.min(img.height - 10, s.y));
        s.w = Math.min(img.width - s.x, Math.max(10, s.w));
        s.h = Math.min(img.height - s.y, Math.max(10, s.h));
        renderSpriteEditorInternal();
    });

    spriteEditorCanvas.addEventListener('mousemove', (e) => {
        if (!spriteEditorActive || dragTarget) return;
        const rect = spriteEditorCanvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / displayScale;
        const my = (e.clientY - rect.top) / displayScale;
        const handle = getHandleAt(mx, my, currentSpriteRect, displayScale, spriteEditorMode);
        if (handle === 'tl' || handle === 'br') spriteEditorCanvas.style.cursor = 'nwse-resize';
        else if (handle === 'tr' || handle === 'bl') spriteEditorCanvas.style.cursor = 'nesw-resize';
        else if (handle === 'center') spriteEditorCanvas.style.cursor = 'move';
        else if (['s1', 's2', 'v1', 'v2'].includes(handle)) spriteEditorCanvas.style.cursor = handle[0] === 's' ? 'ew-resize' : 'ns-resize';
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
        const direction = isInvertedScroll ? 1 : -1;
        pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset + timeDelta * direction));
        if (isPlaying) startTime = audioEngine.currentTime - pauseOffset;
        lastMouseY = currentY;
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', (e) => {
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        const direction = isInvertedScroll ? 1 : -1;
        const delta = e.deltaY * 0.002 * direction;
        pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset + delta));
        if (isPlaying) startTime = audioEngine.currentTime - pauseOffset;
    }, { passive: true });
}

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

function handleSpriteUpload(e, mode) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            if (mode === 'normal') customNoteImage = img;
            else customLongNoteImage = img;
            spriteEditorMode = mode;
            openSpriteEditor();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateSpriteModalUI() {
    if (spriteEditorMode === 'normal') {
        tabNormalBtn.classList.add('active');
        tabLongBtn.classList.remove('active');
        hintNormal.classList.remove('hidden');
        hintLong.classList.add('hidden');
    } else {
        tabLongBtn.classList.add('active');
        tabNormalBtn.classList.remove('active');
        hintLong.classList.remove('hidden');
        hintNormal.classList.add('hidden');
    }
    openSpriteEditor();
}

function openSpriteEditor() {
    spriteModal.style.display = 'block';
    spriteEditorActive = true;
    
    const img = spriteEditorMode === 'normal' ? customNoteImage : customLongNoteImage;
    if (!img) {
        spriteEditorCanvas.width = 400;
        spriteEditorCanvas.height = 200;
        ctxSprite.clearRect(0, 0, 400, 200);
        ctxSprite.fillStyle = "#1a1a1f";
        ctxSprite.fillRect(0,0,400,200);
        ctxSprite.fillStyle = "#fff";
        ctxSprite.textAlign = "center";
        ctxSprite.fillText("No Texture Uploaded", 200, 100);
        return;
    }

    const container = spriteEditorCanvas.parentElement;
    const cWidth = container.clientWidth - 40;
    const cHeight = container.clientHeight - 40;
    
    displayScale = Math.min(cWidth / img.width, cHeight / img.height);
    spriteEditorCanvas.width = img.width * displayScale;
    spriteEditorCanvas.height = img.height * displayScale;
    
    const storedRect = spriteEditorMode === 'normal' ? customNoteRect : customLongNoteRect;

    if (storedRect.w === 0) {
        const w = img.width * 0.8;
        const h = img.height * 0.6;
        currentSpriteRect = {
            x: (img.width - w) / 2, y: (img.height - h) / 2, w: w, h: h,
            s1: w * 0.2, s2: w * 0.8, v1: h * 0.2, v2: h * 0.8
        };
    } else {
        currentSpriteRect = { ...storedRect };
    }
    renderSpriteEditorInternal();
}

function renderSpriteEditorInternal() {
    const img = spriteEditorMode === 'normal' ? customNoteImage : customLongNoteImage;
    renderSpriteEditor(ctxSprite, img, currentSpriteRect, displayScale, spriteEditorMode, spriteEditorCanvas.width, spriteEditorCanvas.height);
}

function saveSpriteRect() {
    if (spriteEditorMode === 'normal') customNoteRect = { ...currentSpriteRect };
    else customLongNoteRect = { ...currentSpriteRect };
}

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

function exportProject() {
    const data = { lanes, events, audioOffset, bpm, ticksPerBar: TICKS_PER_BAR, version: "4.2" };
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

async function handleAudioUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    trackNameLabel.textContent = file.name;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioEngine.decodeAudio(arrayBuffer);
        duration = audioBuffer.duration;
        waveformPeaks = calculateWaveformPeaks(audioBuffer, PEAK_RESOLUTION);
        await audioEngine.resume();
    } catch (err) { alert("Audio decode failed."); }
}

async function togglePlayback() {
    await audioEngine.resume();
    isPlaying ? pausePlayback() : startPlayback();
}

function startPlayback() {
    audioEngine.start(pauseOffset, audioOffset, () => { if (isPlaying) pausePlayback(true); });
    startTime = audioEngine.currentTime - pauseOffset;
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
}

function pausePlayback(atEnd = false) {
    if (!isPlaying) return;
    audioEngine.stop();
    pauseOffset = atEnd ? 0 : audioEngine.currentTime - startTime;
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    activeBurstVFX = []; loopingVFX.clear(); activeExplosions = [];
}

function triggerVFX(laneId, type) {
    if (BURST_VFX.includes(type)) {
        activeBurstVFX.push({ type, startTime: performance.now(), progress: 0, active: true, laneId, randomSeed: Math.random() });
    } else if (IDLE_VFX.includes(type)) {
        if (loopingVFX.get(laneId) === type) loopingVFX.delete(laneId);
        else loopingVFX.set(laneId, type);
    }
}

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
    const timePerBeat = tickToTime(TICKS_PER_BAR / BEATS_PER_BAR, bpm);
    const timePerBar = tickToTime(TICKS_PER_BAR, bpm);
    const firstBar = Math.floor(timeMin / timePerBar) * timePerBar;
    for (let t = firstBar; t < timeMax; t += timePerBeat) {
        const y = hitZoneY - (t - currentTime) * pixelsPerSecondEditor;
        const tickCount = timeToTick(t, bpm);
        const isBar = tickCount % TICKS_PER_BAR === 0;
        ctxEdit.strokeStyle = isBar ? BAR_LINE_COLOR : BEAT_LINE_COLOR; ctxEdit.lineWidth = isBar ? 2 : 1;
        ctxEdit.beginPath(); ctxEdit.moveTo(0, y); ctxEdit.lineTo(width, y); ctxEdit.stroke();
    }
    lanes.forEach((lane, laneIdx) => {
        const segments = lane.type === 'note' ? getNoteSegments(lane.id, events) : [];
        const isPartofLongGroup = (tick) => {
            const seg = segments.find(s => tick >= s.startTick && tick <= s.endTick);
            return seg ? seg.isLong : false;
        };
        events.filter(e => e.laneId === lane.id).forEach(e => {
            const eventTime = tickToTime(e.tick, bpm);
            if (eventTime >= timeMin && eventTime <= timeMax) {
                const y = hitZoneY - (eventTime - currentTime) * pixelsPerSecondEditor;
                if (lane.type !== 'note') ctxEdit.fillStyle = VFX_COLOR;
                else ctxEdit.fillStyle = isPartofLongGroup(e.tick) ? LONG_NOTE_COLOR : NOTE_COLOR;
                ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
            }
        });
    });
    if (ghostEvent) {
        const laneIdx = lanes.findIndex(l => l.id === ghostEvent.laneId);
        if (laneIdx !== -1) {
            const y = hitZoneY - (tickToTime(ghostEvent.tick, bpm) - currentTime) * pixelsPerSecondEditor;
            ctxEdit.fillStyle = GHOST_NOTE_COLOR; ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
        }
    }
}

function drawPreview(currentTime) {
    const { width, height } = previewCanvas;
    const hitZoneY = height * 0.8;
    ctxPrev.clearRect(0, 0, width, height);
    if (customBgImage) {
        const scale = Math.max(width / customBgImage.width, height / customBgImage.height);
        const x = (width / 2) - (customBgImage.width / 2) * scale; const y = (height / 2) - (customBgImage.height / 2) * scale;
        ctxPrev.drawImage(customBgImage, x, y, customBgImage.width * scale, customBgImage.height * scale);
        ctxPrev.fillStyle = 'rgba(0,0,0,0.3)'; ctxPrev.fillRect(0,0,width,height);
    }
    
    renderAllVFX(ctxPrev, width, height, performance.now(), loopingVFX, activeBurstVFX, activeExplosions, vfxAlpha);

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
    const lookaheadTime = hitZoneY / pixelsPerSecondLive;
    const timeMaxInView = currentTime + lookaheadTime;
    noteLanes.forEach((lane, laneIdx) => {
        const segments = getNoteSegments(lane.id, events);
        segments.forEach(seg => {
            const startT = tickToTime(seg.startTick, bpm);
            const endT = tickToTime(seg.endTick, bpm);
            if (endT < currentTime || startT > timeMaxInView) return;

            const getVisualY = (time) => {
                const timeRemaining = time - currentTime;
                const progress = Math.max(0, 1 - (timeRemaining / lookaheadTime));
                const startY = -noteThicknessLive;
                const linearY = lerp(startY, hitZoneY, progress);
                const quadY = lerp(startY, hitZoneY, progress * progress);
                return lerp(linearY, quadY, speedLerp);
            };

            const y1 = getVisualY(startT);
            const y2 = getVisualY(endT);
            const visualWidth = laneWidth * noteWidthScale;
            const destX = laneIdx * laneWidth + (laneWidth - visualWidth) / 2;
            if (seg.isLong) {
                const startEdgeY = y1 + noteThicknessLive/2;
                const endEdgeY = y2 - noteThicknessLive/2;
                const destH = Math.max(noteThicknessLive, startEdgeY - endEdgeY);
                if (customLongNoteImage && customLongNoteRect.w > 0) {
                    draw9Slice(ctxPrev, customLongNoteImage, customLongNoteRect, destX, endEdgeY, visualWidth, destH);
                } else {
                    ctxPrev.fillStyle = LONG_NOTE_COLOR; ctxPrev.shadowBlur = 15; ctxPrev.shadowColor = LONG_NOTE_COLOR;
                    ctxPrev.beginPath(); ctxPrev.roundRect(destX, endEdgeY, visualWidth, destH, 4); ctxPrev.fill(); ctxPrev.shadowBlur = 0;
                }
            } else {
                const destY = y1 - noteThicknessLive/2;
                if (customNoteImage && customNoteRect.w > 0) {
                    ctxPrev.drawImage(customNoteImage, customNoteRect.x, customNoteRect.y, customNoteRect.w, customNoteRect.h, destX, destY, visualWidth, noteThicknessLive);
                } else {
                    ctxPrev.fillStyle = NOTE_COLOR; ctxPrev.shadowBlur = 20; ctxPrev.shadowColor = NOTE_COLOR;
                    ctxPrev.beginPath(); ctxPrev.roundRect(destX, destY, visualWidth, noteThicknessLive, 4); ctxPrev.fill(); ctxPrev.shadowBlur = 0;
                }
            }
        });
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
    const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
    drawWaveform(currentTime); drawEditor(currentTime); drawPreview(currentTime); updateTimeDisplay(currentTime);
    if (isPlaying) {
        const noteLanes = lanes.filter(l => l.type === 'note');
        events.forEach(e => {
            const eventTime = tickToTime(e.tick, bpm);
            if (eventTime <= currentTime && eventTime > lastFrameTime) {
                const lane = lanes.find(l => l.id === e.laneId);
                if (lane) {
                    if (lane.type === 'note') {
                        const explosion = createNoteExplosion(lane.id, noteLanes.indexOf(lane), noteLanes.length, previewCanvas.width, previewCanvas.height);
                        activeExplosions.push(explosion);
                    }
                    else if (lane.type === 'vfx' && lane.vfxType) triggerVFX(lane.id, lane.vfxType);
                }
            }
        });
    }
    lastFrameTime = currentTime; requestAnimationFrame(renderLoop);
}

init();
