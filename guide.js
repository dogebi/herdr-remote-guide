/* 읽기 진행률을 표시하고 코드 블록의 복사를 처리한다. */
const progress = document.querySelector('progress');
const status = document.querySelector('#copy-status');

function updateProgress() {
  const length = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = length > 0 ? 100 * window.scrollY / length : 100;
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
window.addEventListener('load', updateProgress);
updateProgress();

for (const button of document.querySelectorAll('[data-copy]')) {
  const label = button.textContent;
  const code = button.closest('figure').querySelector('code');
  let reset;
  button.hidden = false;
  button.addEventListener('click', async () => {
    clearTimeout(reset);
    let message;
    try {
      await navigator.clipboard.writeText(code.textContent);
      message = document.body.dataset.copied;
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      message = document.body.dataset.failed;
    }
    button.textContent = message;
    status.textContent = message;
    reset = setTimeout(() => {
      button.textContent = label;
      status.textContent = '';
    }, 1800);
  });
}
