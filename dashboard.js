/* dashboard.js */
(async function() {
  // Live clock
  const clockEl = document.getElementById('clockDisplay');
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick(); setInterval(tick, 1000);

  // Chart defaults
  Chart.defaults.color = '#8888aa';
  Chart.defaults.font.family = 'Inter';
  Chart.defaults.plugins.legend.labels.boxWidth = 14;

  const COLORS = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

  async function loadKPIs() {
    try {
      const d = await API.get('/analytics/dashboard');
      const grid = document.getElementById('kpiGrid');
      const cards = [
        { label:'Total Students',   value: d.total_students,   icon:'fa-user-graduate',    accent:'#6C63FF', abg:'rgba(108,99,255,0.15)' },
        { label:'Total Faculty',    value: d.total_faculty,    icon:'fa-person-chalkboard',accent:'#10B981', abg:'rgba(16,185,129,0.15)' },
        { label:'Total Courses',    value: d.total_courses,    icon:'fa-book-open',         accent:'#F59E0B', abg:'rgba(245,158,11,0.15)' },
        { label:'Departments',      value: d.total_depts,      icon:'fa-building-columns',  accent:'#3B82F6', abg:'rgba(59,130,246,0.15)' },
        { label:'Total Enrollments',value: d.total_enrollments,icon:'fa-file-circle-check', accent:'#8B5CF6', abg:'rgba(139,92,246,0.15)' },
        { label:'Average Marks',    value: d.avg_marks ?? 'N/A', icon:'fa-chart-line',      accent:'#EC4899', abg:'rgba(236,72,153,0.15)' },
      ];
      grid.innerHTML = cards.map(c => `
        <div class="kpi-card" style="--card-accent:${c.accent};--card-accent-bg:${c.abg}">
          <div class="kpi-icon"><i class="fa-solid ${c.icon}"></i></div>
          <div class="kpi-info">
            <div class="kpi-label">${c.label}</div>
            <div class="kpi-value">${c.value}</div>
          </div>
        </div>`).join('');
    } catch(e) { Toast.error('Failed to load KPIs: ' + e.message); }
  }

  async function loadDeptChart() {
    try {
      const data = await API.get('/analytics/dept-count');
      new Chart(document.getElementById('deptChart'), {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.dept_name),
          datasets: [{ data: data.map(d => d.student_count), backgroundColor: COLORS, borderWidth: 2, borderColor: '#1a1a2e' }]
        },
        options: { cutout: '60%', plugins: { legend: { position: 'bottom' } }, responsive: true }
      });
    } catch(e) { console.error(e); }
  }

  async function loadEnrollChart() {
    try {
      const data = await API.get('/analytics/course-enrollment');
      const top8 = data.slice(0, 8);
      new Chart(document.getElementById('enrollChart'), {
        type: 'bar',
        data: {
          labels: top8.map(d => d.course_code || d.course_name.substring(0, 12)),
          datasets: [{
            label: 'Enrollments',
            data: top8.map(d => d.enrollment_count),
            backgroundColor: COLORS,
            borderRadius: 6,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888aa' } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888aa', stepSize: 1 }, beginAtZero: true }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch(e) { console.error(e); }
  }

  async function loadGradeChart() {
    try {
      const data = await API.get('/analytics/grade-distribution');
      const gradeColors = { 'A+': '#10B981', 'A': '#3B82F6', 'B': '#6C63FF', 'C': '#F59E0B', 'D': '#F97316', 'F': '#EF4444' };
      new Chart(document.getElementById('gradeChart'), {
        type: 'polarArea',
        data: {
          labels: data.map(d => `Grade ${d.grade}`),
          datasets: [{
            data: data.map(d => d.count),
            backgroundColor: data.map(d => gradeColors[d.grade] || '#6C63FF'),
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    } catch(e) { console.error(e); }
  }

  async function loadMarksChart() {
    try {
      const data = await API.get('/analytics/course-avg-marks');
      const top6 = data.slice(0, 6);
      new Chart(document.getElementById('marksChart'), {
        type: 'line',
        data: {
          labels: top6.map(d => d.course_code || d.course_name.substring(0, 10)),
          datasets: [
            { label: 'Avg Marks', data: top6.map(d => d.avg_marks), borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.15)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#6C63FF' },
            { label: 'Max Marks', data: top6.map(d => d.max_marks),  borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10B981' },
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
          },
          plugins: { legend: { position: 'bottom' } }
        }
      });
    } catch(e) { console.error(e); }
  }

  async function loadTopScorers() {
    try {
      const data = await API.get('/analytics/top-scorer');
      const el = document.getElementById('topScorersBody');
      if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-trophy"></i><p>No data</p></div>'; return; }
      el.innerHTML = data.map((s, i) => `
        <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:28px;height:28px;border-radius:50%;background:${['#F59E0B','#C0C0C0','#CD7F32','#6C63FF','#10B981'][i]};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">${i+1}</div>
          <div class="avatar">${s.student_name[0]}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:var(--text-bright);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.student_name}</div>
            <div style="font-size:12px;color:var(--text-muted);">${s.dept_name}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:800;font-size:16px;color:var(--primary);">${s.avg_marks}</div>
            <div style="font-size:11px;color:var(--text-muted);">avg marks</div>
          </div>
        </div>`).join('');
    } catch(e) { document.getElementById('topScorersBody').innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`; }
  }

  async function loadAboveAvg() {
    try {
      const data = await API.get('/analytics/above-average');
      const el = document.getElementById('aboveAvgBody');
      if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-fire"></i><p>No data</p></div>'; return; }
      const overallAvg = data.reduce((s, d) => s + parseFloat(d.avg_marks), 0) / data.length;
      el.innerHTML = data.slice(0, 8).map(s => {
        const pct = Math.min(100, (s.avg_marks / 100) * 100);
        return `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:13px;font-weight:600;color:var(--text-bright);">${s.student_name}</span>
            <span style="font-size:13px;font-weight:700;color:var(--success);">${s.avg_marks}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;">${s.dept_name}</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>`}).join('');
    } catch(e) { document.getElementById('aboveAvgBody').innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`; }
  }

  // Load all
  loadKPIs();
  loadDeptChart();
  loadEnrollChart();
  loadGradeChart();
  loadMarksChart();
  loadTopScorers();
  loadAboveAvg();
})();
