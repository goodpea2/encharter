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
    { id: 0, type: 'note', key: 'z' },
    { id: 1, type: 'note', key: 'c' },
    { id: 2, type: 'note', key: 'b' },
    { id: 3, type: 'note', key: 'm' }
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
let isRecording = false;
let recordedEvents = [];
let recordingBuffers = new Map(); // laneId -> Array of ticks
let recordingGhostNotes = new Map(); // laneId -> startTick
let lastRecordedTick = -1;
let pressedKeys = new Set();
let startTime = 0;
let pauseOffset = 0;
let audioOffset = 0; 
let duration = 300; 
let nextId = 0;
let isInvertedScroll = true;

// Custom Assets
let backgrounds = []; // { img, rect }
let shortNotes = [];  // { img, rect }
let longNotes = [];   // { img, rect }
let currentThemeIndex = 0;

// Editor Selection
let selectedAsset = null; // { type: 'bg'|'note'|'long', index: number }
let selectedEventIds = new Set();
let selectionBox = null; // { x1, y1, x2, y2 }
let isSelectionDragging = false;
let isMovingSelection = false;
let selectionDragStartTick = 0;
let selectionDragStartLaneIdx = 0;
let selectionOriginalStates = new Map(); // id -> { laneId, tick }

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
let audioInput, projectInput, trackNameLabel, playBtn, playIcon, pauseIcon, recordBtn, recordingControls, saveRecordBtn, discardRecordBtn, bpmInput, volumeSlider, zoomInput, liveSpeedInput, thicknessInput, widthScaleInput, vfxAlphaInput, speedLerpInput, invertScrollToggle, snapSelect, exportBtn, importBtn, addLaneBtn, currentTimeDisplay, offsetDisplay, offsetSlider, laneHeaders, laneKeyRow, laneHighlightLayer, vfxModal, burstVfxList, idleVfxList, waveformCanvas, editorCanvas, previewCanvas, ctxWave, ctxEdit, ctxPrev;
let bgInput, noteSpriteInput, longNoteSpriteInput, themeSettingsBtn, spriteModal, spriteEditorCanvas, ctxSprite, saveSpriteBtn, closeSpriteBtn;
let bgList, noteList, longNoteList, editorTitle, editorHint;
let resizer1, resizer2, waveformPanel, editorPanel, previewPanel, dragOverlay;
let zoomValue, liveSpeedValue, speedLerpValue, thicknessValue, widthScaleValue, vfxAlphaValue, volumeValue;
let customVfxInput, applyCustomVfxBtn;

