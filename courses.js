/* courses.js */
let enrollCountMap = {}, deleteTargetId = null;

async function init() {
  const [depts, enrollData] = await Promise.all([
    API.get('/departments'),
    API.get('/analytics/course-enrollment')
  ]);
  enrollCountMap = {};
  enrollData.forEach(e => { enrollCountMap[e.course_id] = e.enrollment_count; });
  const filter = document.getElementById('deptFilter');
  const fDept  = document.getElementById('f_dept');
  depts.forEach(d => {
    filter.innerHTML += `<option value="${d.dept_id}">${d.dept_name}</option>`;
    fDept.innerHTML  += `<option value="${d.dept_id}">${d.dept_name}</option>`;
  });
}

async function loadCourses() {
  showLoading('tableWrapper');
  try {
    const data = await API.get('/courses', {
      search:  document.getElementById('searchInput').value,
      dept_id: document.getElementById('deptFilter').value,
    });
    renderTable(data);
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

const CREDIT_COLORS = { 1:'#EF4444',2:'#F59E0B',3:'#6C63FF',4:'#10B981',5:'#3B82F6' };

function renderTable(data) {
  if (!data.length) {
    document.getElementById('coursesBody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No courses found</p></div></td></tr>`;
    return;
  }
  Paginator.create({
    data, pageSize: 10, infoId: 'pgInfo', paginationId: 'pgBtns',
    renderFn: rows => {
      document.getElementById('coursesBody').innerHTML = rows.map(c => {
        const cc = CREDIT_COLORS[c.credits] || '#6C63FF';
        const count = enrollCountMap[c.course_id] || 0;
        return `
        <tr>
          <td style="color:var(--text-muted);">${c.course_id}</td>
          <td><span class="badge-pill badge-complete">${c.course_code}</span></td>
          <td style="font-weight:600;color:var(--text-bright);">${c.course_name}</td>
          <td>${c.dept_name || '—'}</td>
          <td><span class="badge-pill" style="background:${cc}22;color:${cc};">${c.credits} cr</span></td>
          <td>Sem ${c.semester}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="viewEnrolled(${c.course_id},'${c.course_name.replace(/'/g,"\\'")}')">
              <i class="fa-solid fa-users"></i> ${count}
            </button>
          </td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm btn-icon" onclick="editCourse(${c.course_id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${c.course_id},'${c.course_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
  });
}

function openAdd() {
  document.getElementById('modalTitle').textContent = 'Add Course';
  document.getElementById('courseId').value = '';
  Validator.clear('courseForm');
  Modal.open('courseModal');
}

async function editCourse(id) {
  try {
    const c = await API.get(`/courses/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Course';
    document.getElementById('courseId').value  = c.course_id;
    document.getElementById('f_name').value    = c.course_name;
    document.getElementById('f_code').value    = c.course_code;
    document.getElementById('f_dept').value    = c.dept_id || '';
    document.getElementById('f_credits').value = c.credits;
    document.getElementById('f_sem').value     = c.semester;
    document.getElementById('f_desc').value    = c.description || '';
    Modal.open('courseModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveCourse() {
  if (!Validator.validate('courseForm')) return;
  const id = document.getElementById('courseId').value;
  const payload = {
    course_name: document.getElementById('f_name').value.trim(),
    course_code: document.getElementById('f_code').value.trim().toUpperCase(),
    dept_id:     document.getElementById('f_dept').value || null,
    credits:     document.getElementById('f_credits').value,
    semester:    document.getElementById('f_sem').value,
    description: document.getElementById('f_desc').value.trim(),
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    if (id) { await API.put(`/courses/${id}`, payload); Toast.success('Course updated!'); }
    else    { await API.post('/courses', payload);       Toast.success('Course added!'); }
    Modal.close('courseModal');
    loadCourses();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

async function viewEnrolled(courseId, courseName) {
  document.getElementById('courseTitle').textContent = courseName;
  Modal.open('enrolledModal');
  const body = document.getElementById('enrolledBody');
  body.innerHTML = '<div class="spinner" style="margin:20px auto;display:block;"></div>';
  try {
    const data = await API.get(`/enrollments/course/${courseId}/students`);
    if (!data.length) { body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-users"></i><p>No students enrolled</p></div>`; return; }
    body.innerHTML = `<div class="table-wrapper"><table>
      <thead><tr><th>#</th><th>Student</th><th>Department</th><th>Enrolled On</th><th>Status</th></tr></thead>
      <tbody>${data.map((s,i)=>`<tr>
        <td style="color:var(--text-muted);">${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:8px;">
          <div class="avatar" style="width:30px;height:30px;font-size:12px;">${s.student_name[0]}</div>
          <div><div style="font-weight:600;">${s.student_name}</div><div style="font-size:12px;color:var(--text-muted);">${s.email}</div></div>
        </div></td>
        <td>${s.dept_name||'—'}</td>
        <td>${s.enrollment_date?s.enrollment_date.substring(0,10):'—'}</td>
        <td><span class="badge-pill ${s.status==='Active'?'badge-active':s.status==='Dropped'?'badge-dropped':'badge-complete'}">${s.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { body.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`; }
}

function confirmDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteItemName').textContent = name;
  Modal.open('deleteModal');
}

async function doDelete() {
  try {
    await API.delete(`/courses/${deleteTargetId}`);
    Toast.success('Course deleted');
    Modal.close('deleteModal');
    loadCourses();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadCourses();
  TableSort.init('coursesTable');
  document.getElementById('btnAdd').onclick = openAdd;
  document.getElementById('btnSave').onclick = saveCourse;
  document.getElementById('btnConfirmDelete').onclick = doDelete;
  let t;
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadCourses, 300); });
  document.getElementById('deptFilter').addEventListener('change', loadCourses);
});
