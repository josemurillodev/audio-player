import AudioPlayer from './audio-player';
import { extractId3Info, imageURL, readID3 } from './helper-id3';
import './style.css';

const audioCtx = new AudioContext();
const player = new AudioPlayer(audioCtx);

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "audio/*";
fileInput.style.marginBottom = "24px";
document.body.appendChild(fileInput);

const image = document.createElement("img");
image.className  = 'image'
image.style.width = "200px";
image.style.height = "200px";
image.style.objectFit = "cover";
document.body.appendChild(image);

fileInput.addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bufferCopy = arrayBuffer.slice(0);
      const img = extractId3Info(readID3(bufferCopy));
      console.log('cover', img);
      image.src = imageURL(img.cover.data, img.cover.format);
      // image.style.backgroundImage = `url(${cover})`;
      // image.style.backgroundSize = "cover";
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

let seekTimeout: ReturnType<typeof setTimeout> | null = null;

rangeInput.addEventListener("input", (event: Event) => {
  if (seekTimeout !== null) {
    clearTimeout(seekTimeout);
  }
  const target = event.target as HTMLInputElement;
  const seekTo = parseFloat(target.value) * player.duration;
  seekTimeout = setTimeout(() => {
    player.seek(seekTo);
    seekTimeout = null;
  }, 100);
});

const draw = () => {
  if (!player.duration) return;
  if (seekTimeout !== null) return;
  const elapsedString = AudioPlayer.formatTime(player.elapsed);
  const durationString = AudioPlayer.formatTime(player.duration);
  timeLabel.textContent = `${elapsedString} / ${durationString}`
  const normalized = player.elapsed / player.duration;
  rangeInput.value = normalized.toString();
};

setInterval(() => {
  draw();
}, 100);