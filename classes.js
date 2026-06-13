/* classes.js */
let deleteTargetId = null;

async function init() {
  const [courses, faculty] = await Promise.all([API.get('/courses'), API.get('/faculty')]);
  const cF = document.getElementById('courseFilter'), fF = document.getElementById('facultyFilter');
  const cS = document.getElementById('f_course'),    fS = document.getElementById('f_faculty');
  courses.forEach(c => { cF.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`; cS.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`; });
  faculty.forEach(f => { fF.innerHTML += `<option value="${f.faculty_id}">${f.faculty_name}</option>`; fS.innerHTML += `<option value="${f.faculty_id}">${f.faculty_name}</option>`; });
}

async function loadClasses() {
  showLoading('tableWrapper');
  try {
    const data = await API.get('/classes', {
      course_id:  document.getElementById('courseFilter').value,
      faculty_id: document.getElementById('facultyFilter').value,
    });
    if (!data.length) {
      document.getElementById('classesBody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-chalkboard-user"></i><p>No classes found</p></div></td></tr>`;
      return;
    }
    Paginator.create({
      data, pageSize: 12, infoId: 'pgInfo', paginationId: 'pgBtns',
      renderFn: rows => {
        document.getElementById('classesBody').innerHTML = rows.map(c => `
          <tr>
            <td style="color:var(--text-muted);">${c.class_id}</td>
            <td><span style="font-weight:600;color:var(--text-bright);">${c.class_date ? c.class_date.substring(0,10) : '—'}</span></td>
            <td><span class="badge-pill badge-complete">${c.course_code||''}</span> ${c.course_name}</td>
            <td>${c.faculty_name || '—'}</td>
            <td style="font-size:13px;color:var(--text-muted);">${c.start_time||''} ${c.end_time?'– '+c.end_time:''}</td>
            <td><span class="badge-pill badge-present">${c.room_no || '—'}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost btn-sm btn-icon" onclick="editClass(${c.class_id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${c.class_id})"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>`).join('');
      }
    });
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

function openAdd() {
  document.getElementById('modalTitle').textContent = 'Schedule Class';
  document.getElementById('classId').value = '';
  Validator.clear('classForm');
  Modal.open('classModal');
}

async function editClass(id) {
  try {
    const c = await API.get(`/classes/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Class';
    document.getElementById('classId').value    = c.class_id;
    document.getElementById('f_course').value   = c.course_id;
    document.getElementById('f_faculty').value  = c.faculty_id || '';
    document.getElementById('f_date').value     = c.class_date ? c.class_date.substring(0,10) : '';
    document.getElementById('f_start').value    = c.start_time || '';
    document.getElementById('f_end').value      = c.end_time || '';
    document.getElementById('f_room').value     = c.room_no || '';
    Modal.open('classModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveClass() {
  if (!Validator.validate('classForm')) return;
  const id = document.getElementById('classId').value;
  const payload = {
    course_id:  document.getElementById('f_course').value,
    faculty_id: document.getElementById('f_faculty').value || null,
    class_date: document.getElementById('f_date').value,
    start_time: document.getElementById('f_start').value || null,
    end_time:   document.getElementById('f_end').value || null,
    room_no:    document.getElementById('f_room').value.trim(),
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    if (id) { await API.put(`/classes/${id}`, payload); Toast.success('Class updated!'); }
    else    { await API.post('/classes', payload);       Toast.success('Class scheduled!'); }
    Modal.close('classModal');
    loadClasses();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

function confirmDelete(id) {
  deleteTargetId = id;
  Modal.open('deleteModal');
}

async function doDelete() {
  try {
    await API.delete(`/classes/${deleteTargetId}`);
    Toast.success('Class deleted');
    Modal.close('deleteModal');
    loadClasses();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadClasses();
  TableSort.init('classesTable');
  document.getElementById('btnAdd').onclick = openAdd;
  document.getElementById('btnSave').onclick = saveClass;
  document.getElementById('btnConfirmDelete').onclick = doDelete;
  document.getElementById('courseFilter').addEventListener('change', loadClasses);
  document.getElementById('facultyFilter').addEventListener('change', loadClasses);
});
