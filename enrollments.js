/* enrollments.js */
let deleteTargetId = null, deleteName = '';

async function init() {
  const [students, courses] = await Promise.all([API.get('/students'), API.get('/courses')]);
  const sF = document.getElementById('studentFilter'), cF = document.getElementById('courseFilter');
  const sS = document.getElementById('f_student'),     cS = document.getElementById('f_course');
  students.forEach(s => { sF.innerHTML += `<option value="${s.student_id}">${s.student_name}</option>`; sS.innerHTML += `<option value="${s.student_id}">${s.student_name}</option>`; });
  courses.forEach(c  => { cF.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;   cS.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`; });
  // Set today's date
  document.getElementById('f_date').value = new Date().toISOString().substring(0,10);
}

async function loadEnrollments() {
  showLoading('tableWrapper');
  try {
    const data = await API.get('/enrollments', {
      student_id: document.getElementById('studentFilter').value,
      course_id:  document.getElementById('courseFilter').value,
      status:     document.getElementById('statusFilter').value,
    });
    if (!data.length) {
      document.getElementById('enrollBody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-file-circle-check"></i><p>No enrollments found</p></div></td></tr>`;
      document.getElementById('pgInfo').textContent = ''; document.getElementById('pgBtns').innerHTML = '';
      return;
    }
    Paginator.create({
      data, pageSize: 12, infoId: 'pgInfo', paginationId: 'pgBtns',
      renderFn: rows => {
        document.getElementById('enrollBody').innerHTML = rows.map(e => {
          const sbadge = e.status === 'Active' ? 'badge-active' : e.status === 'Dropped' ? 'badge-dropped' : 'badge-complete';
          return `
          <tr>
            <td style="color:var(--text-muted);">${e.enrollment_id}</td>
            <td><div style="display:flex;align-items:center;gap:8px;">
              <div class="avatar" style="width:30px;height:30px;font-size:12px;">${e.student_name[0]}</div>
              <span style="font-weight:600;">${e.student_name}</span>
            </div></td>
            <td>${e.course_name}</td>
            <td><span class="badge-pill badge-complete">${e.course_code}</span></td>
            <td style="color:var(--text-muted);">${e.enrollment_date ? e.enrollment_date.substring(0,10) : '—'}</td>
            <td>
              <select class="filter-select" onchange="updateStatus(${e.enrollment_id},this.value)" style="padding:4px 8px;font-size:12px;">
                <option ${e.status==='Active'?'selected':''} value="Active">Active</option>
                <option ${e.status==='Dropped'?'selected':''} value="Dropped">Dropped</option>
                <option ${e.status==='Completed'?'selected':''} value="Completed">Completed</option>
              </select>
            </td>
            <td>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${e.enrollment_id},'${e.student_name.replace(/'/g,"\\'")} → ${e.course_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('');
      }
    });
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

async function updateStatus(id, status) {
  try {
    await API.put(`/enrollments/${id}`, { status });
    Toast.success('Status updated');
  } catch(e) { Toast.error(e.message); loadEnrollments(); }
}

async function enroll() {
  if (!Validator.validate('enrollForm')) return;
  const payload = {
    student_id:      document.getElementById('f_student').value,
    course_id:       document.getElementById('f_course').value,
    enrollment_date: document.getElementById('f_date').value,
    status:          document.getElementById('f_status').value,
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.post('/enrollments', payload);
    Toast.success('Student enrolled!');
    Modal.close('enrollModal');
    loadEnrollments();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enroll'; }
}

function confirmDelete(id, name) {
  deleteTargetId = id; deleteName = name;
  document.getElementById('deleteItemName').textContent = name;
  Modal.open('deleteModal');
}

async function doDelete() {
  try {
    await API.delete(`/enrollments/${deleteTargetId}`);
    Toast.success('Enrollment removed');
    Modal.close('deleteModal');
    loadEnrollments();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadEnrollments();
  TableSort.init('enrollTable');
  document.getElementById('btnAdd').onclick = () => { Validator.clear('enrollForm'); Modal.open('enrollModal'); };
  document.getElementById('btnSave').onclick = enroll;
  document.getElementById('btnConfirmDelete').onclick = doDelete;
  ['studentFilter','courseFilter','statusFilter'].forEach(id => document.getElementById(id).addEventListener('change', loadEnrollments));
});
