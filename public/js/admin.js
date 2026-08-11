/* ================= LensLink — Photographer Studio Panel ================= */
(function () {
  const user = currentUser();
  if (!user) { location.href = '/login.html'; return; }
  if (user.role !== 'admin') { location.href = '/account.html'; return; }

  const side = document.getElementById('app-side');
  document.getElementById('app-burger').onclick = () => side.classList.toggle('open');
  document.getElementById('side-avatar').textContent = initials(user.name);
  document.getElementById('side-name').textContent = user.name;

  const TITLES = { overview: 'Overview', galleries: 'Galleries', team: 'Team & clients', drive: 'Google Drive' };
  const viewEls = {
    overview: document.getElementById('view-overview'),
    galleries: document.getElementById('view-galleries'),
    team: document.getElementById('view-team'),
    drive: document.getElementById('view-drive'),
  };

  let events = [];
  let usersCache = [];

  function switchView(name) {
    document.querySelectorAll('.side-link').forEach((l) => l.classList.toggle('active', l.dataset.view === name));
    document.getElementById('page-title').textContent = TITLES[name];
    document.getElementById('crumb').textContent = 'Workspace';
    for (const key in viewEls) viewEls[key].style.display = key === name ? '' : 'none';
    side.classList.remove('open');
    if (name === 'overview') renderOverview();
    if (name === 'galleries') renderGalleries();
    if (name === 'team') loadTeam();
    if (name === 'drive') loadDriveSettings();
  }
  document.querySelectorAll('.side-link').forEach((l) => l.addEventListener('click', () => switchView(l.dataset.view)));

  async function loadEvents() {
    try { events = (await API.get('/events')).events; }
    catch (e) { toast(e.message, 'error'); }
  }

  /* ============================== OVERVIEW ============================== */
  function renderOverview() {
    let photos = 0;
    const clients = new Set();
    events.forEach((e) => {
      photos += e.photoCount;
      (e.guestEmails || []).forEach((m) => clients.add(m));
    });
    const wrap = viewEls.overview;
    wrap.innerHTML = `
      <div class="stat-grid">
        <div class="stat anim-pop"><div class="ico">🖼️</div><div><b>${events.length}</b><span>Galleries</span></div></div>
        <div class="stat anim-pop" style="animation-delay:.06s"><div class="ico">📸</div><div><b>${photos}</b><span>Photos delivered</span></div></div>
        <div class="stat anim-pop" style="animation-delay:.12s"><div class="ico">👥</div><div><b>${clients.size}</b><span>Clients</span></div></div>
        <div class="stat anim-pop" style="animation-delay:.18s"><div class="ico">🔗</div><div><b>${events.length}</b><span>Share links</span></div></div>
      </div>
      <div class="panel panel-pad">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h3 style="font-size:18px">Recent galleries</h3>
          <button class="btn btn-ghost btn-sm" onclick="LL.switchView('galleries')">View all →</button>
        </div>
        <div class="gallery-grid">${events.slice(0, 3).map(galleryCard).join('') || '<p style="color:var(--muted);grid-column:1/-1">No galleries yet — create one to get started.</p>'}</div>
      </div>`;
  }

  function galleryCard(ev, i) {
    return `
    <div class="gallery-card" onclick="LL.openEvent('${ev.id}')" style="animation-delay:${(i || 0) * 0.07}s">
      <div class="gallery-cover">
        ${ev.cover ? `<img src="${ev.cover}" loading="lazy" alt="">` : `<div class="empty">🖼️</div>`}
        <span class="count-badge">📸 ${ev.photoCount}</span>
        <div class="gallery-actions">
          <button class="icon-btn" onclick="event.stopPropagation();LL.copyShare('${ev.id}')" title="Copy share link">🔗</button>
          <button class="icon-btn danger" onclick="event.stopPropagation();LL.deleteGallery('${ev.id}')" title="Delete gallery">🗑</button>
        </div>
      </div>
      <div class="gallery-body">
        <h3>${esc(ev.title)}</h3>
        <div class="meta"><span>${fmtDate(ev.eventDate || ev.createdAt)}</span><span class="dot"></span><span>${esc(ev.code)}</span></div>
        <span class="link-chip">🔗 /s/${esc(ev.code)}</span>
      </div>
    </div>`;
  }

  function renderGalleries() {
    const wrap = viewEls.galleries;
    if (events.length) {
      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap">
          <p style="color:var(--muted)">${events.length} gallery${events.length > 1 ? 'ies' : 'y'} · ${events.reduce((s, e) => s + e.photoCount, 0)} photos</p>
          <button class="btn btn-primary" onclick="LL.createGallery()">+ New gallery</button>
        </div>
        <div class="gallery-grid">${events.map(galleryCard).join('')}</div>`;
    } else {
      wrap.innerHTML = `
        <div class="empty-state"><div class="big">🖼️</div>
          <h3>No galleries yet</h3>
          <p>Create your first gallery, upload photos or pull them from Google Drive,<br>then share the auto-generated link with your client.</p>
          <br><button class="btn btn-primary" onclick="LL.createGallery()">+ Create your first gallery</button>
        </div>`;
    }
  }

  /* ============================== GALLERIES ============================== */
  window.LL = window.LL || {};
  const LL = window.LL;

  LL.switchView = switchView;

  LL.createGallery = () => {
    openModal(`
      <div class="modal-head"><h3>New gallery</h3><button class="modal-close" onclick="closeModal(this.closest('.modal-back'))">✕</button></div>
      <div class="modal-body">
        <form id="ev-form">
          <div class="field"><label>Gallery title</label><input class="input" id="ev-title" required placeholder="e.g. Rohan & Priya — Wedding Day"></div>
          <div class="field"><label>Description <span style="color:var(--muted)">(optional)</span></label><textarea class="input" id="ev-desc" rows="2" placeholder="A short welcome message clients see when they open the link"></textarea></div>
          <div class="field"><label>Event date</label><input class="input" id="ev-date" type="date"></div>
          <div class="field"><label>Clients <span style="color:var(--muted)">(emails, comma separated)</span></label>
            <input class="input" id="ev-guests" placeholder="client@mail.com, partner@mail.com">
            <div class="form-hint">These customers automatically see this gallery in their account.</div>
          </div>
          <button class="btn btn-primary" style="width:100%" type="submit">Create gallery →</button>
        </form>
      </div>`,
      { onMount: (modal, close) => {
        modal.querySelector('#ev-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button[type=submit]');
          btn.disabled = true;
          try {
            await API.post('/events', {
              title: modal.querySelector('#ev-title').value.trim(),
              description: modal.querySelector('#ev-desc').value.trim(),
              eventDate: modal.querySelector('#ev-date').value || null,
              guestEmails: modal.querySelector('#ev-guests').value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
            });
            toast('Gallery created!', 'success');
            close();
            await loadEvents();
            renderGalleries();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      } });
  };

  LL.deleteGallery = async (id) => {
    if (!confirm('Delete this gallery and all its photos? This cannot be undone.')) return;
    try {
      await API.del(`/events/${id}`);
      toast('Gallery deleted', 'success');
      events = events.filter((e) => e.id !== id);
      renderGalleries();
    } catch (e) { toast(e.message, 'error'); }
  };

  LL.copyShare = async (id) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    try {
      await navigator.clipboard.writeText(shareUrlOf(ev));
      toast('Share link copied to clipboard', 'success');
    } catch {
      openSharePanel(ev);
    }
  };

  /* ---------------- open gallery detail ---------------- */
  LL.openEvent = async (id) => {
    let item;
    try { item = (await API.get(`/events/${id}`)).item; }
    catch (e) { toast(e.message, 'error'); return; }

    openModal(`
      <div class="modal-head">
        <div><h3>${esc(item.title)}</h3><p style="font-size:13px;color:var(--muted)">${item.photoCount} photos · code ${esc(item.code)}</p></div>
        <button class="modal-close" onclick="closeModal(this.closest('.modal-back'))">✕</button>
      </div>
      <div class="modal-body">
        <div class="dropzone" id="dz-drop">
          <div class="dz-ico">📷</div>
          <h4>Drop photos here or click to browse</h4>
          <p>Multiple images · JPEG, PNG, WebP & more · up to 50 MB each</p>
          <div class="progress-track" id="dz-progress"><div class="progress-bar" id="dz-bar"></div></div>
          <input type="file" id="file-input" accept="image/*" multiple hidden>
        </div>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="btn-share">🔗 Share link</button>
            <button class="btn btn-ghost btn-sm" id="btn-drive">☁️ From Google Drive</button>
            <button class="btn btn-danger btn-sm" id="btn-delete-sel" style="display:none">🗑 Delete selected (<span id="sel-count">0</span>)</button>
          </div>
          <span class="chip" id="photo-count">${item.photoCount} photos</span>
        </div>
        <div class="photo-grid" id="photo-grid" style="margin-top:16px"></div>
      </div>`,
      { wide: true, onMount: () => {
        const grid = document.getElementById('photo-grid');
        const countChip = document.getElementById('photo-count');
        const delSelBtn = document.getElementById('btn-delete-sel');
        const selCount = document.getElementById('sel-count');
        let selected = new Set();

        function render() {
          grid.innerHTML = item.photos.map((p) => `
            <div class="photo-tile ${selected.has(p.id) ? 'selected' : ''}" data-id="${p.id}">
              <img src="/api/photo/${p.id}" loading="lazy" alt="">
              <span class="tile-check">✓</span>
              <button class="icon-btn tile-remove" title="Remove photo">✕</button>
            </div>`).join('') ||
            '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:26px">No photos yet — drop images above or import from Google Drive.</p>';
          countChip.textContent = `${item.photos.length} photos`;
        }

        grid.addEventListener('click', async (e) => {
          const tile = e.target.closest('.photo-tile');
          if (!tile) return;
          const pid = String(tile.dataset.id);
          if (e.target.closest('.tile-remove')) {
            if (!confirm('Remove this photo from the gallery?')) return;
            try {
              await API.del(`/events/${item.id}/photos/${pid}`);
              item.photos = item.photos.filter((p) => p.id !== pid);
              toast('Photo removed', 'success');
              render();
            } catch (err) { toast(err.message, 'error'); }
            return;
          }
          if (tile.classList.contains('selected')) { tile.classList.remove('selected'); selected.delete(pid); }
          else { tile.classList.add('selected'); selected.add(pid); }
          delSelBtn.style.display = selected.size ? '' : 'none';
          selCount.textContent = selected.size;
        });

        // lightbox on double-click (open full view)
        grid.addEventListener('dblclick', (e) => {
          const tile = e.target.closest('.photo-tile');
          if (!tile) return;
          if (selected.size) { selected.clear(); delSelBtn.style.display = 'none'; render(); return; }
          const pid = String(tile.dataset.id);
          openLightbox(item.photos.map((p) => ({ ...p, src: `/api/photo/${p.id}` })), item.photos.findIndex((p) => p.id === pid), `${String(item.title).replace(/\s+/g, '-')}-${pid}`);
        });

        delSelBtn.addEventListener('click', async () => {
          if (!selected.size) return;
          if (!confirm(`Delete ${selected.size} selected photo(s)?`)) return;
          try {
            for (const pid of [...selected]) {
              await API.del(`/events/${item.id}/photos/${pid}`);
              item.photos = item.photos.filter((p) => p.id !== pid);
            }
            selected = new Set();
            toast('Photos deleted', 'success');
            render();
            delSelBtn.style.display = 'none';
          } catch (err) { toast(err.message, 'error'); }
        });

        openModalElements: {
          const openShare = document.getElementById('btn-share');
          openShare.addEventListener('click', () => openSharePanel(item));
          const openDriveBtn = document.getElementById('btn-drive');
          openDriveBtn.addEventListener('click', () => openDrivePicker(item));
        }

        /* upload */
        const dz = document.getElementById('dz-drop');
        const input = document.getElementById('file-input');
        const bar = document.getElementById('dz-bar');
        const track = document.getElementById('dz-progress');
        dz.addEventListener('click', () => input.click());
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); uploadFiles([...e.dataTransfer.files]); });
        input.addEventListener('change', () => { uploadFiles([...input.files]); input.value = ''; });

        function uploadFiles(files) {
          if (!files.length) return;
          const form = new FormData();
          files.forEach((f) => form.append('photos', f));
          track.classList.add('show');
          bar.style.width = '3%';
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/events/${item.id}/upload`);
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('ll_token')}`);
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) bar.style.width = `${Math.round((e.loaded / e.total) * 100)}%`; };
          xhr.onload = async () => {
            track.classList.remove('show');
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              item.photos.push(...data.photos);
              toast(`${data.photos.length} photo${data.photos.length > 1 ? 's' : ''} added`, 'success');
              render();
            } else {
              let msg = 'Upload failed';
              try { msg = JSON.parse(xhr.responseText).error; } catch {}
              toast(msg, 'error');
            }
          };
          xhr.onerror = () => { track.classList.remove('show'); toast('Network error during upload', 'error'); };
          xhr.send(form);
        }

        render();
      } });
  };

  /* ---------------- share panel ---------------- */
  function openSharePanel(item) {
    const url = `${location.origin}/s/${item.code}`;
    const msg = `Hey! Here's your gallery "${item.title}": ${url}`;
    openModal(`
      <div class="modal-head"><h3>Share “${esc(item.title)}”</h3><button class="modal-close" onclick="closeModal(this.closest('.modal-back'))">✕</button></div>
      <div class="modal-body">
        <h3 style="font-size:17px;margin-bottom:8px">Your share link is ready ✨</h3>
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px">Anyone with this link can open the gallery and download the ${item.photoCount} photo${item.photoCount === 1 ? '' : 's'} you selected — no account needed.</p>
        <div class="share-link-box">
          <input readonly value="${url}">
          <button class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText('${url}').then(()=>toast('Copied!','success'))">Copy</button>
        </div>
        <div class="share-actions">
          <a class="btn btn-sm btn-ghost" target="_blank" href="https://wa.me/?text=${encodeURIComponent(msg)}">💬 WhatsApp</a>
          <a class="btn btn-sm btn-ghost" href="mailto:?subject=${encodeURIComponent('Your gallery — ' + item.title)}&body=${encodeURIComponent(msg)}">✉️ Email</a>
          <a class="btn btn-sm btn-ghost" href="${url}" target="_blank">👁 Preview</a>
        </div>
        <div class="divider"></div>
        <p style="font-size:13px;color:var(--muted)">💡 Tip: cross out the need to send zips — clients just open the link on any phone.</p>
      </div>`);
  }

  /* ---------------- drive picker ---------------- */
  async function openDrivePicker(item) {
    let pageToken = '';
    let driveFiles = [];
    const selectedFiles = new Set();

    const back = openModal(`
      <div class="modal-head">
        <h3>Pick photos from Google Drive</h3>
        <button class="modal-close" onclick="closeModal(this.closest('.modal-back'))">✕</button>
      </div>
      <div class="modal-body">
        <div class="drive-toolbar">
          <input class="input" id="dv-search" placeholder="Search by name…" style="flex:1;min-width:190px">
          <button class="btn btn-ghost btn-sm" id="dv-search-btn">Search</button>
        </div>
        <div class="drive-grid" id="dv-grid">${skeleton(140)}</div>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="chip" id="dv-count">0 selected</span>
          <div style="display:flex;gap:10px">
            <button class="btn btn-ghost btn-sm" id="dv-more" style="display:none">Load more</button>
            <button class="btn btn-primary" id="dv-import" disabled>Import selected →</button>
          </div>
        </div>
      </div>`, { wide: true });

    const grid = back.querySelector('#dv-grid');
    const countChip = back.querySelector('#dv-count');
    const importBtn = back.querySelector('#dv-import');
    const loadMoreBtn = back.querySelector('#dv-more');

    async function load(query = '', append = false) {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (pageToken) params.set('pageToken', pageToken);
      if (!append) {
        grid.innerHTML = Array(6).fill(skeleton(140)).join('');
        driveFiles = [];
      }
      try {
        const data = await API.get(`/drive/files?${params}`);
        driveFiles.push(...data.files);
        pageToken = data.nextPageToken || '';
        moreBtnBtn.style.display = pageToken ? '' : 'none';
        renderGrid();
      } catch (e) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;padding:30px">
            <h3>${esc(e.message)}</h3>
            <p style="margin-top:6px">Connect your Google account in the Drive settings tab.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="LL.switchView('drive')">Open Drive settings</button>
          </div>`;
      }
    }

    function renderGrid() {
      grid.innerHTML = driveFiles.map((f) => `
        <div class="drive-tile" data-id="${f.id}" title="${esc(f.name)}">
          ${f.thumbnail ? `<img src="${esc(f.thumbnail)}" loading="lazy" alt="">` : `<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--muted)">🖼</div>`}
          <span class="tile-check">✓</span>
        </div>`).join('') || '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:24px">No images found in Drive.</p>';
    }

    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.drive-tile');
      if (!tile) return;
      const id = tile.dataset.id;
      if (selectedFiles.has(id)) selectedFiles.delete(id);
      else selectedFiles.add(id);
      tile.classList.toggle('selected', selectedFiles.has(id));
      countChip.textContent = `${selectedFiles.size} selected`;
      importBtn.disabled = !selectedFiles.size;
    });

    back.querySelector('#dv-search-btn').addEventListener('click', () => {
      pageToken = '';
      load(back.querySelector('#dv-search').value.trim());
    });
    back.querySelector('#dv-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { pageToken = ''; load(back.querySelector('#dv-search').value.trim()); }
    });
    loadMoreBtn.addEventListener('click', () => load(back.querySelector('#dv-search').value.trim(), true));

    importBtn.addEventListener('click', async () => {
      if (!selectedFiles.size) return;
      const selected = driveFiles.filter((f) => selectedFiles.has(f.id));
      try {
        await API.post(`/events/${item.id}/drive`, { files: selected });
        toast(`${selected.length} photo${selected.length > 1 ? 's' : ''} imported from Drive`, 'success');
        closeModal(back);
        LL.openEvent(item.id);
      } catch (e) { toast(e.message, 'error'); }
    });

    load();
  }

  /* ============================== TEAM ============================== */
  async function loadTeam() {
    const wrap = viewEls.team;
    wrap.innerHTML = `<div class="panel panel-pad">${skeleton(120)}</div>`;
    try {
      usersCache = (await API.get('/users')).users;
      const admins = usersCache.filter((u) => u.role === 'admin').length;
      wrap.innerHTML = `
        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat"><div class="ico">👑</div><div><b>${admins}</b><span>Photographers</span></div></div>
          <div class="stat"><div class="ico">👤</div><div><b>${usersCache.length - admins}</b><span>Customers</span></div></div>
          <div class="stat"><div class="ico">👥</div><div><b>${usersCache.length}</b><span>Total accounts</span></div></div>
        </div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
            <div>
              <b style="font-size:16px">Accounts</b>
              <p style="font-size:13px;color:var(--muted)">Photographers manage galleries. Customers receive shared galleries.</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="LL.openUserModal()">+ New account</button>
          </div>
          <div style="overflow-x:auto">
            <table class="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th style="text-align:right">Actions</th></tr></thead>
              <tbody>
                ${usersCache.map((u) => `
                  <tr>
                    <td><b>${esc(u.name)}</b> ${u.id === user.id ? '<span class="pill gold">You</span>' : ''}</td>
                    <td>${esc(u.email)}</td>
                    <td><span class="pill ${u.role}">${u.role === 'admin' ? 'Photographer' : 'Customer'}</span></td>
                    <td style="color:var(--muted)">${fmtDate(u.createdAt)}</td>
                    <td style="text-align:right">
                      <button class="icon-btn" style="display:inline-grid" onclick="LL.openUserModal('${u.id}')">✏️</button>
                      ${u.id !== user.id ? `<button class="icon-btn danger" style="display:inline-grid" onclick="LL.deleteUser('${u.id}')">🗑</button>` : ''}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
      wrap.innerHTML = `<div class="panel panel-pad"><p style="color:var(--danger)">${esc(e.message)}</p></div>`;
    }
  }

  LL.openUserModal = (id) => {
    const u = id ? usersCache.find((x) => x.id === id) : null;
    openModal(`
      <div class="modal-head"><h3>${u ? 'Edit account' : 'Create account'}</h3><button class="modal-close" onclick="closeModal(this.closest('.modal-back'))">✕</button></div>
      <div class="modal-body">
        <form id="user-form">
          <div class="field"><label>Full name</label><input class="input" id="uf-name" required maxlength="60" value="${esc(u?.name || '')}"></div>
          <div class="field"><label>Email address</label><input class="input" id="uf-email" type="email" required value="${esc(u?.email || '')}" ${u ? 'readonly style="opacity:.55"' : ''}></div>
          <div class="field"><label>Account type</label>
            <select class="input" id="uf-role">
              <option value="user" ${u && u.role === 'user' ? 'selected' : ''}>Customer — receives shared galleries</option>
              <option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Photographer — studio dashboard access</option>
            </select>
          </div>
          <div class="field"><label>${u ? 'New password (leave blank to keep current)' : 'Password'}</label><input class="input" id="uf-pass" type="password" minlength="6" placeholder="At least 6 characters" ${u ? '' : 'required'}></div>
          <button class="btn btn-primary" style="width:100%" type="submit">${u ? 'Save changes' : 'Create account'}</button>
        </form>
      </div>`,
      { onMount: (modal, close) => {
        modal.querySelector('#user-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button[type=submit]');
          btn.disabled = true;
          try {
            const body = {
              name: modal.querySelector('#uf-name').value.trim(),
              role: modal.querySelector('#uf-role').value,
            };
            const pass = modal.querySelector('#uf-pass').value;
            if (pass) body.password = pass;
            if (u) await API.patch(`/users/${u.id}`, body);
            else await API.post('/users', { ...body, email: modal.querySelector('#uf-email').value.trim(), password: pass });
            toast(u ? 'Account updated' : 'Account created', 'success');
            close();
            loadTeam();
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        });
      } });
  };

  LL.deleteUser = async (id) => {
    const u = usersCache.find((x) => x.id === id);
    if (!confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    try {
      await API.del(`/users/${id}`);
      toast('Account deleted', 'success');
      loadTeam();
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ============================== DRIVE ============================== */
  function loadDriveSettings() {
    const wrap = viewEls.drive;
    wrap.innerHTML = `<div class="panel panel-pad" style="max-width:760px">${skeleton(200)}</div>`;
    (async () => {
      try {
        const s = await API.get('/drive/status');
        if (!s.configured) {
          wrap.innerHTML = driveSetupCard();
        } else if (!s.connected) {
          wrap.innerHTML = `
            <div class="panel panel-pad anim-fade-up" style="max-width:760px">
              <h3 style="font-size:20px;margin-bottom:10px">Connect Google Drive</h3>
              <p style="color:var(--muted);margin-bottom:22px">Sign in with Google to browse your Drive folders and import photos into galleries — no download needed.</p>
              <a class="btn btn-primary" href="/api/drive/authurl">☁️ Continue with Google</a>
            </div>`;
        } else {
          wrap.innerHTML = `
            <div class="panel panel-pad anim-fade-up" style="max-width:760px">
              <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
                <div style="width:52px;height:52px;border-radius:50%;background:var(--grad);display:grid;place-items:center;color:#fff;font-size:22px">✓</div>
                <div style="flex:1">
                  <h3 style="font-size:19px">Connected to ${esc(s.email)}</h3>
                  <p style="color:var(--muted);font-size:14px">You can now import photos from Drive inside any gallery (☁️ button).</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick="LL.disconnectDrive()">Disconnect</button>
              </div>
            </div>`;
        }
      } catch (e) {
        wrap.innerHTML = `<div class="panel panel-pad"><p style="color:var(--danger)">${esc(e.message)}</p></div>`;
      }
    })();
  }

  function driveSetupCard() {
    return `
    <div class="panel panel-pad anim-fade-up" style="max-width:760px">
      <span class="eyebrow">One-time setup</span>
      <h3 style="font-size:22px;margin:14px 0 8px">Enable Google Drive import</h3>
      <p style="color:var(--muted);margin-bottom:20px">To let photographers pull photos straight from Google Drive, create free OAuth credentials — it takes about 5 minutes:</p>
      <ol style="margin-left:20px;line-height:2.1;color:var(--ink-soft)">
        <li>Open <a href="https://console.cloud.google.com" target="_blank">console.cloud.google.com</a> and create a project.</li>
        <li>Go to <b>APIs &amp; Services → Library</b> and enable <b>Google Drive API</b>.</li>
        <li>Go to <b>APIs &amp; Services → Credentials</b> → <b>Create credentials → OAuth client ID</b>.</li>
        <li>Application type: <b>Web application</b>. Add this redirect URI:<br>
          <code style="display:inline-block;background:var(--mist-2);padding:4px 10px;border-radius:8px;margin:4px 0">${location.origin}/api/drive/callback</code></li>
        <li>Copy the <b>Client ID</b> and <b>Client secret</b> into a file named <code>.env</code> in the project folder:</li>
      </ol>
      <pre style="background:var(--ink);color:#cbd5e1;border-radius:12px;padding:16px;font-size:13px;overflow-x:auto;margin:6px 0 22px">GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx</pre>
      <p style="font-size:13.5px;color:var(--muted)">Then restart the server (<code>npm start</code>) and come back to this page. Until then, you can still upload photos from your computer.</p>
    </div>`;
  }

  LL.disconnectDrive = async () => {
    try {
      await API.post('/drive/disconnect');
      toast('Drive disconnected', 'success');
      loadDriveSettings();
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ============================== START ============================== */
  (async () => {
    await loadEvents();
    const p = new URLSearchParams(location.search).get('tab');
    const valid = ['overview', 'galleries', 'team', 'drive'];
    switchView(valid.includes(p) ? p : 'overview');
    acquireInitialTab();
  })();

  function acquireInitialTab() {}

  window.LL = LL;
})();