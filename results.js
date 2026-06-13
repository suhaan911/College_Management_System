/* results.js */
async function init() {
  const [students, exams, courses] = await Promise.all([
    API.get('/students'), API.get('/exams'), API.get('/courses')
  ]);
  const sF = document.getElementById('studentFilter');
  const sS = document.getElementById('f_student');
  students.forEach(s => {
    sF.innerHTML += `<option value="${s.student_id}">${s.student_name}</option>`;
    sS.innerHTML += `<option value="${s.student_id}">${s.student_name}</option>`;
  });
  const eS = document.getElementById('f_exam');
  exams.forEach(e => eS.innerHTML += `<option value="${e.exam_id}">${e.exam_name} — ${e.course_name} (max: ${e.total_marks})</option>`);
  const cF = document.getElementById('courseFilter');
  courses.forEach(c => cF.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`);
}

async function loadKPIs() {
  try {
    const [dash, highest] = await Promise.all([
      API.get('/analytics/dashboard'),
      API.get('/results/highest')
    ]);
    const topName = highest.length ? highest[0].student_name : '—';
    const topMarks = highest.length ? highest[0].marks_obtained : '—';
    document.getElementById('resultKPI').innerHTML = [
      { label:'Average Marks', value:dash.avg_marks??'—', icon:'fa-chart-line', accent:'#6C63FF', abg:'rgba(108,99,255,0.15)' },
      { label:'Total Results', value: '—', icon:'fa-file-alt', accent:'#10B981', abg:'rgba(16,185,129,0.15)' },
      { label:'Top Scorer', value:topName, icon:'fa-trophy', accent:'#F59E0B', abg:'rgba(245,158,11,0.15)' },
      { label:'Highest Mark', value:topMarks, icon:'fa-star', accent:'#EC4899', abg:'rgba(236,72,153,0.15)' },
    ].map(c => `
      <div class="kpi-card" style="--card-accent:${c.accent};--card-accent-bg:${c.abg}">
        <div class="kpi-icon"><i class="fa-solid ${c.icon}"></i></div>
        <div class="kpi-info"><div class="kpi-label">${c.label}</div><div class="kpi-value" style="font-size:${typeof c.value==='string'&&c.value.length>6?'16px':'28px'}">${c.value}</div></div>
      </div>`).join('');
  } catch(e) { console.error(e); }
}

async function loadHighest() {
  try {
    const data = await API.get('/results/highest');
    document.getElementById('highestBody').innerHTML = data.map((r,i) => `
      <tr>
        <td><span style="font-weight:800;color:${i<3?'#F59E0B':'var(--text-muted)'};">#${i+1}</span></td>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:12px;">${r.student_name[0]}</div><span style="font-weight:600;">${r.student_name}</span></div></td>
        <td>${r.course_name}</td>
        <td>${r.exam_name}</td>
        <td style="font-weight:700;color:var(--primary);">${r.marks_obtained}</td>
        <td style="color:var(--text-muted);">${r.total_marks}</td>
        <td style="font-weight:600;color:var(--success);">${r.percentage}%</td>
        <td>${gradeBadge(r.grade)}</td>
      </tr>`).join('') || `<tr><td colspan="8"><div class="empty-state"><p>No results yet</p></div></td></tr>`;
  } catch(e) { console.error(e); }
}

async function loadResults() {
  showLoading('tableWrapper');
  try {
    const student_id  = document.getElementById('studentFilter').value;
    const course_name = document.getElementById('courseFilter').selectedOptions[0]?.textContent;
    const params = {};
    if (student_id) params.student_id = student_id;
    if (course_name && course_name !== 'All Courses') params.course_name = course_name;

    const data = await API.get('/results', params);
    if (!data.length) {
      document.getElementById('resultsBody').innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-chart-line"></i><p>No results found</p></div></td></tr>`;
      document.getElementById('pgInfo').textContent = ''; document.getElementById('pgBtns').innerHTML = '';
      return;
    }
    // Update total results KPI
    const kpiCards = document.querySelectorAll('#resultKPI .kpi-value');
    if (kpiCards[1]) kpiCards[1].textContent = data.length;

    Paginator.create({
      data, pageSize: 12, infoId: 'pgInfo', paginationId: 'pgBtns',
      renderFn: rows => {
        document.getElementById('resultsBody').innerHTML = rows.map(r => {
          const pctColor = r.percentage >= 80 ? 'var(--success)' : r.percentage >= 50 ? 'var(--primary)' : 'var(--danger)';
          return `
          <tr>
            <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:12px;">${r.student_name[0]}</div><span style="font-weight:600;">${r.student_name}</span></div></td>
            <td style="font-size:13px;">${r.dept_name}</td>
            <td>${r.course_name}</td>
            <td style="font-size:13px;">${r.exam_name}</td>
            <td><span class="badge-pill badge-complete">${r.exam_type}</span></td>
            <td style="font-weight:700;color:var(--text-bright);">${r.marks_obtained}</td>
            <td style="color:var(--text-muted);">${r.total_marks}</td>
            <td style="font-weight:600;color:${pctColor};">${r.percentage}%</td>
            <td>${gradeBadge(r.grade)}</td>
          </tr>`;
        }).join('');
      }
    });
  } catch(e) { Toast.error(e.message); }
  finally { hideLoading('tableWrapper'); }
}

async function saveResult() {
  if (!Validator.validate('resultForm')) return;
  const payload = {
    student_id:     document.getElementById('f_student').value,
    exam_id:        document.getElementById('f_exam').value,
    marks_obtained: document.getElementById('f_marks').value,
    remarks:        document.getElementById('f_remarks').value.trim(),
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    await API.post('/results', payload);
    Toast.success('Result saved! Grade auto-assigned by trigger.');
    Modal.close('resultModal');
    loadResults(); loadHighest(); loadKPIs();
  } catch(e) { Toast.error(e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadKPIs();
  loadHighest();
  loadResults();
  TableSort.init('resultsTable');
  document.getElementById('btnAdd').onclick = () => { Validator.clear('resultForm'); Modal.open('resultModal'); };
  document.getElementById('btnSave').onclick = saveResult;
  document.getElementById('studentFilter').addEventListener('change', loadResults);
  document.getElementById('courseFilter').addEventListener('change', loadResults);
});
