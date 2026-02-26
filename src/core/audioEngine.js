export class AudioEngine {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = 0.5;
        this.audioBuffer = null;
        this.audioSource = null;
    }

    async decodeAudio(arrayBuffer) {
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return this.audioBuffer;
    }

    setVolume(val) {
        this.gainNode.gain.value = val;
    }

    stop() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
        }
    }

    start(pauseOffset, audioOffset, onEnded) {
        if (!this.audioBuffer) return;
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(this.gainNode);
        
        const audioTimeNow = Math.max(0, pauseOffset - audioOffset);
        const whenToStart = this.audioContext.currentTime + Math.max(0, audioOffset - pauseOffset);
        
        this.audioSource.start(whenToStart, audioTimeNow);
        this.audioSource.onended = onEnded;
    }

    get currentTime() {
        return this.audioContext.currentTime;
    }

    async resume() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}