// -- Initialization --
function init() {
    audioInput = document.getElementById('audioInput');
    projectInput = document.getElementById('projectInput');
    trackNameLabel = document.getElementById('trackName');
    playBtn = document.getElementById('playBtn');
    playIcon = document.getElementById('playIcon');
    pauseIcon = document.getElementById('pauseIcon');
    recordBtn = document.getElementById('recordBtn');
    recordingControls = document.getElementById('recordingControls');
    saveRecordBtn = document.getElementById('saveRecordBtn');
    discardRecordBtn = document.getElementById('discardRecordBtn');
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
    offsetSlider = document.getElementById('offsetSlider');
    laneHeaders = document.getElementById('laneHeaders');
    laneKeyRow = document.getElementById('laneKeyRow');
    laneHighlightLayer = document.getElementById('laneHighlightLayer');

    vfxModal = document.getElementById('vfxModal');
    burstVfxList = document.getElementById('burstVfxList');
    idleVfxList = document.getElementById('idleVfxList');
    customVfxInput = document.getElementById('customVfxInput');
    applyCustomVfxBtn = document.getElementById('applyCustomVfxBtn');

    waveformCanvas = document.getElementById('waveformCanvas');
    editorCanvas = document.getElementById('editorCanvas');
    previewCanvas = document.getElementById('previewCanvas');

    ctxWave = waveformCanvas.getContext('2d', { alpha: false });
    ctxEdit = editorCanvas.getContext('2d');
    ctxPrev = previewCanvas.getContext('2d');

    // Theme Elements
    bgInput = document.getElementById('bgInput');
    noteSpriteInput = document.getElementById('noteSpriteInput');
    longNoteSpriteInput = document.getElementById('longNoteSpriteInput');
    themeSettingsBtn = document.getElementById('themeSettingsBtn');
    spriteModal = document.getElementById('spriteModal');
    spriteEditorCanvas = document.getElementById('spriteEditorCanvas');
    ctxSprite = spriteEditorCanvas.getContext('2d');
    saveSpriteBtn = document.getElementById('saveSpriteBtn');
    closeSpriteBtn = document.getElementById('closeSpriteBtn');
    
    bgList = document.getElementById('bgList');
    noteList = document.getElementById('noteList');
    longNoteList = document.getElementById('longNoteList');
    editorTitle = document.getElementById('editorTitle');
    editorHint = document.getElementById('editorHint');

    // Slider Values
    zoomValue = document.getElementById('zoomValue');
    liveSpeedValue = document.getElementById('liveSpeedValue');
    speedLerpValue = document.getElementById('speedLerpValue');
    thicknessValue = document.getElementById('thicknessValue');
    widthScaleValue = document.getElementById('widthScaleValue');
    vfxAlphaValue = document.getElementById('vfxAlphaValue');
    volumeValue = document.getElementById('volumeValue');

    // Sync initial values
    const sync = (slider, input) => { if(slider && input) input.value = slider.value; };
    sync(zoomInput, zoomValue);
    sync(liveSpeedInput, liveSpeedValue);
    sync(speedLerpInput, speedLerpValue);
    sync(thicknessInput, thicknessValue);
    sync(widthScaleInput, widthScaleValue);
    sync(vfxAlphaInput, vfxAlphaValue);
    sync(volumeSlider, volumeValue);

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
            
            const importedEvents = data.events || [];
            const internalEvents = [];
            let maxId = 0;
            
            importedEvents.forEach(e => {
                const eventId = e.id !== undefined ? e.id : maxId++;
                if (eventId >= maxId) maxId = eventId + 1;

                if (e.tick !== undefined && e.endTick !== undefined && e.endTick > e.tick) {
                    for (let t = e.tick; t <= e.endTick; t += HOLD_GAP_THRESHOLD) {
                        const newId = maxId++;
                        internalEvents.push({
                            laneId: e.laneId,
                            tick: t,
                            id: newId,
                            ...(e.vfxType ? { vfxType: e.vfxType } : {})
                        });
                    }
                } else {
                    internalEvents.push({
                        laneId: e.laneId,
                        tick: e.tick,
                        id: eventId,
                        ...(e.vfxType ? { vfxType: e.vfxType } : {})
                    });
                }
            });
            
            events = internalEvents;
            audioOffset = -(data.audioOffset || 0);
            bpm = data.bpm || 120;
            bpmInput.value = bpm;
            nextId = maxId;
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
    
    bgInput.addEventListener('change', (e) => handleAssetUpload(e, 'bg'));
    noteSpriteInput.addEventListener('change', (e) => handleAssetUpload(e, 'note'));
    longNoteSpriteInput.addEventListener('change', (e) => handleAssetUpload(e, 'long'));

    themeSettingsBtn.addEventListener('click', () => {
        spriteModal.style.display = 'block';
        spriteEditorActive = true;
        renderAllAssetLists();
    });

    playBtn.addEventListener('click', togglePlayback);
    recordBtn.addEventListener('click', toggleRecording);
    saveRecordBtn.addEventListener('click', saveRecording);
    discardRecordBtn.addEventListener('click', discardRecording);
    exportBtn.addEventListener('click', exportProject);
    importBtn.addEventListener('click', () => projectInput.click());
    addLaneBtn.addEventListener('click', addNewLane);

    saveSpriteBtn.onclick = saveSpriteRect;
    closeSpriteBtn.onclick = () => { spriteModal.style.display = 'none'; spriteEditorActive = false; };

    // Slider Sync Listeners
    const setupSync = (slider, input, callback) => {
        if (!slider || !input) return;
        slider.addEventListener('input', () => { 
            input.value = slider.value; 
            callback(slider.value); 
        });
        input.addEventListener('change', () => { 
            slider.value = input.value; 
            callback(input.value); 
        });
    };

    bpmInput.addEventListener('change', () => { bpm = parseInt(bpmInput.value) || 120; });
    setupSync(volumeSlider, volumeValue, (v) => audioEngine.setVolume(parseFloat(v)));
    setupSync(zoomInput, zoomValue, (v) => pixelsPerSecondEditor = parseInt(v));
    setupSync(liveSpeedInput, liveSpeedValue, (v) => pixelsPerSecondLive = parseInt(v));
    setupSync(thicknessInput, thicknessValue, (v) => noteThicknessLive = parseInt(v));
    setupSync(widthScaleInput, widthScaleValue, (v) => noteWidthScale = parseInt(v) / 100);
    setupSync(vfxAlphaInput, vfxAlphaValue, (v) => vfxAlpha = parseFloat(v));
    setupSync(speedLerpInput, speedLerpValue, (v) => speedLerp = parseFloat(v));

    offsetSlider?.addEventListener('input', () => {
        audioOffset = parseFloat(offsetSlider.value) / 1000;
        updateOffsetDisplay();
    });

    offsetDisplay?.addEventListener('change', () => {
        let val = offsetDisplay.value.replace('ms', '').trim();
        let num = parseInt(val);
        if (!isNaN(num)) {
            audioOffset = num / 1000;
        }
        updateOffsetDisplay();
    });

    offsetDisplay?.addEventListener('focus', () => {
        offsetDisplay.value = offsetDisplay.value.replace('ms', '');
        offsetDisplay.select();
    });

    offsetDisplay?.addEventListener('blur', () => {
        updateOffsetDisplay();
    });

    invertScrollToggle.addEventListener('change', () => { isInvertedScroll = invertScrollToggle.checked; });
    snapSelect.addEventListener('change', () => { gridSnap = parseInt(snapSelect.value); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') isShiftPressed = true;
        if (document.activeElement.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        // Handle recording start for this key
        if (!pressedKeys.has(key)) {
            lanes.forEach(lane => {
                if (lane.key === key) {
                    const hl = document.getElementById(`hl-${lane.id}`);
                    if (hl) hl.classList.add('bg-pink-500/15');

                    if (isPlaying && isRecording && lane.type === 'note') {
                        const currentTime = audioEngine.currentTime - startTime;
                        const currentTick = Math.floor(timeToTick(currentTime, bpm) / 3) * 3;
                        if (!recordingBuffers.has(lane.id)) recordingBuffers.set(lane.id, []);
                        recordingBuffers.get(lane.id).push(currentTick);
                        recordingGhostNotes.set(lane.id, currentTick);
                    }
                }
            });
        }

        pressedKeys.add(key);

        if (e.code === 'Space' && !spriteEditorActive) {
            e.preventDefault();
            const maxLen = Math.max(backgrounds.length, shortNotes.length, longNotes.length);
            if (maxLen > 0) {
                currentThemeIndex = (currentThemeIndex + 1) % maxLen;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') isShiftPressed = false;
        const key = e.key.toLowerCase();
        pressedKeys.delete(key);

        lanes.forEach(lane => {
            if (lane.key === key) {
                const hl = document.getElementById(`hl-${lane.id}`);
                if (hl) hl.classList.remove('bg-pink-500/15');

                if (isRecording && lane.type === 'note' && recordingBuffers.has(lane.id)) {
                    recordingGhostNotes.delete(lane.id);
                    const buffer = recordingBuffers.get(lane.id);
                    if (buffer.length > 0) {
                        if (buffer.length < 8) {
                            // Short press: convert to single note at nearest grid snap
                            const firstTick = buffer[0];
                            const snappedTick = Math.round(firstTick / gridSnap) * gridSnap;
                            recordedEvents.push({ id: nextId++, laneId: lane.id, tick: snappedTick });
                        } else {
                            // Long press: snap start and end
                            const startTick = buffer[0];
                            const endTick = buffer[buffer.length - 1];
                            const snappedStart = Math.round(startTick / gridSnap) * gridSnap;
                            const snappedEnd = Math.round(endTick / gridSnap) * gridSnap;
                            for (let t = snappedStart; t <= snappedEnd; t += 3) {
                                recordedEvents.push({ id: nextId++, laneId: lane.id, tick: t });
                            }
                        }
                    }
                    recordingBuffers.delete(lane.id);
                    updateRecordingUI();
                }
            }
        });
    });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => { vfxModal.style.display = 'none'; });
    document.getElementById('setNoteOption')?.addEventListener('click', () => setLaneType('note'));
    document.getElementById('setThemeSwitchOption')?.addEventListener('click', () => setVfxType('SwitchThemeSet'));
    document.getElementById('deleteLaneBtn')?.addEventListener('click', deleteCurrentLane);
    applyCustomVfxBtn?.addEventListener('click', applyCustomVfx);

    saveSpriteBtn.onclick = saveSpriteRect;
    closeSpriteBtn.onclick = () => { spriteModal.style.display = 'none'; spriteEditorActive = false; };

    editorCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    window.addEventListener('blur', () => {
        isLeftDragging = false;
        isRightDragging = false;
        isMiddleDragging = false;
        dragTarget = null;
        pressedKeys.clear();
        recordingBuffers.clear();
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
        if (e.button === 0) {
            isLeftDragging = false;
            isSelectionDragging = false;
            isMovingSelection = false;
            selectionBox = null;
        }
        if (e.button === 2) isRightDragging = false;
        if (e.button === 1) isMiddleDragging = false;
        if (spriteEditorActive) dragTarget = null;
    });

    editorCanvas.addEventListener('mousedown', (e) => {
        if (vfxModal.style.display === 'block' || spriteModal.style.display === 'block') return;
        
        const rect = editorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hitZoneY = rect.height * 0.8;
        const laneWidth = rect.width / lanes.length;
        const laneIdx = Math.floor(x / laneWidth);
        const laneId = lanes[laneIdx]?.id;
        const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
        const timeAtMouse = currentTime + (hitZoneY - y) / pixelsPerSecondEditor;
        const snappedTick = Math.round(timeToTick(timeAtMouse, bpm) / gridSnap) * gridSnap;

        if (e.button === 0) {
            if (isShiftPressed) {
                isSelectionDragging = true;
                selectionBox = { x1: x, y1: y, x2: x, y2: y };
                selectedEventIds.clear();
            } else {
                // Check if clicking on a selected note to start move
                const clickedEvent = events.find(ev => ev.laneId === laneId && Math.abs(ev.tick - snappedTick) < gridSnap);
                if (clickedEvent && selectedEventIds.has(clickedEvent.id)) {
                    isMovingSelection = true;
                    selectionDragStartTick = snappedTick;
                    selectionDragStartLaneIdx = laneIdx;
                    selectionOriginalStates.clear();
                    selectedEventIds.forEach(id => {
                        const ev = events.find(e => e.id === id);
                        if (ev) selectionOriginalStates.set(id, { laneId: ev.laneId, tick: ev.tick, laneIdx: lanes.findIndex(l => l.id === ev.laneId) });
                    });
                } else {
                    isLeftDragging = true;
                    // Deselect if not clicking on a selected note
                    if (!clickedEvent || !selectedEventIds.has(clickedEvent.id)) {
                        selectedEventIds.clear();
                    }
                    tryPlaceEvent();
                }
            }
        }
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

        if (isSelectionDragging) {
            selectionBox.x2 = x;
            selectionBox.y2 = y;
            updateSelectionFromBox();
        } else if (isMovingSelection) {
            const tickDiff = snappedTick - selectionDragStartTick;
            const laneDiff = laneIdx - selectionDragStartLaneIdx;
            
            selectionOriginalStates.forEach((state, id) => {
                const event = events.find(ev => ev.id === id);
                if (event) {
                    const newLaneIdx = Math.max(0, Math.min(lanes.length - 1, state.laneIdx + laneDiff));
                    event.laneId = lanes[newLaneIdx].id;
                    event.tick = state.tick + tickDiff;
                }
            });
        } else {
            if (isLeftDragging) tryPlaceEvent();
            if (isRightDragging) tryRemoveEvent();
            if (isMiddleDragging) {
                const deltaY = e.clientY - lastMouseY;
                lastMouseY = e.clientY;
                const timeDelta = deltaY / pixelsPerSecondEditor;
                pauseOffset = Math.max(0, Math.min(duration + Math.abs(audioOffset), pauseOffset - timeDelta));
                if (isPlaying) startTime = audioEngine.currentTime - pauseOffset;
            }
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

function handleAssetUpload(e, type) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const asset = {
                    img,
                    rect: type === 'long' 
                        ? { x: 0, y: 0, w: img.width, h: img.height, s1: img.width*0.2, s2: img.width*0.8, v1: img.height*0.2, v2: img.height*0.8 }
                        : { x: 0, y: 0, w: img.width, h: img.height }
                };
                if (type === 'bg') backgrounds.push(asset);
                else if (type === 'note') shortNotes.push(asset);
                else if (type === 'long') longNotes.push(asset);
                
                renderAllAssetLists();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

function renderAllAssetLists() {
    renderAssetList('bg', bgList, backgrounds);
    renderAssetList('note', noteList, shortNotes);
    renderAssetList('long', longNoteList, longNotes);
}

function renderAssetList(type, container, list) {
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<div class="text-[7px] text-white/20 text-center py-2 italic px-4">No assets</div>';
        return;
    }
    list.forEach((asset, index) => {
        const item = document.createElement('div');
        item.className = `group relative flex-shrink-0 w-14 h-14 rounded border cursor-pointer transition-all ${selectedAsset?.type === type && selectedAsset?.index === index ? 'bg-pink-500/30 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`;
        item.draggable = true;
        
        const thumb = document.createElement('div');
        thumb.className = 'w-full h-full rounded overflow-hidden';
        const img = new Image();
        img.src = asset.img.src;
        img.className = 'w-full h-full object-cover';
        thumb.appendChild(img);
        
        // Clone Button (Top Right)
        const cloneBtn = document.createElement('button');
        cloneBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        cloneBtn.className = 'absolute -top-1 -right-1 bg-cyan-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10';
        cloneBtn.title = 'Clone Asset';
        cloneBtn.onclick = (e) => {
            e.stopPropagation();
            cloneAsset(type, index);
        };

        // Delete Button (Bottom Right)
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        delBtn.className = 'absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            list.splice(index, 1);
            if (selectedAsset?.type === type && selectedAsset?.index === index) {
                selectedAsset = null;
                openSpriteEditor();
            } else if (selectedAsset?.type === type && selectedAsset?.index > index) {
                selectedAsset.index--;
            }
            renderAllAssetLists();
        };

        item.onclick = () => {
            selectedAsset = { type, index };
            spriteEditorMode = (type === 'long' ? 'long' : 'normal');
            openSpriteEditor();
            renderAllAssetLists();
        };

        // Drag and Drop
        item.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type, index }));
            item.classList.add('opacity-50', 'scale-95');
        };
        item.ondragend = () => item.classList.remove('opacity-50', 'scale-95');
        item.ondragover = (e) => {
            e.preventDefault();
            item.classList.add('border-pink-500/50', 'bg-pink-500/5');
        };
        item.ondragleave = () => {
            item.classList.remove('border-pink-500/50', 'bg-pink-500/5');
        };
        item.ondrop = (e) => {
            e.preventDefault();
            item.classList.remove('border-pink-500/50', 'bg-pink-500/5');
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type !== type) return;
            const fromIndex = data.index;
            const toIndex = index;
            if (fromIndex === toIndex) return;
            
            const element = list.splice(fromIndex, 1)[0];
            list.splice(toIndex, 0, element);
            
            // Update selection if it moved
            if (selectedAsset?.type === type) {
                if (selectedAsset.index === fromIndex) selectedAsset.index = toIndex;
                else if (fromIndex < selectedAsset.index && toIndex >= selectedAsset.index) selectedAsset.index--;
                else if (fromIndex > selectedAsset.index && toIndex <= selectedAsset.index) selectedAsset.index++;
            }
            
            renderAllAssetLists();
        };

        item.appendChild(thumb);
        item.appendChild(cloneBtn);
        item.appendChild(delBtn);
        container.appendChild(item);
    });
}

