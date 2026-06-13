/* students.js */
let allStudents = [], departments = [], deleteTargetId = null;

async function loadDepartments() {
  departments = await API.get('/departments');
  const filter = document.getElementById('deptFilter');
  const fDept  = document.getElementById('f_dept');
  departments.forEach(d => {
    filter.innerHTML += `<option value="${d.dept_id}">${d.dept_name}</option>`;
    fDept.innerHTML  += `<option value="${d.dept_id}">${d.dept_name}</option>`;
  });
}

async function loadStudents() {
  showLoading('tableWrapper');
  try {
    const search  = document.getElementById('searchInput').value;
    const dept_id = document.getElementById('deptFilter').value;
    const gender  = document.getElementById('genderFilter').value;
    allStudents = await API.get('/students', { search, dept_id, gender });
    renderTable(allStudents);
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

function renderTable(data) {
  if (!data.length) {
    document.getElementById('studentsBody').innerHTML = `
      <tr><td colspan="8"><div class="empty-state">
        <i class="fa-solid fa-user-slash"></i>
        <p>No students found</p><small>Try adjusting your search or filters.</small>
      </div></td></tr>`;
    document.getElementById('pgInfo').textContent = '';
    document.getElementById('pgBtns').innerHTML = '';
    return;
  }
  Paginator.create({
    data,
    pageSize: 10,
    containerId: 'tableWrapper',
    infoId: 'pgInfo',
    paginationId: 'pgBtns',
    renderFn: rows => {
      document.getElementById('studentsBody').innerHTML = rows.map(s => {
        const initials = s.student_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
        const genderIcon = s.gender === 'Female' ? 'fa-venus' : s.gender === 'Male' ? 'fa-mars' : 'fa-genderless';
        return `
        <tr data-id="${s.student_id}">
          <td style="color:var(--text-muted);font-size:13px;">${s.student_id}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="avatar">${initials}</div>
              <div>
                <div style="font-weight:600;color:var(--text-bright);">${s.student_name}</div>
                <div style="font-size:12px;color:var(--text-muted);">${s.email}</div>
              </div>
            </div>
          </td>
          <td><span style="font-size:13px;">${s.dept_name || '—'}</span></td>
          <td><i class="fa-solid ${genderIcon}" style="color:var(--primary);margin-right:5px;"></i>${s.gender || '—'}</td>
          <td><span class="badge-pill badge-complete">Sem ${s.semester}</span></td>
          <td style="color:var(--text-muted);">${s.admission_year || '—'}</td>
          <td style="font-size:13px;color:var(--text-muted);">${s.phone || '—'}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm btn-icon" onclick="viewResult(${s.student_id},'${s.student_name}')" data-tip="View Result"><i class="fa-solid fa-chart-bar"></i></button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="editStudent(${s.student_id})" data-tip="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${s.student_id},'${s.student_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
  });
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Student';
  document.getElementById('studentId').value = '';
  Validator.clear('studentForm');
  Modal.open('studentModal');
}

async function editStudent(id) {
  try {
    const s = await API.get(`/students/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Student';
    document.getElementById('studentId').value   = s.student_id;
    document.getElementById('f_name').value      = s.student_name;
    document.getElementById('f_email').value     = s.email;
    document.getElementById('f_phone').value     = s.phone || '';
    document.getElementById('f_dept').value      = s.dept_id || '';
    document.getElementById('f_dob').value       = s.dob ? s.dob.substring(0,10) : '';
    document.getElementById('f_gender').value    = s.gender || '';
    document.getElementById('f_year').value      = s.admission_year || '';
    document.getElementById('f_sem').value       = s.semester || 1;
    document.getElementById('f_address').value   = s.address || '';
    Modal.open('studentModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveStudent() {
  if (!Validator.validate('studentForm')) return;
  const id = document.getElementById('studentId').value;
  const payload = {
    student_name: document.getElementById('f_name').value.trim(),
    email:        document.getElementById('f_email').value.trim(),
    phone:        document.getElementById('f_phone').value.trim(),
    dept_id:      document.getElementById('f_dept').value || null,
    dob:          document.getElementById('f_dob').value || null,
    gender:       document.getElementById('f_gender').value || null,
    admission_year: document.getElementById('f_year').value || null,
    semester:     document.getElementById('f_sem').value,
    address:      document.getElementById('f_address').value.trim(),
  };
  const btn = document.getElementById('btnSaveStudent');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
  try {
    if (id) { await API.put(`/students/${id}`, payload); Toast.success('Student updated!'); }
    else    { await API.post('/students', payload);       Toast.success('Student added!'); }
    Modal.close('studentModal');
    loadStudents();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

function confirmDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteStudentName').textContent = name;
  Modal.open('deleteModal');
}

async function deleteStudent() {
  if (!deleteTargetId) return;
  try {
    await API.delete(`/students/${deleteTargetId}`);
    Toast.success('Student deleted');
    Modal.close('deleteModal');
    loadStudents();
  } catch(e) { Toast.error(e.message); }
}

async function viewResult(id, name) {
  Modal.open('resultModal');
  const body = document.getElementById('resultModalBody');
  body.innerHTML = '<div class="spinner" style="margin:30px auto;display:block;"></div>';
  try {
    const data = await API.get(`/students/${id}/result`);
    if (!data.length) {
      body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-bar"></i><p>No results found for ${name}</p></div>`;
      return;
    }
    body.innerHTML = `
      <h3 style="color:var(--text-bright);margin-bottom:16px;">${name}</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Course</th><th>Exam</th><th>Type</th>
            <th>Marks</th><th>Total</th><th>%</th><th>Grade</th>
          </tr></thead>
          <tbody>${data.map(r => `
            <tr>
              <td>${r.course_name}</td>
              <td>${r.exam_name}</td>
              <td><span class="badge-pill badge-complete">${r.exam_type}</span></td>
              <td style="font-weight:700;color:var(--text-bright);">${r.marks_obtained}</td>
              <td style="color:var(--text-muted);">${r.total_marks}</td>
              <td style="color:var(--primary);font-weight:600;">${r.percentage}%</td>
              <td>${gradeBadge(r.grade)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) { body.innerHTML = `<p style="color:var(--danger);">Error: ${e.message}</p>`; }
}

function exportCSV() {
  if (!allStudents.length) { Toast.warning('No data to export'); return; }
  const headers = ['ID','Name','Email','Phone','Department','Gender','Semester','Admission Year'];
  const rows = allStudents.map(s => [s.student_id, s.student_name, s.email, s.phone||'', s.dept_name||'', s.gender||'', s.semester, s.admission_year||'']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = 'students.csv'; a.click();
  Toast.success('Exported!');
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDepartments();
  await loadStudents();
  TableSort.init('studentsTable');

  document.getElementById('btnAddStudent').onclick = openAddModal;
  document.getElementById('btnSaveStudent').onclick = saveStudent;
  document.getElementById('btnConfirmDelete').onclick = deleteStudent;
  document.getElementById('btnExport').onclick = exportCSV;

  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadStudents, 350);
  });
  document.getElementById('deptFilter').addEventListener('change', loadStudents);
  document.getElementById('genderFilter').addEventListener('change', loadStudents);
});
