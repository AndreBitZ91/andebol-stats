// js/timer.js - Cronómetro de Alta Precisão
export class GameTimer {
    constructor(onTickCallback) {
        this.startTime = 0;
        this.elapsedPaused = 0;
        this.intervalId = null;
        this.onTick = onTickCallback;
    }

    start() {
        if (this.intervalId) return; // Já está a correr
        this.startTime = Date.now();
        this.intervalId = setInterval(() => {
            const now = Date.now();
            // Calcula a diferença real em segundos
            const delta = Math.floor((now - this.startTime) / 1000);
            const totalTime = this.elapsedPaused + delta;
            this.onTick(totalTime);
        }, 1000);
    }

    pause(currentTotalTime) {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
        // Guarda o tempo exato onde parou
        this.elapsedPaused = currentTotalTime;
    }

    isRunning() {
        return this.intervalId !== null;
    }
}