function cloneAsset(type, index) {
    const list = type === 'bg' ? backgrounds : (type === 'note' ? shortNotes : longNotes);
    const original = list[index];
    const clone = {
        img: original.img,
        rect: { ...original.rect }
    };
    list.splice(index + 1, 0, clone);
    renderAllAssetLists();
}

function openSpriteEditor() {
    if (!selectedAsset) {
        spriteEditorCanvas.width = 400;
        spriteEditorCanvas.height = 200;
        ctxSprite.clearRect(0, 0, 400, 200);
        ctxSprite.fillStyle = "#1a1a1f";
        ctxSprite.fillRect(0,0,400,200);
        ctxSprite.fillStyle = "#fff";
        ctxSprite.textAlign = "center";
        ctxSprite.fillText("Select an asset to edit", 200, 100);
        editorTitle.textContent = "Select an asset to edit";
        return;
    }
    
    const list = selectedAsset.type === 'bg' ? backgrounds : (selectedAsset.type === 'note' ? shortNotes : longNotes);
    const asset = list[selectedAsset.index];
    const img = asset.img;
    
    editorTitle.textContent = `Editing ${selectedAsset.type.toUpperCase()} ${selectedAsset.index + 1}`;

    const container = spriteEditorCanvas.parentElement;
    const cWidth = container.clientWidth - 40;
    const cHeight = container.clientHeight - 40;
    
    displayScale = Math.min(cWidth / img.width, cHeight / img.height);
    spriteEditorCanvas.width = img.width * displayScale;
    spriteEditorCanvas.height = img.height * displayScale;
    
    currentSpriteRect = { ...asset.rect };
    renderSpriteEditorInternal();
}

