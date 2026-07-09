import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOUND_URLS = {
  correct: 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
  incorrect: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
};

let audioReady = false;

async function ensureAudioMode() {
  if (audioReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    audioReady = true;
  } catch (_) {
    // best effort
  }
}

/**
 * @param {'correct' | 'incorrect'} kind
 */
export async function playMinigameSound(kind) {
  const uri = SOUND_URLS[kind];
  if (!uri) return;
  try {
    await ensureAudioMode();
    const player = createAudioPlayer({ uri }, { updateInterval: 120 });
    player.play();
    setTimeout(() => {
      try {
        player.pause();
        player.remove();
      } catch (_) {}
    }, 1400);
  } catch (_) {
    // silent fail — sound is polish only
  }
}
