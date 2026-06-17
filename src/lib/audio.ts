export let audioCtx: AudioContext | null = null;
export let isMuted = false;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

export const toggleMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

export const getIsMuted = () => isMuted;

export const playFlipSound = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

export const playCorrectSound = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = "sine";
  // Soft, professional chime (E5 -> G#5 -> B5)
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); 
  osc.frequency.setValueAtTime(830.61, audioCtx.currentTime + 0.08); 
  osc.frequency.setValueAtTime(987.77, audioCtx.currentTime + 0.16); 
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
};

export const playIncorrectSound = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = "triangle";
  // Soft dull low tick
  osc.frequency.setValueAtTime(250, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};