function renderSpriteEditorInternal() {
    if (!selectedAsset) return;
    const list = selectedAsset.type === 'bg' ? backgrounds : (selectedAsset.type === 'note' ? shortNotes : longNotes);
    const asset = list[selectedAsset.index];
    renderSpriteEditor(ctxSprite, asset.img, currentSpriteRect, displayScale, spriteEditorMode, spriteEditorCanvas.width, spriteEditorCanvas.height);
}

function saveSpriteRect() {
    if (!selectedAsset) return;
    const list = selectedAsset.type === 'bg' ? backgrounds : (selectedAsset.type === 'note' ? shortNotes : longNotes);
    list[selectedAsset.index].rect = { ...currentSpriteRect };
    alert("Changes applied to asset!");
}

function renderLaneHeaders() {
    laneHeaders.innerHTML = '';
    laneKeyRow.innerHTML = '';
    laneHighlightLayer.innerHTML = '';
    lanes.forEach(lane => {
        const div = document.createElement('div');
        div.className = 'lane-label';
        const label = lane.type === 'note' ? 'NOTE' : (lane.vfxType || 'NONE');
        div.textContent = label;
        div.onclick = () => openVfxModal(lane.id);
        
        // Drag and drop for columns reordering
        div.draggable = true;
        div.style.cursor = 'grab';
        div.title = "Drag to reorder column";
        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ laneId: lane.id }));
            div.classList.add('opacity-40');
        };
        div.ondragend = () => div.classList.remove('opacity-40');
        div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add('bg-pink-500/20', 'text-white');
        };
        div.ondragleave = () => {
            div.classList.remove('bg-pink-500/20', 'text-white');
        };
        div.ondrop = (e) => {
            e.preventDefault();
            div.classList.remove('bg-pink-500/20', 'text-white');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.laneId === undefined) return;
                const fromId = data.laneId;
                const toId = lane.id;
                if (fromId === toId) return;

                const fromIndex = lanes.findIndex(l => l.id === fromId);
                const toIndex = lanes.findIndex(l => l.id === toId);
                if (fromIndex === -1 || toIndex === -1) return;

                const [movedLane] = lanes.splice(fromIndex, 1);
                lanes.splice(toIndex, 0, movedLane);
                renderLaneHeaders();
                const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
                drawEditor(currentTime);
            } catch (err) {
                console.error("Drop failed:", err);
            }
        };

        laneHeaders.appendChild(div);

        const keyDiv = document.createElement('div');
        keyDiv.className = 'flex-1 flex items-center justify-center border-r border-white/5';
        if (lane.type === 'note') {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.value = lane.key || '';
            input.className = 'w-6 h-6 bg-white/5 border border-white/10 rounded text-[9px] text-center text-pink-400 font-mono outline-none focus:border-pink-500 transition-all';
            input.oninput = (e) => {
                lane.key = e.target.value.toLowerCase();
            };
            keyDiv.appendChild(input);
        }
        laneKeyRow.appendChild(keyDiv);

        const hl = document.createElement('div');
        hl.className = 'flex-1 h-full pointer-events-none transition-colors duration-75';
        hl.id = `hl-${lane.id}`;
        laneHighlightLayer.appendChild(hl);
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
    const lane = lanes.find(l => l.id === laneId);
    if (lane) {
        customVfxInput.value = (lane.type === 'vfx' && lane.vfxType) ? lane.vfxType : '';
    } else {
        customVfxInput.value = '';
    }
}

