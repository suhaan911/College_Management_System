/* departments.js */
let allDepts = [], deptStudentMap = {}, deleteTargetId = null;

async function loadDepts() {
  showLoading('tableWrapper');
  try {
    const [depts, counts] = await Promise.all([
      API.get('/departments'),
      API.get('/analytics/dept-count')
    ]);
    allDepts = depts;
    deptStudentMap = {};
    counts.forEach(c => { deptStudentMap[c.dept_name] = c.student_count; });

    // Stat cards
    const ICONS = ['fa-building-columns','fa-users','fa-chalkboard-user','fa-book-open','fa-flask'];
    const COLORS = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EC4899'];
    document.getElementById('deptCards').innerHTML = depts.map((d,i) => `
      <div class="kpi-card" style="--card-accent:${COLORS[i%5]};--card-accent-bg:${COLORS[i%5]}22;cursor:pointer;" onclick="filterByDept('${d.dept_name}')">
        <div class="kpi-icon"><i class="fa-solid ${ICONS[i%5]}"></i></div>
        <div class="kpi-info">
          <div class="kpi-label">${d.dept_name}</div>
          <div class="kpi-value">${deptStudentMap[d.dept_name] || 0}</div>
          <div class="kpi-sub">students enrolled</div>
        </div>
      </div>`).join('');

    filterAndRender();
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

let currentFilter = '';
function filterByDept(name) { currentFilter = name; filterAndRender(); }

function filterAndRender() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  let data = allDepts.filter(d =>
    (!search || d.dept_name.toLowerCase().includes(search) || (d.hod_name||'').toLowerCase().includes(search)) &&
    (!currentFilter || d.dept_name === currentFilter)
  );
  renderTable(data);
}

function renderTable(data) {
  if (!data.length) {
    document.getElementById('deptBody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-building-columns"></i><p>No departments found</p></div></td></tr>`;
    document.getElementById('pgInfo').textContent = ''; document.getElementById('pgBtns').innerHTML = '';
    return;
  }
  Paginator.create({
    data, pageSize: 10, infoId: 'pgInfo', paginationId: 'pgBtns',
    renderFn: rows => {
      document.getElementById('deptBody').innerHTML = rows.map(d => `
        <tr>
          <td style="color:var(--text-muted);">${d.dept_id}</td>
          <td style="font-weight:700;color:var(--text-bright);">${d.dept_name}</td>
          <td>${d.hod_name || '—'}</td>
          <td>${d.established_year || '—'}</td>
          <td>${d.location || '—'}</td>
          <td><span class="badge-pill badge-complete">${deptStudentMap[d.dept_name] || 0} students</span></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm btn-icon" onclick="editDept(${d.dept_id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${d.dept_id},'${d.dept_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('');
    }
  });
}

function openAdd() {
  document.getElementById('modalTitle').textContent = 'Add Department';
  document.getElementById('deptId').value = '';
  Validator.clear('deptForm');
  Modal.open('deptModal');
}

async function editDept(id) {
  try {
    const d = await API.get(`/departments/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Department';
    document.getElementById('deptId').value    = d.dept_id;
    document.getElementById('f_name').value    = d.dept_name;
    document.getElementById('f_hod').value     = d.hod_name || '';
    document.getElementById('f_year').value    = d.established_year || '';
    document.getElementById('f_location').value= d.location || '';
    Modal.open('deptModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveDept() {
  if (!Validator.validate('deptForm')) return;
  const id = document.getElementById('deptId').value;
  const payload = {
    dept_name: document.getElementById('f_name').value.trim(),
    hod_name:  document.getElementById('f_hod').value.trim(),
    established_year: document.getElementById('f_year').value || null,
    location:  document.getElementById('f_location').value.trim(),
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    if (id) { await API.put(`/departments/${id}`, payload); Toast.success('Department updated!'); }
    else    { await API.post('/departments', payload);       Toast.success('Department added!'); }
    Modal.close('deptModal');
    currentFilter = '';
    loadDepts();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

function confirmDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteItemName').textContent = name;
  Modal.open('deleteModal');
}

async function doDelete() {
  try {
    await API.delete(`/departments/${deleteTargetId}`);
    Toast.success('Department deleted');
    Modal.close('deleteModal');
    currentFilter = '';
    loadDepts();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDepts();
  TableSort.init('deptTable');
  document.getElementById('btnAdd').onclick = openAdd;
  document.getElementById('btnSave').onclick = saveDept;
  document.getElementById('btnConfirmDelete').onclick = doDelete;
  let t;
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { currentFilter=''; filterAndRender(); }, 300); });
});
