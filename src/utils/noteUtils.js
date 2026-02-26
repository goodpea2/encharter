import { HOLD_GAP_THRESHOLD } from '../constants.js';

export function getNoteSegments(laneId, events) {
    const laneEvents = events.filter(e => e.laneId === laneId).sort((a, b) => a.tick - b.tick);
    if (laneEvents.length === 0) return [];

    const segments = [];
    let currentSegment = {
        startTick: laneEvents[0].tick,
        endTick: laneEvents[0].tick,
        laneId: laneId,
        eventIds: [laneEvents[0].id]
    };

    for (let i = 1; i < laneEvents.length; i++) {
        const e = laneEvents[i];
        if (e.tick - currentSegment.endTick <= HOLD_GAP_THRESHOLD) {
            currentSegment.endTick = e.tick;
            currentSegment.eventIds.push(e.id);
        } else {
            segments.push({ ...currentSegment, isLong: currentSegment.eventIds.length > 1 });
            currentSegment = {
                startTick: e.tick,
                endTick: e.tick,
                laneId: laneId,
                eventIds: [e.id]
            };
        }
    }
    segments.push({ ...currentSegment, isLong: currentSegment.eventIds.length > 1 });
    return segments;
}