function applyCustomVfx() {
    if (editingLaneId === null) return;
    const lane = lanes.find(l => l.id === editingLaneId);
    if (lane) {
        const val = customVfxInput.value.trim();
        if (val) {
            lane.type = 'vfx';
            lane.vfxType = val;
        } else {
            lane.type = 'note';
            lane.vfxType = undefined;
        }
        renderLaneHeaders();
        vfxModal.style.display = 'none';
        const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
        drawEditor(currentTime);
    }
}

function setLaneType(type) {
    if (editingLaneId === null) return;
    const lane = lanes.find(l => l.id === editingLaneId);
    if (lane) {
        lane.type = type;
        lane.vfxType = undefined;
        renderLaneHeaders();
        vfxModal.style.display = 'none';
        const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
        drawEditor(currentTime);
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
        const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
        drawEditor(currentTime);
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
    const exportedEvents = [];
    lanes.forEach(lane => {
        const segments = getNoteSegments(lane.id, events);
        segments.forEach(seg => {
            const representationEvent = events.find(e => e.id === seg.eventIds[0]) || {};
            let extraProps = {};
            if (representationEvent.vfxType && representationEvent.vfxType !== lane.vfxType) {
                extraProps.vfxType = representationEvent.vfxType;
            }

            if (seg.isLong) {
                exportedEvents.push({
                    laneId: lane.id,
                    tick: seg.startTick,
                    endTick: seg.endTick,
                    id: seg.eventIds[0],
                    ...extraProps
                });
            } else {
                exportedEvents.push({
                    laneId: lane.id,
                    tick: seg.startTick,
                    id: seg.eventIds[0],
                    ...extraProps
                });
            }
        });
    });
    // Sort events by tick for a clean output order
    exportedEvents.sort((a, b) => a.tick - b.tick);

    const data = { lanes, events: exportedEvents, audioOffset: -audioOffset, bpm, ticksPerBar: TICKS_PER_BAR, version: "5.0" };
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
        
        const importedEvents = data.events || [];
        const internalEvents = [];
        let maxId = 0;
        
        importedEvents.forEach(e => {
            const eventId = e.id !== undefined ? e.id : maxId++;
            if (eventId >= maxId) maxId = eventId + 1;

            if (e.tick !== undefined && e.endTick !== undefined && e.endTick > e.tick) {
                // Expanding LongNote to step-by-step ticks in editor state
                for (let t = e.tick; t <= e.endTick; t += HOLD_GAP_THRESHOLD) {
                    const newId = maxId++;
                    internalEvents.push({
                        laneId: e.laneId,
                        tick: t,
                        id: newId,
                        ...(e.vfxType ? { vfxType: e.vfxType } : {})
                    });
                }
            } else {
                internalEvents.push({
                    laneId: e.laneId,
                    tick: e.tick,
                    id: eventId,
                    ...(e.vfxType ? { vfxType: e.vfxType } : {})
                });
            }
        });
        
        events = internalEvents;
        audioOffset = -(data.audioOffset || 0);
        bpm = data.bpm || 120;
        bpmInput.value = bpm;
        nextId = maxId;
        updateOffsetDisplay();
        renderLaneHeaders();
    } catch (err) { alert("Load Error"); }
    projectInput.value = ''; 
}

