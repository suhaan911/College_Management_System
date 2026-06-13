/* exams.js */
let deleteTargetId = null;

const TYPE_COLORS = { 'Internal':'#6C63FF','External':'#10B981','Practical':'#F59E0B','Viva':'#EC4899' };

async function init() {
  const courses = await API.get('/courses');
  const cF = document.getElementById('courseFilter');
  const cS = document.getElementById('f_course');
  courses.forEach(c => {
    cF.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
    cS.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
  });
}

async function loadExams() {
  showLoading('tableWrapper');
  try {
    const data = await API.get('/exams', {
      course_id: document.getElementById('courseFilter').value,
      exam_type: document.getElementById('typeFilter').value,
    });
    if (!data.length) {
      document.getElementById('examsBody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-file-pen"></i><p>No exams found</p></div></td></tr>`;
      document.getElementById('pgInfo').textContent = ''; document.getElementById('pgBtns').innerHTML = '';
      return;
    }
    Paginator.create({
      data, pageSize: 10, infoId: 'pgInfo', paginationId: 'pgBtns',
      renderFn: rows => {
        document.getElementById('examsBody').innerHTML = rows.map(e => {
          const tc = TYPE_COLORS[e.exam_type] || '#6C63FF';
          return `
          <tr>
            <td style="color:var(--text-muted);">${e.exam_id}</td>
            <td style="font-weight:600;color:var(--text-bright);">${e.exam_name}</td>
            <td><span class="badge-pill badge-complete">${e.course_code||''}</span> ${e.course_name}</td>
            <td><span class="badge-pill" style="background:${tc}22;color:${tc};">${e.exam_type}</span></td>
            <td style="color:var(--text-muted);">${e.exam_date ? e.exam_date.substring(0,10) : '—'}</td>
            <td style="font-weight:700;color:var(--text-bright);">${e.total_marks}</td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost btn-sm btn-icon" onclick="editExam(${e.exam_id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete(${e.exam_id},'${e.exam_name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>`;
        }).join('');
      }
    });
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

function openAdd() {
  document.getElementById('modalTitle').textContent = 'Create Exam';
  document.getElementById('examId').value = '';
  Validator.clear('examForm');
  document.getElementById('f_marks').value = 100;
  Modal.open('examModal');
}

async function editExam(id) {
  try {
    const e = await API.get(`/exams/${id}`);
    document.getElementById('modalTitle').textContent = 'Edit Exam';
    document.getElementById('examId').value  = e.exam_id;
    document.getElementById('f_name').value   = e.exam_name;
    document.getElementById('f_course').value = e.course_id;
    document.getElementById('f_type').value   = e.exam_type;
    document.getElementById('f_date').value   = e.exam_date ? e.exam_date.substring(0,10) : '';
    document.getElementById('f_marks').value  = e.total_marks;
    Modal.open('examModal');
  } catch(e) { Toast.error(e.message); }
}

async function saveExam() {
  if (!Validator.validate('examForm')) return;
  const id = document.getElementById('examId').value;
  const payload = {
    exam_name:   document.getElementById('f_name').value.trim(),
    course_id:   document.getElementById('f_course').value,
    exam_type:   document.getElementById('f_type').value,
    exam_date:   document.getElementById('f_date').value || null,
    total_marks: document.getElementById('f_marks').value || 100,
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    if (id) { await API.put(`/exams/${id}`, payload); Toast.success('Exam updated!'); }
    else    { await API.post('/exams', payload);       Toast.success('Exam created!'); }
    Modal.close('examModal');
    loadExams();
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
    await API.delete(`/exams/${deleteTargetId}`);
    Toast.success('Exam deleted');
    Modal.close('deleteModal');
    loadExams();
  } catch(e) { Toast.error(e.message); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadExams();
  TableSort.init('examsTable');
  document.getElementById('btnAdd').onclick = openAdd;
  document.getElementById('btnSave').onclick = saveExam;
  document.getElementById('btnConfirmDelete').onclick = doDelete;
  document.getElementById('courseFilter').addEventListener('change', loadExams);
  document.getElementById('typeFilter').addEventListener('change', loadExams);
});
