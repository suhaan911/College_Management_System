/* attendance.js */
async function init() {
  const [courses, students, classes] = await Promise.all([API.get('/courses'), API.get('/students'), API.get('/classes')]);
  [document.getElementById('courseFilter'), document.getElementById('summaryCoursFilter')].forEach(el => {
    courses.forEach(c => el.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`);
  });
  const sS = document.getElementById('f_student');
  students.forEach(s => sS.innerHTML += `<option value="${s.student_id}">${s.student_name}</option>`);
  const cS = document.getElementById('f_class');
  classes.forEach(c => cS.innerHTML += `<option value="${c.class_id}">${c.class_date?c.class_date.substring(0,10):''} – ${c.course_name} (${c.room_no||''})</option>`);
}

async function loadAttendance() {
  showLoading('tableWrapper');
  try {
    const data = await API.get('/attendance', {
      course_id: document.getElementById('courseFilter').value,
      date:      document.getElementById('dateFilter').value,
      status:    document.getElementById('statusFilter').value,
    });
    document.getElementById('presentCount').textContent = data.filter(r=>r.status==='Present').length;
    document.getElementById('absentCount').textContent  = data.filter(r=>r.status==='Absent').length;
    document.getElementById('lateCount').textContent    = data.filter(r=>r.status==='Late').length;

    if (!data.length) {
      document.getElementById('attendBody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-calendar-check"></i><p>No attendance records</p></div></td></tr>`;
      return;
    }
    Paginator.create({
      data, pageSize: 12, infoId: 'pgInfo', paginationId: 'pgBtns',
      renderFn: rows => {
        document.getElementById('attendBody').innerHTML = rows.map(a => {
          const sb = a.status === 'Present' ? 'badge-present' : a.status === 'Absent' ? 'badge-absent' : 'badge-late';
          return `
          <tr>
            <td style="color:var(--text-muted);">${a.attendance_id}</td>
            <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:12px;">${a.student_name[0]}</div><span style="font-weight:600;">${a.student_name}</span></div></td>
            <td style="font-size:13px;">${a.course_name}</td>
            <td style="color:var(--text-muted);">${a.class_date?a.class_date.substring(0,10):'—'}</td>
            <td style="font-size:12px;color:var(--text-muted);">${a.start_time||''}</td>
            <td><span class="badge-pill badge-present" style="font-size:11px;">${a.room_no||'—'}</span></td>
            <td>
              <select class="filter-select" onchange="updateStatus(${a.attendance_id},this.value)" style="padding:4px 8px;font-size:12px;">
                <option ${a.status==='Present'?'selected':''} value="Present">Present</option>
                <option ${a.status==='Absent'?'selected':''} value="Absent">Absent</option>
                <option ${a.status==='Late'?'selected':''} value="Late">Late</option>
              </select>
            </td>
            <td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecord(${a.attendance_id})"><i class="fa-solid fa-trash"></i></button></td>
          </tr>`;
        }).join('');
      }
    });
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

async function loadSummary() {
  try {
    const data = await API.get('/attendance/summary', { course_id: document.getElementById('summaryCoursFilter').value });
    document.getElementById('summaryBody').innerHTML = data.map(s => {
      const pct = s.attendance_pct || 0;
      const color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
      return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:12px;">${s.student_name[0]}</div><span style="font-weight:600;">${s.student_name}</span></div></td>
        <td>${s.total_classes}</td>
        <td>${s.present_count}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-bar-wrap" style="flex:1;"><div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div></div>
            <span style="font-weight:700;color:${color};font-size:13px;">${pct}%</span>
          </div>
        </td>
        <td><span class="badge-pill ${pct>=75?'badge-present':pct>=50?'badge-late':'badge-absent'}">${pct>=75?'Good':pct>=50?'Low':'Critical'}</span></td>
      </tr>`;
    }).join('') || `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-chart-bar"></i><p>No summary data</p></div></td></tr>`;
  } catch(e) { console.error(e); }
}

async function updateStatus(id, status) {
  try { await API.put(`/attendance/${id}`, { status }); Toast.success('Updated'); }
  catch(e) { Toast.error(e.message); loadAttendance(); }
}

async function deleteRecord(id) {
  if (!confirm('Delete this attendance record?')) return;
  try { await API.delete(`/attendance/${id}`); Toast.success('Deleted'); loadAttendance(); }
  catch(e) { Toast.error(e.message); }
}

async function markAttendance() {
  if (!Validator.validate('attendForm')) return;
  const payload = {
    student_id: document.getElementById('f_student').value,
    class_id:   document.getElementById('f_class').value,
    status:     document.getElementById('f_status').value,
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.post('/attendance', payload);
    Toast.success('Attendance marked!');
    Modal.close('attendModal');
    loadAttendance(); loadSummary();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Mark'; }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadAttendance();
  loadSummary();
  TableSort.init('attendTable');
  document.getElementById('btnAdd').onclick = () => { Validator.clear('attendForm'); Modal.open('attendModal'); };
  document.getElementById('btnSave').onclick = markAttendance;
  ['courseFilter','dateFilter','statusFilter'].forEach(id => document.getElementById(id).addEventListener('change', loadAttendance));
  document.getElementById('summaryCoursFilter').addEventListener('change', loadSummary);
});