function updateOffsetDisplay() {
    const ms = Math.round(audioOffset * 1000);
    offsetDisplay.value = `${ms}ms`;
    if (offsetSlider) offsetSlider.value = ms;
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

async function toggleRecording() {
    isRecording = !isRecording;
    if (isRecording) {
        recordBtn.classList.remove('bg-white/5', 'border-white/10', 'text-white/40');
        recordBtn.classList.add('bg-red-500', 'border-red-600', 'text-white');
    } else {
        recordBtn.classList.add('bg-white/5', 'border-white/10', 'text-white/40');
        recordBtn.classList.remove('bg-red-500', 'border-red-600', 'text-white');
        // Flush buffers
        recordingBuffers.clear();
    }
}

function updateRecordingUI() {
    if (recordedEvents.length > 0) {
        recordingControls.classList.remove('hidden');
    } else {
        recordingControls.classList.add('hidden');
    }
}

function saveRecording() {
    if (recordedEvents.length === 0) return;
    
    // Find range
    let minTick = Infinity;
    let maxTick = -Infinity;
    const affectedLaneIds = new Set();
    
    recordedEvents.forEach(e => {
        minTick = Math.min(minTick, e.tick);
        maxTick = Math.max(maxTick, e.tick);
        affectedLaneIds.add(e.laneId);
    });

    // Clear existing events in range for affected lanes
    events = events.filter(e => {
        if (affectedLaneIds.has(e.laneId) && e.tick >= minTick && e.tick <= maxTick) {
            return false;
        }
        return true;
    });

    // Add recorded events
    events.push(...recordedEvents);
    recordedEvents = [];
    updateRecordingUI();
}

function discardRecording() {
    recordedEvents = [];
    updateRecordingUI();
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
    if (type === 'SwitchThemeSet') {
        const maxLen = Math.max(backgrounds.length, shortNotes.length, longNotes.length);
        if (maxLen > 0) {
            currentThemeIndex = (currentThemeIndex + 1) % maxLen;
        }
        return;
    }
    
    // Determine duration based on prefix or type
    let duration = 600; // default
    if (type.startsWith('D1_')) duration = 1000;
    else if (type.startsWith('D2_')) duration = 2000;
    else if (type.includes('SuperFlash')) duration = 1200;
    else if (type.includes('Flash')) duration = 400;

    activeBurstVFX.push({ 
        type, 
        startTime: performance.now(), 
        duration,
        progress: 0, 
        active: true, 
        laneId, 
        randomSeed: Math.random() 
    });
}

function updateSelectionFromBox() {
    if (!selectionBox) return;
    const { x1, y1, x2, y2 } = selectionBox;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    const { width, height } = editorCanvas;
    const hitZoneY = height * 0.8;
    const laneWidth = width / lanes.length;
    const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;

    selectedEventIds.clear();
    
    lanes.forEach((lane, laneIdx) => {
        const segments = getNoteSegments(lane.id, events);
        segments.forEach(seg => {
            let isAnyEventInBox = false;
            seg.eventIds.forEach(id => {
                const e = events.find(ev => ev.id === id);
                if (!e) return;
                
                const eventTime = tickToTime(e.tick, bpm);
                const eventY = hitZoneY - (eventTime - currentTime) * pixelsPerSecondEditor;
                const eventX = laneIdx * laneWidth + laneWidth / 2;
                
                if (eventX >= minX && eventX <= maxX && eventY >= minY && eventY <= maxY) {
                    isAnyEventInBox = true;
                }
            });
            
            if (isAnyEventInBox) {
                seg.eventIds.forEach(id => selectedEventIds.add(id));
            }
        });
    });
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

    // Lane Highlights (Fallback for non-DOM or extra visual)
    lanes.forEach((lane, i) => {
        if (lane.key && pressedKeys.has(lane.key.toLowerCase())) {
            ctxEdit.fillStyle = 'rgba(255, 113, 206, 0.05)';
            ctxEdit.fillRect(i * laneWidth, 0, laneWidth, height);
        }
    });

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
                
                if (selectedEventIds.has(e.id)) {
                    ctxEdit.strokeStyle = '#fff';
                    ctxEdit.lineWidth = 1;
                    ctxEdit.stroke();
                }
            }
        });

        // Draw recorded events in red
        recordedEvents.filter(e => e.laneId === lane.id).forEach(e => {
            const eventTime = tickToTime(e.tick, bpm);
            if (eventTime >= timeMin && eventTime <= timeMax) {
                const y = hitZoneY - (eventTime - currentTime) * pixelsPerSecondEditor;
                ctxEdit.fillStyle = '#ef4444'; // Red-500
                ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
            }
        });

        // Draw ghost notes (active recording)
        if (recordingGhostNotes.has(lane.id)) {
            const startTick = recordingGhostNotes.get(lane.id);
            const currentTick = Math.floor(timeToTick(currentTime, bpm) / 3) * 3;
            const startT = tickToTime(startTick, bpm);
            const endT = tickToTime(currentTick, bpm);
            const yStart = hitZoneY - (startT - currentTime) * pixelsPerSecondEditor;
            const yEnd = hitZoneY - (endT - currentTime) * pixelsPerSecondEditor;
            ctxEdit.fillStyle = 'rgba(252, 165, 165, 0.6)'; // Light red
            ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, yEnd - 4, laneWidth - 16, Math.max(8, yStart - yEnd), 4); ctxEdit.fill();
        }
    });
    if (ghostEvent) {
        const laneIdx = lanes.findIndex(l => l.id === ghostEvent.laneId);
        if (laneIdx !== -1) {
            const y = hitZoneY - (tickToTime(ghostEvent.tick, bpm) - currentTime) * pixelsPerSecondEditor;
            ctxEdit.fillStyle = GHOST_NOTE_COLOR; ctxEdit.beginPath(); ctxEdit.roundRect(laneIdx * laneWidth + 8, y - 4, laneWidth - 16, 8, 4); ctxEdit.fill();
        }
    }

    // Draw Selection Box
    if (selectionBox) {
        ctxEdit.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctxEdit.setLineDash([5, 5]);
        ctxEdit.strokeRect(selectionBox.x1, selectionBox.y1, selectionBox.x2 - selectionBox.x1, selectionBox.y2 - selectionBox.y1);
        ctxEdit.setLineDash([]);
        ctxEdit.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctxEdit.fillRect(selectionBox.x1, selectionBox.y1, selectionBox.x2 - selectionBox.x1, selectionBox.y2 - selectionBox.y1);
    }
}

