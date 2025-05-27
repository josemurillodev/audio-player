export default class AudioPlayer {
  private context: AudioContext;
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private playing = false;
  private time = 0;
  private offset = 0;

  constructor(context: AudioContext) {
    this.context = context;
  }

  load = async (arrayBuffer: ArrayBuffer) => {
    this.stop();
    try {
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffer = buffer;
      return this.buffer;
    } catch (e) {
      this.buffer = null;
      throw e;
    }
  };

  private createSource = () => {
    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.connect(this.context.destination);
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.onended = () => this.stop();
  };

  private destroySource = () => {
    if (this.sourceNode) {
      this.sourceNode.onended = () => {}
      this.sourceNode.stop(this.context.currentTime); 
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  };

  private calculateElapsed = () => {
    const now = this.context.currentTime;
    this.time += now - this.offset;
    this.offset = now;
  };

  play = () => {
    if (this.playing || !this.buffer) { return; }
    const now = this.context.currentTime;
    this.offset = now;
    this.createSource();
    const duration = this.buffer.duration - this.time;
    this.sourceNode!.start(now, this.time, duration);
    this.playing = true;
  };

  pause = () => {
    if (!this.playing || !this.buffer) { return; }
    this.destroySource();
    this.calculateElapsed();
    this.playing = false;
  };

  stop = () => {
    this.pause();
    this.seek(0);
  }

  seek = (time: number) => {
    const wasPlaying = this.playing;
    if (wasPlaying) {
      this.pause();
    }
    this.time = Math.max(0, time);
    if (wasPlaying) {
      this.play();
    }
  };

  get isPlaying() {
    return this.playing;
  }

  get duration() {
    return this.buffer?.duration || 0;
  }

  get elapsed() {
    if (this.playing) {
      this.calculateElapsed();
    }
    return this.time;
  }
}