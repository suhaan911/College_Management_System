/* reports.js */
(async function() {
  Chart.defaults.color = '#8888aa';
  Chart.defaults.font.family = 'Inter';
  const COLORS = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];

  // 1. Department-wise student count
  try {
    const data = await API.get('/analytics/dept-count');
    new Chart(document.getElementById('deptChart'), {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.dept_name),
        datasets: [{ data: data.map(d => d.student_count), backgroundColor: COLORS, borderWidth: 2, borderColor: '#1a1a2e' }]
      },
      options: { cutout: '55%', plugins: { legend: { position: 'bottom' } }, responsive: true }
    });
  } catch(e) { console.error(e); }

  // 2. Course-wise enrollment
  try {
    const data = await API.get('/analytics/course-enrollment');
    new Chart(document.getElementById('enrollChart'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.course_code || d.course_name.substring(0,10)),
        datasets: [{ label: 'Enrollments', data: data.map(d => d.enrollment_count), backgroundColor: COLORS, borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, indexAxis: 'y',
        scales: {
          x: { grid: { color:'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { stepSize: 1 } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  } catch(e) { console.error(e); }

  // 3. Grade distribution
  try {
    const data = await API.get('/analytics/grade-distribution');
    const gradeColors = { 'A+':'#10B981','A':'#3B82F6','B':'#6C63FF','C':'#F59E0B','D':'#F97316','F':'#EF4444' };
    new Chart(document.getElementById('gradeChart'), {
      type: 'pie',
      data: {
        labels: data.map(d => `Grade ${d.grade}`),
        datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => gradeColors[d.grade]||'#6C63FF'), borderWidth: 2, borderColor: '#1a1a2e' }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });
  } catch(e) { console.error(e); }

  // 4. Course performance
  try {
    const data = await API.get('/analytics/course-avg-marks');
    new Chart(document.getElementById('performanceChart'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.course_code || d.course_name.substring(0,10)),
        datasets: [
          { label: 'Avg Marks',  data: data.map(d => d.avg_marks), backgroundColor: 'rgba(108,99,255,0.7)', borderRadius: 4 },
          { label: 'Max Marks',  data: data.map(d => d.max_marks), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
          { label: 'Min Marks',  data: data.map(d => d.min_marks), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { grid: { color:'rgba(255,255,255,0.04)' } },
          y: { grid: { color:'rgba(255,255,255,0.04)' }, beginAtZero: true }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  } catch(e) { console.error(e); }

  // 5. Faculty teaching report
  try {
    const data = await API.get('/analytics/faculty-courses');
    document.getElementById('facultyReport').innerHTML = data.map(f => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:30px;height:30px;font-size:12px;">${f.faculty_name.replace(/Prof\.\s*/,'')[0]}</div><span style="font-weight:600;">${f.faculty_name}</span></div></td>
        <td><span class="badge-pill badge-complete">${f.designation||'—'}</span></td>
        <td>${f.dept_name||'—'}</td>
        <td style="font-size:13px;max-width:250px;white-space:normal;">${f.courses_taught||'None assigned'}</td>
        <td style="font-weight:700;color:var(--primary);">${f.course_count}</td>
      </tr>`).join('') || `<tr><td colspan="5"><div class="empty-state"><p>No data</p></div></td></tr>`;
  } catch(e) { console.error(e); }

  // 6. Above average
  try {
    const data = await API.get('/analytics/above-average');
    document.getElementById('aboveAvgReport').innerHTML = data.map((s,i) => {
      const pct = Math.min(100, (s.avg_marks / 100) * 100);
      const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--primary)' : 'var(--warning)';
      return `
      <tr>
        <td style="color:var(--text-muted);">${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:28px;height:28px;font-size:12px;">${s.student_name[0]}</div><span style="font-weight:600;">${s.student_name}</span></div></td>
        <td>${s.dept_name}</td>
        <td style="font-weight:700;color:${color};">${s.avg_marks}</td>
        <td>
          <div class="progress-bar-wrap" style="width:120px;display:inline-block;vertical-align:middle;"><div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div></div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="5"><div class="empty-state"><p>No data</p></div></td></tr>`;
  } catch(e) { console.error(e); }

  // 7. Top scorers
  try {
    const data = await API.get('/analytics/top-scorer');
    document.getElementById('topScorers').innerHTML = data.map((s,i) => `
      <tr>
        <td><span style="font-weight:800;font-size:16px;color:${i===0?'#F59E0B':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--text-muted)'};">${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</span></td>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:30px;height:30px;font-size:12px;">${s.student_name[0]}</div><span style="font-weight:600;">${s.student_name}</span></div></td>
        <td>${s.dept_name}</td>
        <td style="font-weight:700;color:var(--primary);">${s.avg_marks}</td>
        <td style="font-weight:600;color:var(--success);">${s.highest_mark}</td>
        <td>${s.exams_taken}</td>
      </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No data</p></div></td></tr>`;
  } catch(e) { console.error(e); }
})();