function drawPreview(currentTime) {
    const { width, height } = previewCanvas;
    const hitZoneY = height * 0.8;
    ctxPrev.clearRect(0, 0, width, height);

    const bg = backgrounds[currentThemeIndex % backgrounds.length];
    if (bg) {
        const img = bg.img;
        const rect = bg.rect;
        const scale = Math.max(width / rect.w, height / rect.h);
        const x = (width / 2) - (rect.w / 2) * scale; const y = (height / 2) - (rect.h / 2) * scale;
        ctxPrev.drawImage(img, rect.x, rect.y, rect.w, rect.h, x, y, rect.w * scale, rect.h * scale);
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

    const sn = shortNotes[currentThemeIndex % shortNotes.length];
    const ln = longNotes[currentThemeIndex % longNotes.length];

    noteLanes.forEach((lane, laneIdx) => {
        const segments = getNoteSegments(lane.id, events);
        const recordedSegments = getNoteSegments(lane.id, recordedEvents);

        const drawSeg = (seg, isRecorded, isGhost) => {
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
            
            const noteColor = isGhost ? 'rgba(252, 165, 165, 0.6)' : (isRecorded ? '#ef4444' : (seg.isLong ? LONG_NOTE_COLOR : NOTE_COLOR));

            if (seg.isLong) {
                const startEdgeY = y1 + noteThicknessLive/2;
                const endEdgeY = y2 - noteThicknessLive/2;
                const destH = Math.max(noteThicknessLive, startEdgeY - endEdgeY);
                if (ln && !isRecorded && !isGhost) {
                    draw9Slice(ctxPrev, ln.img, ln.rect, destX, endEdgeY, visualWidth, destH);
                } else {
                    ctxPrev.fillStyle = noteColor; ctxPrev.shadowBlur = isGhost ? 0 : 15; ctxPrev.shadowColor = noteColor;
                    ctxPrev.beginPath(); ctxPrev.roundRect(destX, endEdgeY, visualWidth, destH, 4); ctxPrev.fill(); ctxPrev.shadowBlur = 0;
                }
            } else {
                const destY = y1 - noteThicknessLive/2;
                if (sn && !isRecorded && !isGhost) {
                    ctxPrev.drawImage(sn.img, sn.rect.x, sn.rect.y, sn.rect.w, sn.rect.h, destX, destY, visualWidth, noteThicknessLive);
                } else {
                    ctxPrev.fillStyle = noteColor; ctxPrev.shadowBlur = isGhost ? 0 : 20; ctxPrev.shadowColor = noteColor;
                    ctxPrev.beginPath(); ctxPrev.roundRect(destX, destY, visualWidth, noteThicknessLive, 4); ctxPrev.fill(); ctxPrev.shadowBlur = 0;
                }
            }
        };

        segments.forEach(seg => drawSeg(seg, false));
        recordedSegments.forEach(seg => drawSeg(seg, true));

        // Draw ghost note in preview
        if (recordingGhostNotes.has(lane.id)) {
            const startTick = recordingGhostNotes.get(lane.id);
            const currentTick = Math.floor(timeToTick(currentTime, bpm) / 3) * 3;
            drawSeg({ startTick, endTick: currentTick, isLong: (currentTick - startTick > 8) }, true, true);
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
    const currentTime = isPlaying ? (audioEngine.currentTime - startTime) : pauseOffset;
    drawWaveform(currentTime); drawEditor(currentTime); drawPreview(currentTime); updateTimeDisplay(currentTime);
    
    // Declaratively determine active looping (IDLE) VFX
    loopingVFX.clear();
    const currentTick = timeToTick(currentTime, bpm);
    lanes.forEach(lane => {
        if (lane.type === 'vfx') {
            const segments = getNoteSegments(lane.id, events);
            const activeSeg = segments.find(seg => currentTick >= seg.startTick && currentTick <= seg.endTick);
            if (activeSeg) {
                const repEvent = events.find(e => e.id === activeSeg.eventIds[0]);
                const finalVfx = repEvent?.vfxType || lane.vfxType;
                if (finalVfx && IDLE_VFX.includes(finalVfx)) {
                    loopingVFX.set(lane.id, finalVfx);
                }
            }
        }
    });
    
    if (isPlaying) {
        if (isRecording) {
            const currentTick = Math.floor(timeToTick(currentTime, bpm) / 3) * 3;
            if (currentTick !== lastRecordedTick) {
                lanes.forEach(lane => {
                    if (lane.type === 'note' && lane.key && pressedKeys.has(lane.key.toLowerCase())) {
                        if (!recordingBuffers.has(lane.id)) recordingBuffers.set(lane.id, []);
                        const buffer = recordingBuffers.get(lane.id);
                        if (!buffer.includes(currentTick)) {
                            buffer.push(currentTick);
                        }
                    }
                });
                lastRecordedTick = currentTick;
            }
        }

        const noteLanes = lanes.filter(l => l.type === 'note');
        events.forEach(e => {
            const lane = lanes.find(l => l.id === e.laneId);
            if (!lane) return;

            const eventTime = tickToTime(e.tick, bpm);
            let triggerTime = eventTime;
            
            // Handle Pre-Play VFX (D1_ or D2_)
            if (lane.type === 'vfx' && lane.vfxType) {
                if (lane.vfxType.startsWith('D1_')) triggerTime -= 1.0;
                else if (lane.vfxType.startsWith('D2_')) triggerTime -= 2.0;
            }

            if (triggerTime <= currentTime && triggerTime > lastFrameTime) {
                if (lane.type === 'note') {
                    const explosion = createNoteExplosion(lane.id, noteLanes.indexOf(lane), noteLanes.length, previewCanvas.width, previewCanvas.height);
                    activeExplosions.push(explosion);
                }
                else if (lane.type === 'vfx') {
                    const finalVfxType = e.vfxType || lane.vfxType;
                    if (finalVfxType) triggerVFX(lane.id, finalVfxType);
                }
            }
        });
    }
    lastFrameTime = currentTime; requestAnimationFrame(renderLoop);
}

init();
