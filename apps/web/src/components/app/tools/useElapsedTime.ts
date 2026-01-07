import { ref, onMounted, onUnmounted } from 'vue';

export function useElapsedTime(startTime: number) {
  const elapsed = ref('0:00');
  let timer: number | null = null;

  const update = () => {
    const delta = Math.max(0, Date.now() - startTime);
    const totalSeconds = Math.floor(delta / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    elapsed.value = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  onMounted(() => {
    update();
    timer = window.setInterval(update, 1000);
  });

  onUnmounted(() => {
    if (timer !== null) {
      window.clearInterval(timer);
    }
  });

  return elapsed;
}
