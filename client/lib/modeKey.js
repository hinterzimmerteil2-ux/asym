import { getSettings } from './settings';

const TAP_MS = 280;

export function createModeKey(settingName, onSet) {
  let active = false;
  let before = false;
  let downAt = 0;
  let down = false;
  const set = (v) => { active = v; onSet(v); };
  return {
    down() {
      if (down) return;
      down = true;
      const mode = getSettings()[settingName];
      before = active;
      downAt = performance.now();
      if (mode === 'toggle') set(!active);
      else set(true);
    },
    up() {
      if (!down) return;
      down = false;
      const mode = getSettings()[settingName];
      if (mode === 'hold') set(false);
      else if (mode === 'mixed') set(performance.now() - downAt < TAP_MS ? !before : false);
    },
    reset() { down = false; if (getSettings()[settingName] !== 'toggle') set(false); },
    sync(v) { active = v; },
  };
}
