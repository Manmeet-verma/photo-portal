function toast(message, type = '') {
  const wrap = document.querySelector('.toasts') || (() => {
    const d = document.createElement('div');
    d.className = 'toasts';
    document.body.appendChild(d);
    return d;
  })();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '•'}</span><span>${esc(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
  }, 3400);
}

function openModal(html, { wide = false, onMount } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(back); });
  if (onMount) onMount(back.querySelector('.modal'), closeModal.bind(null, back));
  return back;
}

function closeModal(back) {
  back.style.opacity = '0';
  back.style.transition = 'opacity .25s';
  setTimeout(() => back.remove(), 260);
}

/* Scroll-reveal + counters */
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  document.querySelectorAll('.count').forEach((el) => {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || '';
    const io2 = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io2.disconnect();
      const dur = 1400;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io2.observe(el);
  });
}

function skeleton(height = 160) {
  return `<div class="skeleton" style="height:${height}px"></div>`;
}

/* Lightbox (shared) */
function openLightbox(photos, startIndex, downloadName) {
  const arr = Array.isArray(photos) ? photos : [];
  if (!arr.length) return;
  let x = Math.max(0, Math.min(startIndex || 0, arr.length - 1));

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <button class="lb-close" title="Close">✕</button>
    ${downloadName ? `<a class="lb-download" href="#" download>⬇ Download</a>` : ''}
    ${arr.length > 1 ? `<button class="lb-nav lb-prev">‹</button><button class="lb-nav lb-next">›</button>` : ''}
    <img class="lb-img" src="" alt="">
    <div class="lb-name"></div>
    <div class="lb-counter"></div>`;
  document.body.appendChild(box);
  document.body.style.overflow = 'hidden';

  const img = box.querySelector('.lb-img');
  const name = box.querySelector('.lb-name');
  const counter = box.querySelector('.lb-counter');
  const dl = box.querySelector('.lb-download');

  function render() {
    const p = arr[x];
    img.src = p.src || `/api/photo/${p.id}`;
    name.textContent = p.name || '';
    counter.textContent = `${x + 1} / ${arr.length}`;
    img.classList.remove('anim-pop');
    void img.offsetWidth;
    img.classList.add('anim-pop');
    if (dl) dl.href = `/api/photo/${p.id}?download=1`;
  }
  render();

  const prev = box.querySelector('.lb-prev'), next = box.querySelector('.lb-next');
  if (prev) prev.onclick = (e) => { e.stopPropagation(); x = (x - 1 + arr.length) % arr.length; render(); };
  if (next) next.onclick = (e) => { e.stopPropagation(); x = (x + 1) % arr.length; render(); };
  box.querySelector('.lb-close').onclick = close;
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
    if (e.target === img) { x = (x + 1) % arr.length; render(); }
  });
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') { x = (x - 1 + arr.length) % arr.length; render(); }
    if (e.key === 'ArrowRight') { x = (x + 1) % arr.length; render(); }
  };
  document.addEventListener('keydown', onKey);

  function close() {
    document.removeEventListener('keydown', onKey);
    box.style.opacity = '0';
    box.style.transition = 'opacity .3s';
    document.body.style.overflow = '';
    setTimeout(() => box.remove(), 300);
  }
}

/* App shell helpers */
function ensureNav() {
  const u = currentUser();
  const root = document.querySelector('#navbar-root');
  if (!root) return;
  root.innerHTML = u
    ? `<a class="btn btn-primary btn-sm" href="${u.role === 'admin' ? '/admin.html' : '/account.html'}">My Dashboard →</a>
       <button class="btn btn-ghost btn-sm" onclick="signOut()">Sign out</button>`
    : `<a class="btn btn-ghost btn-sm" href="/login">Sign in</a>
       <a class="btn btn-primary btn-sm" href="/login?tab=register">Get started free</a>`;
}