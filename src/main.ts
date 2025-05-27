import AudioPlayer from './audio-player';
import './style.css';
import { throttle } from './throttle';

const audioCtx = new AudioContext();
const player = new AudioPlayer(audioCtx);

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "audio/*";
fileInput.style.marginBottom = "24px";
document.body.appendChild(fileInput);

fileInput.addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      player.load(arrayBuffer);
      toggleBtn.classList.remove('playing');
    };
    reader.onerror = () => console.error('Error reading file');
    reader.readAsArrayBuffer(file);
  }
});

const container = document.createElement("div");
container.className  = 'audio-player'
document.body.appendChild(container);

const toggleBtn = document.createElement("button");
toggleBtn.className  = 'play-button'
container.appendChild(toggleBtn);

const toggleIcon = document.createElement("span");
toggleBtn.appendChild(toggleIcon);

const timeLabel = document.createElement("span");
timeLabel.className  = 'time'
timeLabel.textContent = '0:00 / 0:00'
container.appendChild(timeLabel);

toggleBtn.addEventListener("click", () => {
  if (!player.duration) return;
  if (player.isPlaying) {
    player.pause();
    toggleBtn.classList.remove('playing');
    return;
  }
  player.play();
  toggleBtn.classList.add('playing');
});

const rangeInput = document.createElement("input");
rangeInput.style.width = "80%";
rangeInput.type = "range";
rangeInput.min = "0";
rangeInput.max = "0.999";
rangeInput.step = "0.001";
rangeInput.value = "0";
container.appendChild(rangeInput);

const onSeek = (event: Event) => {
  const target = event.target as HTMLInputElement;
  player.seek(parseFloat(target.value) * player.duration);
};
const throttledOnSeek = throttle(onSeek, 50);

rangeInput.addEventListener("input", (event: Event) => {
  throttledOnSeek(event);
});

const draw = () => {
  if (!player.duration) return;
  timeLabel.textContent = `${AudioPlayer.formatTime(player.elapsed)} / ${AudioPlayer.formatTime(player.duration)}`
  const normalized = player.elapsed / player.duration;
  rangeInput.value = normalized.toString();
};

setInterval(() => {
  draw();
}, 100);