import { API, escapeHtml, getChartInstance, setChartInstance } from './utils.js';

export async function loadChart(subject, period) {
  const s = document.getElementById('chartSubject');
  const p = document.getElementById('chartPeriod');
  const subj = subject || (s ? s.value : 'all');
  const per = period || (p ? p.value : 'month');

  try {
    const res = await fetch(`${API}/grades/progress?subject=${subj}&period=${per}`, {
      credentials: 'same-origin'
    });
    const data = await res.json();

    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const existing = getChartInstance();
    if (existing) existing.destroy();

    if (data.length === 0) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('Нет данных за выбранный период', 20, 50);
      return;
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Средний балл',
          data: data.map(d => d.average),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        scales: {
          y: { min: 2, max: 5, title: { display: true, text: 'Оценка' } },
          x: { title: { display: true, text: 'Дата' } }
        },
        plugins: { legend: { display: false } }
      }
    });
    setChartInstance(chart);
  } catch (err) { console.error(err); }
}

export async function loadSubjectsForChart() {
  try {
    const res = await fetch(`${API}/grades/subjects`, { credentials: 'same-origin' });
    const subjects = await res.json();
    const select = document.getElementById('chartSubject');
    select.innerHTML = '<option value="all">Все предметы</option>' +
      subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  } catch (err) { console.error(err); }
}

export async function loadStats() {
  try {
    const res = await fetch(`${API}/grades`, { credentials: 'same-origin' });
    const grades = await res.json();
    if (grades.length > 0) {
      const avg = (grades.reduce((a, b) => a + b.grade, 0) / grades.length).toFixed(1);
      document.getElementById('homeAvgGrade').textContent = avg;
    }
  } catch (err) { console.error(err); }
}
