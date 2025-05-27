import AudioPlayer from './audio-player';
import './style.css';

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
    };
    reader.onerror = () => console.error('Error reading file');
    reader.readAsArrayBuffer(file);
  }
});

const toggleBtn = document.createElement("button");
toggleBtn.innerText = "Play / Pause";
toggleBtn.style.marginBottom = "24px";
document.body.appendChild(toggleBtn);

toggleBtn.addEventListener("click", () => {
  if (player.isPlaying) {
    player.pause();
    return;
  }
  player.play();
});

const rangeInput = document.createElement("input");
rangeInput.style.width = "80%";
rangeInput.type = "range";
rangeInput.min = "0";
rangeInput.max = "0.999";
rangeInput.step = "0.001";
rangeInput.value = "0";
document.body.appendChild(rangeInput);

rangeInput.addEventListener("input", (event: Event) => {
  const target = event.target as HTMLInputElement;
  player.seek(parseFloat(target.value) * player.duration);
});

const draw = () => {
  if (!player.duration) {
    return;
  }
  const normalized = player.elapsed / player.duration;
  rangeInput.value = normalized.toString();
};

setInterval(() => {
  draw();
}, 100);