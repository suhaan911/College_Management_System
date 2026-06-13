/* ============================================================
   app.js — Shared utilities: API helper, Toast, Modal, Table,
            Pagination, Sidebar, Sorting
   ============================================================ */

const API = {
  base: '/api',

  async get(path, params = {}) {
    const qs = Object.keys(params).filter(k => params[k] !== '' && params[k] != null)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const url = `${this.base}${path}${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json.data;
  },

  async post(path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json;
  },

  async put(path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json;
  },

  async delete(path) {
    const res = await fetch(`${this.base}${path}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json;
  }
};

/* ===== Toast ===== */
const Toast = (() => {
  let container;
  function init() {
    container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
  }
  function show(message, type = 'info', duration = 4000) {
    init();
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <i class="fa-solid ${icons[type]} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <i class="fa-solid fa-xmark toast-close"></i>
    `;
    t.querySelector('.toast-close').onclick = () => dismiss(t);
    container.appendChild(t);
    if (duration > 0) setTimeout(() => dismiss(t), duration);
  }
  function dismiss(t) {
    t.classList.add('hiding');
    t.addEventListener('animationend', () => t.remove());
  }
  return { success: m => show(m,'success'), error: m => show(m,'error'), warning: m => show(m,'warning'), info: m => show(m,'info') };
})();

/* ===== Modal ===== */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },
  init() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) Modal.close(overlay.id);
      });
    });
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.closest('.modal-overlay');
        if (target) Modal.close(target.id);
      });
    });
  }
};

/* ===== Form Validation ===== */
const Validator = {
  validate(formId) {
    const form = document.getElementById(formId);
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      const err = field.nextElementSibling;
      if (!field.value.trim()) {
        field.classList.add('invalid');
        if (err && err.classList.contains('form-error')) { err.textContent = 'This field is required'; err.style.display = 'block'; }
        valid = false;
      } else {
        field.classList.remove('invalid');
        if (err && err.classList.contains('form-error')) err.style.display = 'none';
      }
    });
    return valid;
  },
  clear(formId) {
    const form = document.getElementById(formId);
    form.reset();
    form.querySelectorAll('.invalid').forEach(f => f.classList.remove('invalid'));
    form.querySelectorAll('.form-error').forEach(e => e.style.display = 'none');
  }
};

/* ===== Table Sort ===== */
const TableSort = {
  state: {},
  init(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll('thead th[data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        const cur = this.state[tableId] || {};
        const dir = cur.key === key && cur.dir === 'asc' ? 'desc' : 'asc';
        this.state[tableId] = { key, dir };
        table.querySelectorAll('thead th').forEach(h => {
          h.classList.remove('sorted');
          const icon = h.querySelector('i');
          if (icon) { icon.className = 'fa-solid fa-sort'; }
        });
        th.classList.add('sorted');
        const icon = th.querySelector('i');
        if (icon) icon.className = `fa-solid fa-sort-${dir === 'asc' ? 'up' : 'down'}`;
        this._sort(table, key, dir);
      });
    });
  },
  _sort(table, key, dir) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const av = a.dataset[key] || a.cells[this._colIndex(table, key)]?.textContent || '';
      const bv = b.dataset[key] || b.cells[this._colIndex(table, key)]?.textContent || '';
      const an = parseFloat(av), bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an;
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    rows.forEach(r => tbody.appendChild(r));
  },
  _colIndex(table, key) {
    const ths = table.querySelectorAll('thead th');
    for (let i = 0; i < ths.length; i++) if (ths[i].dataset.sort === key) return i;
    return 0;
  }
};

/* ===== Pagination ===== */
const Paginator = {
  create({ data, pageSize = 10, renderFn, containerId, infoId, paginationId }) {
    let page = 1;
    const totalPages = () => Math.max(1, Math.ceil(data.length / pageSize));
    const render = () => {
      const start = (page - 1) * pageSize;
      const slice = data.slice(start, start + pageSize);
      renderFn(slice);
      if (infoId) {
        const el = document.getElementById(infoId);
        if (el) el.textContent = `Showing ${data.length === 0 ? 0 : start + 1}–${Math.min(start + pageSize, data.length)} of ${data.length} records`;
      }
      if (paginationId) this._renderBtns(paginationId, page, totalPages(), p => { page = p; render(); });
    };
    render();
    return { goTo: p => { page = p; render(); } };
  },
  _renderBtns(id, current, total, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const add = (label, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.className = `pg-btn${active ? ' active' : ''}`;
      btn.innerHTML = label;
      btn.disabled = disabled;
      btn.onclick = () => cb(page);
      el.appendChild(btn);
    };
    add('<i class="fa-solid fa-chevron-left"></i>', current - 1, current === 1);
    const range = this._pageRange(current, total);
    range.forEach(p => {
      if (p === '…') {
        const s = document.createElement('span');
        s.className = 'pg-btn'; s.textContent = '…'; s.style.cursor = 'default';
        el.appendChild(s);
      } else add(p, p, false, p === current);
    });
    add('<i class="fa-solid fa-chevron-right"></i>', current + 1, current === total);
  },
  _pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }
};

/* ===== Loading helpers ===== */
function showLoading(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  let ov = c.querySelector('.loading-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'loading-overlay';
    ov.innerHTML = '<div class="spinner"></div>';
    c.style.position = 'relative';
    c.appendChild(ov);
  }
  ov.style.display = 'flex';
}
function hideLoading(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const ov = c.querySelector('.loading-overlay');
  if (ov) ov.style.display = 'none';
}

/* ===== Sidebar ===== */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggleBtn = document.getElementById('sidebarToggle');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
      const icon = toggleBtn.querySelector('i');
      if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fa-solid fa-chevron-right';
      } else {
        icon.className = 'fa-solid fa-chevron-left';
      }
    });
  }

  // Mobile overlay
  const mobileToggle = document.getElementById('mobileToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  }

  // Mark active nav item
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[href]').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ===== Grade badge ===== */
function gradeBadge(grade) {
  const map = { 'A+': 'badge-a-plus', 'A': 'badge-a', 'B': 'badge-b', 'C': 'badge-c', 'D': 'badge-d', 'F': 'badge-f' };
  return `<span class="badge-pill ${map[grade] || 'badge-grade'}">${grade || '—'}</span>`;
}

/* ===== Init on DOM ready ===== */
document.addEventListener('DOMContentLoaded', () => {
  Modal.init();
  initSidebar();
});
