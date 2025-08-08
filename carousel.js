const track   = document.getElementById('track');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let cardWidth = 0;
let isMoving  = false;

// Measure card width + gap
function measureCard() {
  const firstCard = track.querySelector('li');
  if (!firstCard) return;
  const cardRect = firstCard.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(track).gap) || 0;
  cardWidth = cardRect.width + gap;
}

// Move one slide (dir: -1 = left, +1 = right)
function move(dir) {
  if (isMoving || !cardWidth) return;
  isMoving = true;

  if (dir > 0) {
    track.style.transition = 'transform 0.4s ease';
    track.style.transform = `translateX(-${cardWidth}px)`;

    // Wait for animation to finish
    track.addEventListener('transitionend', () => {
      track.appendChild(track.firstElementChild);
      track.style.transition = 'none';
      track.style.transform = 'none';

      // Force reflow for Safari before re-enabling transitions
      void track.offsetHeight;

      track.style.transition = '';
      isMoving = false;
    }, { once: true });

  } else {
    track.style.transition = 'none';
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    track.style.transform = `translateX(-${cardWidth}px)`;

    // Force reflow before animating
    void track.offsetHeight;

    track.style.transition = 'transform 0.4s ease';
    track.style.transform = 'translateX(0)';

    track.addEventListener('transitionend', () => {
      isMoving = false;
    }, { once: true });
  }
}

// Initialize and remeasure on resize
function init() {
  measureCard();
  window.addEventListener('resize', () => {
    setTimeout(measureCard, 100);
  });
}
init();

// Button events
prevBtn.addEventListener('click', () => move(-1));
nextBtn.addEventListener('click', () => move( 1));

// Touch swipe support
let touchX = null;
track.addEventListener('touchstart', e => {
  if (isMoving) return;
  touchX = e.touches[0].clientX;
}, { passive: true });

track.addEventListener('touchmove', e => {
  if (touchX === null) return;
  const deltaX = e.touches[0].clientX - touchX;
  if (Math.abs(deltaX) > 50) {
    e.preventDefault();
    move(deltaX < 0 ? 1 : -1);
    touchX = null;
  }
}, { passive: false });

track.addEventListener('touchend', () => {
  touchX = null;
}, { passive: true });
