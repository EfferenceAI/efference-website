// Simple, infinite carousel that moves <li> nodes
const track   = document.getElementById('track');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let cardW;              // width incl. gap
let isMoving = false;   // throttle clicks

function measure() {
  const firstCard = track.querySelector('li');
  if (firstCard) {
    const cardRect = firstCard.getBoundingClientRect();
    const trackStyles = getComputedStyle(track);
    const gap = parseFloat(trackStyles.gap) || 24; // 1.5rem = 24px
    cardW = cardRect.width + gap;
  }
}
measure();

window.addEventListener('resize', measure);

// Move n steps (+1 right, -1 left)
function move(n) {
  if (isMoving || !cardW) return;
  isMoving = true;

  // direction +1 → append first node to end *after* animation
  if (n > 0) {
    track.style.transform = `translateX(-${cardW * n}px)`;
    setTimeout(() => {
      for (let i = 0; i < n; i++) track.appendChild(track.firstElementChild);
      track.style.transition = 'none';
      track.style.transform  = 'translateX(0)';
      requestAnimationFrame(() => {
        track.style.transition = '';
        isMoving = false;
      });
    }, 450);
  }
  // direction -1 → prepend last node(s) *before* animation
  else if (n < 0) {
    for (let i = 0; i < -n; i++)
      track.prepend(track.lastElementChild);
    track.style.transition = 'none';
    track.style.transform  = `translateX(-${cardW * -n}px)`;
    requestAnimationFrame(() => {
      track.style.transition = '';
      track.style.transform  = 'translateX(0)';
      setTimeout(() => { isMoving = false; }, 450);
    });
  }
}

prevBtn.addEventListener('click', () => move(-1));
nextBtn.addEventListener('click', () => move( 1));

/* Drag / swipe support */
let startX, isDown;
track.addEventListener('pointerdown', e => {
  if (isMoving) return;
  isDown = true; 
  startX = e.clientX;
  track.setPointerCapture(e.pointerId);
});
track.addEventListener('pointermove', e => {
  if (!isDown || isMoving) return;
  const diff = e.clientX - startX;
  const threshold = cardW ? cardW / 3 : 100;
  if (Math.abs(diff) > threshold) {
    move(diff < 0 ? 1 : -1);
    isDown = false;
  }
});
track.addEventListener('pointerup', () => (isDown = false));
track.addEventListener('pointercancel', () => (isDown = false));
