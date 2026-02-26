import { TICKS_PER_BAR } from '../constants.js';

export function tickToTime(tick, bpm) {
    return tick / ((TICKS_PER_BAR * bpm) / 240);
}

export function timeToTick(time, bpm) {
    return Math.round(time * ((TICKS_PER_BAR * bpm) / 240));
}
