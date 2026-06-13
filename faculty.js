/* faculty.js */
let departments = [], deleteTargetId = null;

const DESIG_COLORS = {
  'Professor': '#6C63FF', 'Associate Professor': '#10B981',
  'Assistant Professor': '#F59E0B', 'Lecturer': '#3B82F6'
};

async function loadDepartments() {
  departments = await API.get('/departments');
  const filter = document.getElementById('deptFilter');
  const fDept  = document.getElementById('f_dept');
  departments.forEach(d => {
    filter.innerHTML += `<option value="${d.dept_id}">${d.dept_name}</option>`;
    fDept.innerHTML  += `<option value="${d.dept_id}">${d.dept_name}</option>`;
  });
}

async function loadFaculty() {
  showLoading('tableWrapper');
  try {
    const search  = document.getElementById('searchInput').value;
    const dept_id = document.getElementById('deptFilter').value;
    const data = await API.get('/faculty', { search, dept_id });
    renderTable(data);
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

function renderTable(data) {
  if (!data.length) {
    document.getElementById('facultyBody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>No faculty found</p></div></td></tr>`;
    document.getElementById('pgInfo').textContent = '';
    document.getElementById('pgBtns').innerHTML = '';
    return;
  }
  Paginator.create({
    data, pageSize: 10, infoId: 'pgInfo', paginationId: 'pgBtns',
    renderFn: rows => {
      document.getElementById('facultyBody').innerHTML = rows.map(f => {
        const initials = f.faculty_name.split(' ').filter(w=>!w.startsWith('Prof')).map(n=>n[0]).join('').substring(0,2).toUpperCase() || f.faculty_name[0];
        const dColor = DESIG_COLORS[f.designation] || '#6C63FF';
        return `
        <tr>
          <td style="color:var(--text-muted);font-size:13px;">${f.faculty_id}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="avatar" style="background:linear-gradient(135deg,${dColor},${dColor}99);">${initials}</div>
              <div>
                <div style="font-weight:600;color:var(--text-bright);">${f.faculty_name}</div>
                <div style="font-size:12px;color:var(--text-muted);">${f.email}</div>
              </div>
            </div>
          </td>
          <td>${f.dept_name || '—'}</td>
          <td><span class="badge-pill" style="background:${dColor}22;color:${dColor};">${f.designation || '—'}</span></td>
          <td style="font-size:13px;color:var(--text-muted);">${f.phone || '—'}</td>
          <td style="font-weight:600;color:var(--success);">${f.salary ? '₹' + Number(f.salary).toLocaleString('en-IN') : '—'}</td>
          <td style="font-size:13px;color:var(--text-muted);">${f.joining_date ? f.joining_date.substring(0,10) : '—'}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm btn-icon" onclick="viewCourses(${f.faculty_id},'${f.faculty_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-book-open"></i></button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="editFaculty(${f.faculty_id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${f.faculty_id},'${f.faculty_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
  });
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Faculty';
  document.getElementById('facultyId').value = '';
  Validator.clear('facultyForm');
  Modal.open('facultyModal');
}

async function editFaculty(id) {
  try {
    const f = await API.get(`/faculty/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Faculty';
    document.getElementById('facultyId').value      = f.faculty_id;
    document.getElementById('f_name').value         = f.faculty_name;
    document.getElementById('f_email').value        = f.email;
    document.getElementById('f_phone').value        = f.phone || '';
    document.getElementById('f_dept').value         = f.dept_id || '';
    document.getElementById('f_designation').value  = f.designation || '';
    document.getElementById('f_salary').value       = f.salary || '';
    document.getElementById('f_joining').value      = f.joining_date ? f.joining_date.substring(0,10) : '';
    Modal.open('facultyModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveFaculty() {
  if (!Validator.validate('facultyForm')) return;
  const id = document.getElementById('facultyId').value;
  const payload = {
    faculty_name:  document.getElementById('f_name').value.trim(),
    email:         document.getElementById('f_email').value.trim(),
    phone:         document.getElementById('f_phone').value.trim(),
    dept_id:       document.getElementById('f_dept').value || null,
    designation:   document.getElementById('f_designation').value || null,
    salary:        document.getElementById('f_salary').value || null,
    joining_date:  document.getElementById('f_joining').value || null,
  };
  const btn = document.getElementById('btnSaveFaculty');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
  try {
    if (id) { await API.put(`/faculty/${id}`, payload); Toast.success('Faculty updated!'); }
    else    { await API.post('/faculty', payload);       Toast.success('Faculty added!'); }
    Modal.close('facultyModal');
    loadFaculty();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

async function viewCourses(id, name) {
  document.getElementById('facultyNameTitle').textContent = name;
  Modal.open('coursesModal');
  const body = document.getElementById('coursesModalBody');
  body.innerHTML = '<div class="spinner" style="margin:20px auto;display:block;"></div>';
  try {
    const data = await API.get(`/faculty/${id}/courses`);
    if (!data.length) { body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No courses assigned yet</p></div>`; return; }
    body.innerHTML = `<div class="table-wrapper"><table>
      <thead><tr><th>Code</th><th>Course Name</th><th>Department</th><th>Credits</th><th>Semester</th></tr></thead>
      <tbody>${data.map(c=>`<tr>
        <td><span class="badge-pill badge-complete">${c.course_code}</span></td>
        <td style="font-weight:600;color:var(--text-bright);">${c.course_name}</td>
        <td>${c.dept_name||'—'}</td><td>${c.credits}</td><td>${c.semester}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { body.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`; }
}

function confirmDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteFacultyName').textContent = name;
  Modal.open('deleteModal');
}

async function deleteFaculty() {
  if (!deleteTargetId) return;
  try {
    await API.delete(`/faculty/${deleteTargetId}`);
    Toast.success('Faculty deleted');
    Modal.close('deleteModal');
    loadFaculty();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDepartments();
  await loadFaculty();
  TableSort.init('facultyTable');
  document.getElementById('btnAddFaculty').onclick = openAddModal;
  document.getElementById('btnSaveFaculty').onclick = saveFaculty;
  document.getElementById('btnConfirmDelete').onclick = deleteFaculty;
  let t;
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadFaculty, 350); });
  document.getElementById('deptFilter').addEventListener('change', loadFaculty);
});
