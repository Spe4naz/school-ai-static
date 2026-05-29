(() => {
  var d = window.location.origin + '/api',
    ye = {
      admin: '\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440',
      teacher: '\u0423\u0447\u0438\u0442\u0435\u043B\u044C',
      student: '\u0423\u0447\u0435\u043D\u0438\u043A',
      parent: '\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C',
      head_teacher: '\u0417\u0430\u0432\u0443\u0447',
    };
  function v(t) {
    return ye[t] || t;
  }
  function C(t, e) {
    let n;
    return (...a) => {
      (clearTimeout(n), (n = setTimeout(() => t(...a), e)));
    };
  }
  function u(t, e = 'info', n = 3e3) {
    let a = document.querySelector('.toast-container');
    a || ((a = document.createElement('div')), (a.className = 'toast-container'), document.body.appendChild(a));
    let s = document.createElement('div');
    ((s.className = `toast toast-${e}`),
      (s.textContent = t),
      a.appendChild(s),
      setTimeout(() => {
        ((s.style.opacity = '0'),
          (s.style.transform = 'translateX(100%)'),
          (s.style.transition = '0.3s ease-in'),
          setTimeout(() => s.remove(), 300));
      }, n));
  }
  function k(t) {
    return new Promise((e) => {
      let n = document.createElement('div');
      ((n.className = 'confirm-overlay'),
        (n.innerHTML = `
      <div class="confirm-box">
        <h3>\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435</h3>
        <p>${i(t)}</p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-ghost" data-action="cancel">\u041E\u0442\u043C\u0435\u043D\u0430</button>
          <button class="btn btn-sm" style="background:var(--danger);color:white" data-action="confirm">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C</button>
        </div>
      </div>
    `),
        document.body.appendChild(n),
        n.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          (n.remove(), e(!1));
        }),
        n.querySelector('[data-action="confirm"]').addEventListener('click', () => {
          (n.remove(), e(!0));
        }),
        n.addEventListener('click', (a) => {
          a.target === n && (n.remove(), e(!1));
        }));
    });
  }
  function F() {
    return window._chartInstance;
  }
  function R(t) {
    window._chartInstance = t;
  }
  function M() {
    return window._chatEncryptionKey;
  }
  function N(t) {
    window._chatEncryptionKey = t;
  }
  function B(t, e) {
    window['_refresh_' + t] = e;
  }
  function J() {
    Object.keys(window)
      .filter((e) => e.startsWith('_refresh_') || e === '_chatInterval')
      .forEach((e) => {
        (clearInterval(window[e]), delete window[e]);
      });
  }
  function i(t) {
    return t == null
      ? ''
      : String(t)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
  }
  async function w() {
    try {
      let e = await (await fetch(`${d}/notifications`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('notifList');
      if (e.length === 0) {
        n.innerHTML =
          '<div style="text-align:center; color:#666;">\u041D\u0435\u0442 \u043D\u043E\u0432\u044B\u0445 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439</div>';
        return;
      }
      n.innerHTML = e
        .map(
          (a) => `
      <div style="background:white; padding:15px; border-radius:10px; border-left: 4px solid ${a.is_read ? '#ccc' : 'var(--primary)'}; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between;">
          <strong>${i(a.title)}</strong>
          <small style="color:#666;">${new Date(a.created_at).toLocaleString()}</small>
        </div>
        <p style="margin:5px 0 0;">${i(a.message)}</p>
      </div>
    `,
        )
        .join('');
    } catch (t) {
      console.error(t);
    }
  }
  var L = 0;
  async function z(t) {
    let e = document.getElementById('classFilter');
    if (['teacher', 'admin'].includes(t.role)) {
      e.style.display = 'block';
      let a = await (await fetch(`${d}/classes`, { credentials: 'same-origin' })).json();
      ((e.innerHTML =
        '<option value="">\u0412\u0441\u0435 \u043A\u043B\u0430\u0441\u0441\u044B</option>' +
        a.map((s) => `<option value="${i(s.id)}">${i(s.name)}</option>`).join('')),
        he());
    }
  }
  async function he() {
    try {
      let e = await (await fetch(`${d}/students`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('modalStudentId');
      n.innerHTML =
        '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0430</option>' +
        e.map((a) => `<option value="${i(a.id)}">${i(a.name)}</option>`).join('');
    } catch (t) {
      console.error(
        '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0443\u0447\u0435\u043D\u0438\u043A\u043E\u0432:',
        t,
      );
    }
  }
  function D(t) {
    L += t;
    let e = document.getElementById('classFilter');
    E(e ? e.value : '');
  }
  function K() {
    L = 0;
    let t = document.getElementById('classFilter');
    E(t ? t.value : '');
  }
  async function E(t = '') {
    let e = `${d}/grades?week_offset=${L}`;
    t && (e += `&class_id=${t}`);
    try {
      let a = await (await fetch(e, { credentials: 'same-origin' })).json(),
        s = document.querySelector('#gradesTable tbody');
      ((s.innerHTML = a
        .map(
          (r) => `
      <tr>
        <td>${i(r.subject)}</td>
        <td><span class="grade grade-${r.grade}">${r.grade}</span></td>
        <td>${i(r.student_name)}</td>
        <td>${i(r.comment) || '\u2014'}</td>
        <td>${i(r.date)}</td>
      </tr>`,
        )
        .join('')),
        ve());
    } catch (n) {
      console.error(n);
    }
  }
  function ve() {
    let t = document.getElementById('weekLabel');
    if (!t) return;
    let e = new Date(),
      n = new Date(e);
    n.setDate(n.getDate() + L * 7 - (n.getDay() || 7) + 1);
    let a = new Date(n);
    a.setDate(n.getDate() + 6);
    let s = (r) => r.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    t.textContent = `${s(n)} \u2014 ${s(a)}`;
  }
  async function q(t) {
    t.preventDefault();
    let e = document.getElementById('modalStudentId').value;
    if (!e)
      return u(
        '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0447\u0435\u043D\u0438\u043A\u0430',
        'warning',
      );
    let n = {
      student_id: e,
      subject: document.getElementById('modalSubject').value,
      grade: document.getElementById('modalGrade').value,
      comment: document.getElementById('modalComment').value,
    };
    try {
      let a = await fetch(`${d}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(n),
      });
      if (a.ok) {
        u(
          '\u041E\u0446\u0435\u043D\u043A\u0430 \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0430!',
          'success',
        );
        let s = document.getElementById('gradeModal');
        (s && (s.style.display = 'none'),
          E(),
          w(),
          (document.getElementById('modalStudentId').value = ''),
          (document.getElementById('modalSubject').value = ''),
          (document.getElementById('modalComment').value = ''));
      } else {
        let s = await a.json();
        u(
          s.error ||
            '\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0438 \u043E\u0446\u0435\u043D\u043A\u0438',
          'error',
        );
      }
    } catch {
      u('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438', 'error');
    }
  }
  function G(t) {
    return { Пн: 1, Вт: 2, Ср: 3, Чт: 4, Пт: 5, Сб: 6 }[t] || 0;
  }
  async function b(t = '') {
    let e = JSON.parse(localStorage.getItem('user')),
      n = `${d}/schedule`;
    t && (n += `?class_id=${t}`);
    try {
      let s = await (await fetch(n, { credentials: 'same-origin' })).json(),
        r = {};
      s.forEach((l) => {
        (r[l.day] || (r[l.day] = []), r[l.day].push(l));
      });
      let c = document.getElementById('scheduleContainer'),
        o = Object.keys(r).sort((l, m) => G(l) - G(m));
      (o.length === 0
        ? (c.innerHTML =
            '<div style="text-align:center; color:#666; padding:20px;">\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0443\u0441\u0442\u043E</div>')
        : (c.innerHTML = o
            .map(
              (l) => `
        <div class="schedule-day">
          <h3>${i(l)}</h3>
          <ul>
            ${r[l]
              .map(
                (m) => `
              <li style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <span class="time">${i(m.time_slot)}</span> 
                  <strong>${i(m.subject)}</strong>
                </div>
                <div>
                  <span class="room">${i(m.room) || '\u2014'}</span>
                  ${['teacher', 'admin'].includes(e.role) && (e.role === 'admin' || m.teacher_id === e.id) ? `<button class="schedule-delete-btn" data-id="${m.id}" style="margin-left:10px; padding:2px 8px; font-size:0.7rem; background:#fee2e2; border:none; border-radius:4px; cursor:pointer;">\u2715</button>` : ''}
                </div>
              </li>
            `,
              )
              .join('')}
          </ul>
        </div>
      `,
            )
            .join('')),
        (document.getElementById('homeScheduleCount').textContent = `${s.length} \u0443\u0440\u043E\u043A\u043E\u0432`),
        c.querySelectorAll('.schedule-delete-btn').forEach((l) => {
          l.addEventListener('click', () => we(l.dataset.id));
        }));
    } catch (a) {
      console.error(a);
    }
  }
  async function W() {
    let t = JSON.parse(localStorage.getItem('user')),
      e = document.getElementById('scheduleClassFilter'),
      n = document.getElementById('scheduleClass');
    try {
      let s = await (await fetch(`${d}/classes`, { credentials: 'same-origin' })).json();
      if (
        (e &&
          (e.innerHTML =
            '<option value="">\u0412\u0441\u0435 \u043A\u043B\u0430\u0441\u0441\u044B</option>' +
            s.map((r) => `<option value="${i(r.id)}">${i(r.name)}</option>`).join('')),
        n)
      ) {
        let r = t.class_id;
        n.innerHTML = s
          .map((c) => `<option value="${i(c.id)}" ${c.id === r ? 'selected' : ''}>${i(c.name)}</option>`)
          .join('');
      }
    } catch (a) {
      console.error(a);
    }
  }
  async function V(t) {
    t.preventDefault();
    let e = document.getElementById('scheduleError');
    e.style.display = 'none';
    let n = {
      day: document.getElementById('scheduleDay').value,
      time_slot: document.getElementById('scheduleTime').value,
      subject: document.getElementById('scheduleSubject').value.trim(),
      class_id: document.getElementById('scheduleClass').value,
      room: document.getElementById('scheduleRoom').value.trim() || null,
    };
    if (!n.day || !n.time_slot || !n.subject || !n.class_id) {
      ((e.textContent =
        '\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043B\u044F'),
        (e.style.display = 'block'));
      return;
    }
    try {
      let a = await fetch(`${d}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(n),
        }),
        s = await a.json();
      if (a.ok) {
        u('\u0423\u0440\u043E\u043A \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D!', 'success');
        let r = document.getElementById('scheduleModal');
        r && (r.style.display = 'none');
        let c = document.getElementById('scheduleForm');
        (c && c.reset(), b());
      } else ((e.textContent = s.error || '\u041E\u0448\u0438\u0431\u043A\u0430'), (e.style.display = 'block'));
    } catch {
      ((e.textContent = '\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438'), (e.style.display = 'block'));
    }
  }
  async function we(t) {
    if (await k('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u0443\u0440\u043E\u043A?'))
      try {
        let n = await fetch(`${d}/schedule/${t}`, { method: 'DELETE', credentials: 'same-origin' });
        if (n.ok) b();
        else {
          let a = await n.json();
          u(
            a.error || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F',
            'error',
          );
        }
      } catch {
        u('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438', 'error');
      }
  }
  async function H(t, e) {
    let n = document.getElementById('chartSubject'),
      a = document.getElementById('chartPeriod'),
      s = t || (n ? n.value : 'all'),
      r = e || (a ? a.value : 'month');
    try {
      let o = await (
          await fetch(`${d}/grades/progress?subject=${s}&period=${r}`, { credentials: 'same-origin' })
        ).json(),
        l = document.getElementById('progressChart');
      if (!l) return;
      let m = l.getContext('2d'),
        f = F();
      if ((f && f.destroy(), o.length === 0)) {
        (m.clearRect(0, 0, m.canvas.width, m.canvas.height),
          (m.font = '14px sans-serif'),
          (m.fillStyle = '#666'),
          m.fillText(
            '\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434',
            20,
            50,
          ));
        return;
      }
      let y = new Chart(m, {
        type: 'line',
        data: {
          labels: o.map((h) => h.date),
          datasets: [
            {
              label: '\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B',
              data: o.map((h) => h.average),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              fill: !0,
              tension: 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#2563eb',
            },
          ],
        },
        options: {
          scales: {
            y: { min: 2, max: 5, title: { display: !0, text: '\u041E\u0446\u0435\u043D\u043A\u0430' } },
            x: { title: { display: !0, text: '\u0414\u0430\u0442\u0430' } },
          },
          plugins: { legend: { display: !1 } },
        },
      });
      R(y);
    } catch (c) {
      console.error(c);
    }
  }
  async function X() {
    try {
      let e = await (await fetch(`${d}/grades/subjects`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('chartSubject');
      n.innerHTML =
        '<option value="all">\u0412\u0441\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B</option>' +
        e.map((a) => `<option value="${i(a)}">${i(a)}</option>`).join('');
    } catch (t) {
      console.error(t);
    }
  }
  async function _() {
    try {
      let e = await (await fetch(`${d}/grades`, { credentials: 'same-origin' })).json();
      if (e.length > 0) {
        let n = (e.reduce((a, s) => a + s.grade, 0) / e.length).toFixed(1);
        document.getElementById('homeAvgGrade').textContent = n;
      }
    } catch (t) {
      console.error(t);
    }
  }
  async function Z() {
    let e = await (await fetch(`${d}/classes`, { credentials: 'same-origin' })).json();
    document.getElementById('exportClass').innerHTML =
      '<option value="">\u0412\u0441\u0435 \u043A\u043B\u0430\u0441\u0441\u044B</option>' +
      e.map((n) => `<option value="${i(n.id)}">${i(n.name)}</option>`).join('');
  }
  async function Q(t) {
    t.preventDefault();
    let e = document.getElementById('exportClass').value,
      n = document.getElementById('exportPeriod').value,
      a = document.getElementById('exportType').value,
      s = `${d}/reports/export?type=${a}&period=${n}`;
    e && (s += `&class_id=${e}`);
    try {
      let c = await (await fetch(s, { credentials: 'same-origin' })).blob(),
        o = a === 'pdf' ? 'pdf' : 'xlsx',
        l = document.createElement('a');
      ((l.href = URL.createObjectURL(c)), (l.download = `otchet-${Date.now()}.${o}`), l.click());
      let m = document.getElementById('exportModal');
      (m && (m.style.display = 'none'),
        u('\u041E\u0442\u0447\u0451\u0442 \u0441\u043A\u0430\u0447\u0430\u043D!', 'success'));
    } catch (r) {
      (console.error(r),
        u(
          '\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0435',
          'error',
        ));
    }
  }
  var Ee = [
      '\u{1F600}',
      '\u{1F603}',
      '\u{1F604}',
      '\u{1F601}',
      '\u{1F605}',
      '\u{1F602}',
      '\u{1F923}',
      '\u{1F60A}',
      '\u{1F607}',
      '\u{1F642}',
      '\u{1F609}',
      '\u{1F60C}',
      '\u{1F60D}',
      '\u{1F970}',
      '\u{1F618}',
      '\u{1F617}',
      '\u{1F60B}',
      '\u{1F61B}',
      '\u{1F61C}',
      '\u{1F92A}',
      '\u{1F61D}',
      '\u{1F911}',
      '\u{1F917}',
      '\u{1F92D}',
      '\u{1F92B}',
      '\u{1F914}',
      '\u{1F910}',
      '\u{1F928}',
      '\u{1F610}',
      '\u{1F611}',
      '\u{1F636}',
      '\u{1F60F}',
      '\u{1F612}',
      '\u{1F644}',
      '\u{1F62C}',
      '\u{1F62E}',
      '\u{1F62F}',
      '\u{1F632}',
      '\u{1F633}',
      '\u{1F97A}',
      '\u{1F622}',
      '\u{1F62D}',
      '\u{1F624}',
      '\u{1F620}',
      '\u{1F621}',
      '\u{1F92C}',
      '\u{1F608}',
      '\u{1F47F}',
      '\u{1F480}',
      '\u2620\uFE0F',
      '\u{1F4A9}',
      '\u{1F921}',
      '\u{1F479}',
      '\u{1F47A}',
      '\u{1F47B}',
      '\u{1F47D}',
      '\u{1F47E}',
      '\u{1F916}',
      '\u{1F383}',
      '\u{1F63A}',
      '\u{1F638}',
      '\u{1F639}',
      '\u{1F63B}',
      '\u{1F63C}',
      '\u{1F63D}',
      '\u{1F640}',
      '\u{1F63F}',
      '\u{1F63E}',
      '\u{1F48B}',
      '\u{1F44B}',
      '\u{1F91A}',
      '\u270B',
      '\u{1F590}',
      '\u{1F44C}',
      '\u270C\uFE0F',
      '\u{1F91E}',
      '\u{1F91F}',
      '\u{1F918}',
      '\u{1F919}',
      '\u{1F448}',
      '\u{1F449}',
      '\u{1F446}',
      '\u{1F447}',
      '\u{1F44D}',
      '\u{1F44E}',
      '\u270A',
      '\u{1F44A}',
      '\u{1F91B}',
      '\u{1F91C}',
      '\u{1F44F}',
      '\u{1F64C}',
      '\u{1F450}',
      '\u{1F932}',
      '\u{1F91D}',
      '\u{1F64F}',
      '\u270D\uFE0F',
      '\u{1F4AA}',
      '\u{1F9B5}',
      '\u{1F9B6}',
      '\u{1F442}',
      '\u{1F443}',
      '\u{1F9E0}',
      '\u{1FAC0}',
      '\u{1FAC1}',
      '\u{1F440}',
      '\u{1F441}\uFE0F',
      '\u{1F445}',
      '\u{1F444}',
    ],
    S = !1,
    g = { offset: 0, hasMore: !0, loading: !1, loadingMore: !1, sendLock: !1, typingTimer: null };
  async function te(t, e) {
    let n = new TextEncoder(),
      a = await crypto.subtle.importKey('raw', n.encode(t), { name: 'PBKDF2' }, !1, ['deriveBits', 'deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: n.encode(e), iterations: 1e5, hash: 'SHA-256' },
      a,
      { name: 'AES-GCM', length: 256 },
      !1,
      ['encrypt', 'decrypt'],
    );
  }
  async function be(t, e) {
    let n = new TextEncoder(),
      a = crypto.getRandomValues(new Uint8Array(12)),
      s = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: a }, e, n.encode(t)),
      r = Array.from(a),
      c = Array.from(new Uint8Array(s));
    return btoa(
      r
        .concat(c)
        .map((o) => String.fromCharCode(o))
        .join(''),
    );
  }
  async function Ie(t, e) {
    let n = atob(t),
      a = new Uint8Array(n.length);
    for (let o = 0; o < n.length; o++) a[o] = n.charCodeAt(o);
    let s = a.slice(0, 12),
      r = a.slice(12),
      c = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: s }, e, r);
    return new TextDecoder().decode(c);
  }
  async function xe(t, e) {
    if (!e || !t || !/^[A-Za-z0-9+/=]+$/.test(t)) return t;
    try {
      let n = await te(e, 'class-chat-salt');
      return await Ie(t, n);
    } catch {
      return t;
    }
  }
  function $e() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((t) => t.toString(16).padStart(2, '0'))
      .join('');
  }
  async function ne() {
    let t = M();
    if (t) return t;
    let e;
    try {
      e = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      e = {};
    }
    if (!e.class_id) return null;
    let n = `chatKey_${e.class_id}`,
      a = sessionStorage.getItem(n);
    if (!a)
      try {
        ((a = (await (await fetch(`${d}/chat/key`, { credentials: 'same-origin' })).json()).key),
          sessionStorage.setItem(n, a));
      } catch {
        ((a = $e()), sessionStorage.setItem(n, a));
      }
    return (N(a), a);
  }
  function ke(t) {
    return new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  function Be(t) {
    let e = new Date(t),
      n = new Date(),
      a = new Date(n);
    return (
      a.setDate(a.getDate() - 1),
      e.toDateString() === n.toDateString()
        ? '\u0421\u0435\u0433\u043E\u0434\u043D\u044F'
        : e.toDateString() === a.toDateString()
          ? '\u0412\u0447\u0435\u0440\u0430'
          : e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    );
  }
  function P() {
    let t = document.getElementById('emojiPicker');
    ((S = !S),
      t.classList.toggle('open', S),
      S &&
        ((t.innerHTML =
          '<div class="emoji-grid">' +
          Ee.map((e) => `<span class="emoji-item" data-emoji="${e}">${e}</span>`).join('') +
          '</div>'),
        t.querySelectorAll('.emoji-item').forEach((e) => {
          e.addEventListener('click', () => {
            ((document.getElementById('chatInput').value += e.dataset.emoji),
              document.getElementById('chatInput').focus(),
              P());
          });
        })));
  }
  function Le(t) {
    return t.scrollHeight - t.scrollTop - t.clientHeight < 100;
  }
  function ae(t, e) {
    t.scrollTo({ top: t.scrollHeight, behavior: e ? 'smooth' : 'auto' });
  }
  async function I() {
    if (!g.loading) {
      g.loading = !0;
      try {
        await ne();
        let t = new AbortController(),
          e = setTimeout(() => t.abort(), 8e3),
          n = await fetch(`${d}/chat/messages?offset=0&limit=50`, { credentials: 'same-origin', signal: t.signal });
        if ((clearTimeout(e), !n.ok)) {
          A('offline');
          return;
        }
        let a = await n.json(),
          s = JSON.parse(localStorage.getItem('user') || '{}'),
          r = document.getElementById('chatMessages'),
          c = Le(r);
        (await je(r, a.messages, s),
          (g.hasMore = a.messages.length >= 50),
          (g.offset = 0),
          (c || a.messages.length <= 1) && ae(r, !1),
          A('online'));
      } catch {
        A('offline');
      } finally {
        g.loading = !1;
      }
    }
  }
  async function Se() {
    if (g.loadingMore || !g.hasMore) return;
    g.loadingMore = !0;
    let t = g.offset + 50;
    try {
      let n = await (await fetch(`${d}/chat/messages?offset=${t}&limit=50`, { credentials: 'same-origin' })).json(),
        a = JSON.parse(localStorage.getItem('user') || '{}'),
        s = document.getElementById('chatMessages'),
        r = s.scrollHeight;
      if ((s.querySelector('.msg-loader-more')?.remove(), n.messages.length === 0)) {
        g.hasMore = !1;
        return;
      }
      let c = s.querySelector('[data-msg-id]'),
        o = c ? parseInt(c.dataset.msgId, 10) : 1 / 0,
        l = n.messages.filter((m) => m.id < o);
      if (l.length > 0) {
        let m = await se(l, a);
        s.insertAdjacentHTML('afterbegin', m);
      }
      ((g.hasMore = n.messages.length >= 50),
        (g.offset = t),
        g.hasMore &&
          s.insertAdjacentHTML(
            'afterbegin',
            '<div class="msg-loader-more">\u2195 \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451</div>',
          ),
        (s.scrollTop = s.scrollHeight - r));
    } catch {
    } finally {
      g.loadingMore = !1;
    }
  }
  async function se(t, e) {
    let n = M(),
      a = await Promise.all(t.map((c) => xe(c.content, n))),
      s = '',
      r = '';
    return (
      t.forEach((c, o) => {
        let l = new Date(c.created_at).toDateString();
        l !== r && ((s += `<div class="msg-date-divider">${Be(c.created_at)}</div>`), (r = l));
        let m = c.user_id === e.id,
          f = a[o],
          y = c.image_url
            ? `<img src="${i(c.image_url)}" class="msg-image" onclick="window.open(this.src)" loading="lazy" />`
            : '',
          h = m
            ? `<button class="msg-delete" data-action="deleteMessage" data-msg-id="${c.id}" title="\u0423\u0434\u0430\u043B\u0438\u0442\u044C">\u2715</button>`
            : '';
        s += `<div class="msg ${m ? 'user' : 'ai'}" data-msg-id="${c.id}">
      ${m ? '' : `<div class="msg-author">${i(c.user_name)}</div>`}
      ${h}
      <div class="msg-content">${i(f)}</div>
      ${y}
      <div class="msg-time">${ke(c.created_at)}</div>
    </div>`;
      }),
      s
    );
  }
  async function je(t, e, n) {
    let a = await se(e, n);
    t.innerHTML =
      a ||
      '<div style="text-align:center;padding:40px;color:var(--text-sec)">\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u043E\u0431\u0449\u0435\u043D\u0438\u0435!</div>';
  }
  async function Te(t) {
    try {
      if ((await fetch(`${d}/chat/messages/${t}`, { method: 'DELETE', credentials: 'same-origin' })).ok) {
        let n = document.querySelector(`.msg[data-msg-id="${t}"]`);
        n && n.remove();
      }
    } catch {}
  }
  async function Y() {
    if (g.sendLock) return;
    let t = document.getElementById('chatInput'),
      e = t.value.trim();
    if (!e) return;
    g.sendLock = !0;
    let n = await ne(),
      a = e;
    if (n)
      try {
        let s = await te(n, 'class-chat-salt');
        a = await be(e, s);
      } catch {}
    try {
      (
        await fetch(`${d}/chat/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ content: a }),
        })
      ).ok && ((t.value = ''), await I());
    } catch {
    } finally {
      g.sendLock = !1;
    }
  }
  async function oe(t) {
    let e = new FormData();
    e.append('image', t);
    try {
      (await fetch(`${d}/chat/upload`, { method: 'POST', credentials: 'same-origin', body: e })).ok && (await I());
    } catch {}
  }
  async function ee() {
    try {
      let [t, e] = await Promise.all([
          fetch(`${d}/chat/participants`, { credentials: 'same-origin' }),
          fetch(`${d}/chat/typing`, { credentials: 'same-origin' })
            .then((s) => s.json())
            .catch(() => []),
        ]),
        n = await t.json(),
        a = e.map((s) => s.user_id);
      document.getElementById('participantsList').innerHTML = n
        .map(
          (s) => `<div class="participant-item">
        <span class="participant-dot ${a.includes(s.id) ? 'online' : 'offline'}"></span>
        <span class="participant-name">${i(s.name)}</span>
        <span class="participant-role">${i(s.role === 'student' ? '\u0443\u0447' : s.role === 'teacher' ? '\u0443\u0447-\u043B\u044C' : s.role === 'admin' ? '\u0430\u0434\u043C' : '\u0440\u043E\u0434')}</span>
      </div>`,
        )
        .join('');
    } catch {}
  }
  function Ce() {
    fetch(`${d}/chat/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    }).catch(() => {});
  }
  async function Me() {
    try {
      let t = await fetch(`${d}/chat/typing`, { credentials: 'same-origin' }).then((a) => a.json()),
        e = document.getElementById('typingIndicator'),
        n = document.getElementById('typingNames');
      t.length > 0
        ? ((n.innerHTML = `${i(t.map((a) => a.name).join(', '))} \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442<span class="dots"></span>`),
          (e.style.display = 'block'))
        : (e.style.display = 'none');
    } catch {}
  }
  function A(t) {
    let e = document.getElementById('chatStatus');
    e &&
      (e.innerHTML =
        t === 'online'
          ? '<span class="status-dot"></span> \u0412 \u0441\u0435\u0442\u0438'
          : '<span class="status-dot offline"></span> \u041D\u0435\u0442 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F');
  }
  function U() {
    try {
      let t = JSON.parse(localStorage.getItem('user') || '{}');
      if (!['student', 'parent'].includes(t.role)) return;
      (I(),
        ee(),
        setInterval(async () => {
          document.getElementById('chat')?.classList.contains('active') && (await I(), ee());
        }, 5e3),
        setInterval(Me, 3e3));
      let e = document.getElementById('chatInput');
      (e &&
        e.addEventListener(
          'input',
          C(() => {
            e.value.trim() && Ce();
          }, 500),
        ),
        document.getElementById('sendBtn')?.addEventListener('click', Y));
      let n = document.getElementById('chatInput');
      n &&
        n.addEventListener('keypress', (s) => {
          s.key === 'Enter' && Y();
        });
      let a = document.getElementById('chatMessages');
      (a &&
        (a.addEventListener(
          'scroll',
          C(() => {
            a.scrollTop < 50 && g.hasMore && !g.loadingMore && Se();
          }, 200),
        ),
        a.addEventListener('click', (s) => {
          let r = s.target.closest('[data-action="deleteMessage"]');
          r && Te(r.dataset.msgId);
        })),
        document.querySelector('[data-action="chatRefresh"]')?.addEventListener('click', I),
        setTimeout(() => ae(document.getElementById('chatMessages'), !0), 300));
    } catch {}
  }
  async function re() {
    let t = document.getElementById('profileContainer'),
      e = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      let [n, a] = await Promise.all([
          fetch(`${d}/profile`, { credentials: 'same-origin' }),
          fetch(`${d}/grades`, { credentials: 'same-origin' }),
        ]),
        s = await n.json(),
        r = await a.json(),
        c = {},
        o = {},
        l = 0,
        m = 0;
      r.forEach((p) => {
        (c[p.subject] || ((c[p.subject] = 0), (o[p.subject] = 0)),
          (c[p.subject] += p.grade),
          o[p.subject]++,
          (l += p.grade),
          m++);
      });
      let f = m > 0 ? (l / m).toFixed(1) : '\u2014',
        y = Object.keys(c)
          .map((p) => ({
            name: p,
            avg: (c[p] / o[p]).toFixed(1),
            count: o[p],
            pct: (((c[p] / o[p] - 2) / 3) * 100).toFixed(0),
          }))
          .sort((p, fe) => fe.avg - p.avg),
        h = y.length > 0 ? y[0].name : '\u2014',
        ge = (e.name || '')
          .split(' ')
          .map((p) => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      t.innerHTML = `
      <div class="profile-header-card">
        <div class="profile-avatar-lg">${i(ge)}</div>
        <div class="profile-info">
          <h2>${i(e.name)}</h2>
          <p>${i(v(e.role))}${s.class_name ? ` \xB7 ${i(s.class_name)}` : ''}</p>
          <p style="font-size:0.85rem; margin-top:6px; opacity:0.7">${i(s.email)}</p>
        </div>
      </div>
      <div class="profile-grid">
        <div class="profile-card">
          <h3>\u{1F4CA} \u041E\u0431\u0449\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430</h3>
          <div class="profile-stat"><span class="profile-stat-label">\u0412\u0441\u0435\u0433\u043E \u043E\u0446\u0435\u043D\u043E\u043A</span><span class="profile-stat-value">${m}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B</span><span class="profile-stat-value" style="color: ${f >= 4 ? 'var(--success)' : f >= 3 ? 'var(--warning)' : 'var(--danger)'}">${f}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">\u041B\u0443\u0447\u0448\u0438\u0439 \u043F\u0440\u0435\u0434\u043C\u0435\u0442</span><span class="profile-stat-value">${i(h)}</span></div>
          <div class="profile-stat"><span class="profile-stat-label">\u041F\u0440\u0435\u0434\u043C\u0435\u0442\u043E\u0432</span><span class="profile-stat-value">${y.length}</span></div>
        </div>
        <div class="profile-card">
          <h3>\u{1F464} \u0410\u043A\u043A\u0430\u0443\u043D\u0442</h3>
          <div class="profile-stat"><span class="profile-stat-label">\u0420\u043E\u043B\u044C</span><span class="profile-stat-value"><span class="role-badge role-${i(e.role)}">${i(v(e.role))}</span></span></div>
          <div class="profile-stat"><span class="profile-stat-label">Email</span><span class="profile-stat-value" style="font-size:0.85rem">${i(s.email)}</span></div>
          ${s.class_name ? `<div class="profile-stat"><span class="profile-stat-label">\u041A\u043B\u0430\u0441\u0441</span><span class="profile-stat-value">${i(s.class_name)}</span></div>` : ''}
        </div>
        <div class="profile-card full">
          <h3>\u{1F4C8} \u0423\u0441\u043F\u0435\u0432\u0430\u0435\u043C\u043E\u0441\u0442\u044C \u043F\u043E \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u0430\u043C</h3>
          ${
            y.length > 0
              ? y
                  .map(
                    (p) => `
            <div class="subject-progress">
              <div class="subject-progress-header">
                <span>${i(p.name)}</span>
                <span>${p.avg} (${p.count} \u043E\u0446\u0435\u043D\u043E\u043A)</span>
              </div>
              <div class="subject-progress-bar">
                <div class="subject-progress-fill" style="width:${Math.min(100, p.pct)}%"></div>
              </div>
            </div>
          `,
                  )
                  .join('')
              : '<p style="color:var(--text-sec); text-align:center; padding:20px;">\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u0431 \u043E\u0446\u0435\u043D\u043A\u0430\u0445</p>'
          }
        </div>
      </div>
    `;
    } catch (n) {
      ((t.innerHTML =
        '<div style="text-align:center; padding:40px; color:var(--danger)">\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F</div>'),
        console.error(n));
    }
  }
  async function x() {
    let t = document.getElementById('userRoleFilter').value,
      e = `${d}/admin/users`;
    t && (e += `?role=${t}`);
    try {
      let a = await (await fetch(e, { credentials: 'same-origin' })).json(),
        s = document.querySelector('#usersTable tbody'),
        r = await fetch(`${d}/classes`, { credentials: 'same-origin' }).then((o) => o.json()),
        c = {};
      (r.forEach((o) => (c[o.id] = o.name)),
        (s.innerHTML = a
          .map(
            (o) => `
      <tr>
        <td>${i(o.name)}</td>
        <td>${i(o.email)}</td>
        <td><span class="role-badge role-${i(o.role)}">${i(v(o.role))}</span></td>
        <td>${o.class_id ? i(c[o.class_id]) || i(o.class_id) : '\u2014'}</td>
        <td>
          ${o.role !== 'admin' || a.filter((l) => l.role === 'admin').length > 1 ? `<button class="btn" style="padding:5px 10px; font-size:0.8rem; background:#ef4444;" data-action="deleteUser" data-id="${i(o.id)}">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>` : '<span style="color:#999; font-size:0.8rem;">\u041D\u0435\u043B\u044C\u0437\u044F</span>'}
        </td>
      </tr>
    `,
          )
          .join('')),
        s.querySelectorAll('[data-action="deleteUser"]').forEach((o) => {
          o.addEventListener('click', () => De(o.dataset.id));
        }));
    } catch (n) {
      console.error(n);
    }
  }
  async function ie() {
    let e = await (await fetch(`${d}/classes`, { credentials: 'same-origin' })).json();
    document.getElementById('newUserClass').innerHTML =
      '<option value="">\u0411\u0435\u0437 \u043A\u043B\u0430\u0441\u0441\u0430</option>' +
      e.map((s) => `<option value="${i(s.id)}">${i(s.name)}</option>`).join('');
    let n = JSON.parse(localStorage.getItem('user') || '{}'),
      a = document.getElementById('newUserRole');
    a &&
      n.role === 'teacher' &&
      (a.innerHTML =
        '<option value="student">\u0423\u0447\u0435\u043D\u0438\u043A</option><option value="parent">\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u044C</option>');
  }
  function ce() {
    let t = document.getElementById('newUserRole').value,
      e = document.getElementById('newUserClassWrapper');
    e.style.display = ['student', 'parent'].includes(t) ? 'block' : 'none';
  }
  async function le(t) {
    t.preventDefault();
    let e = document.getElementById('userError');
    e.style.display = 'none';
    let n = {
      name: document.getElementById('newUserName').value.trim(),
      email: document.getElementById('newUserEmail').value.trim(),
      password: document.getElementById('newUserPassword').value,
      role: document.getElementById('newUserRole').value,
      class_id: ['student', 'parent'].includes(document.getElementById('newUserRole').value)
        ? document.getElementById('newUserClass').value
        : null,
    };
    if (!n.name || n.name.length < 2) {
      ((e.textContent =
        '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F'),
        (e.style.display = 'block'));
      return;
    }
    try {
      let a = await fetch(`${d}/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(n),
        }),
        s = await a.json();
      if (a.ok) {
        u(
          '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043E\u0437\u0434\u0430\u043D',
          'success',
        );
        let r = document.getElementById('userModal');
        r && (r.style.display = 'none');
        let c = document.getElementById('userForm');
        (c && c.reset(), x());
      } else ((e.textContent = s.error || '\u041E\u0448\u0438\u0431\u043A\u0430'), (e.style.display = 'block'));
    } catch {
      ((e.textContent = '\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438'), (e.style.display = 'block'));
    }
  }
  async function De(t) {
    if (
      await k(
        '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?',
      )
    )
      try {
        let n = await fetch(`${d}/admin/users/${t}`, { method: 'DELETE', credentials: 'same-origin' });
        if (n.ok)
          (u(
            '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0443\u0434\u0430\u043B\u0451\u043D',
            'success',
          ),
            x());
        else {
          let a = await n.json();
          u(
            a.error || '\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F',
            'error',
          );
        }
      } catch {
        u('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438', 'error');
      }
  }
  async function j() {
    try {
      let e = await (await fetch(`${d}/homework`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('homeworkList');
      if (!n) return;
      if (e.length === 0) {
        n.innerHTML =
          '<div style="padding:20px;text-align:center;color:var(--text-sec)">\u0414\u043E\u043C\u0430\u0448\u043D\u0438\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</div>';
        return;
      }
      let a = JSON.parse(localStorage.getItem('user') || '{}'),
        s = ['teacher', 'admin'].includes(a.role);
      n.innerHTML = e
        .map((r) => {
          let c = new Date(r.due_date),
            o = c < new Date() && !c.toDateString().includes(new Date().toDateString()),
            l = Math.ceil((c - new Date()) / (1e3 * 60 * 60 * 24)),
            m = o
              ? '\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E'
              : l <= 1
                ? '\u041D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F'
                : `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${l} \u0434\u043D.`,
            f = s
              ? `<button class="btn btn-sm btn-danger" data-action="deleteHomework" data-id="${r.id}" style="margin-left:auto">\u2715</button>`
              : '';
          return `<div class="hw-item" style="background:var(--bg-card);border-radius:var(--radius-sm);padding:14px;border:1px solid var(--border);border-left:4px solid ${o ? 'var(--danger)' : 'var(--primary)'}">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-weight:600">${i(r.title)}</div>
            <div style="font-size:0.85rem;color:var(--text-sec);margin-top:4px">${i(r.subject)} \u2022 ${i(r.teacher_name)}</div>
            ${r.description ? `<div style="font-size:0.9rem;margin-top:6px;color:var(--text-main)">${i(r.description)}</div>` : ''}
          </div>
          ${f}
        </div>
        <div style="margin-top:8px;font-size:0.8rem;color:${o ? 'var(--danger)' : 'var(--text-sec)'};font-weight:500">${i(m)} \u2022 ${i(r.due_date)}</div>
      </div>`;
        })
        .join('');
    } catch {}
  }
  async function de(t) {
    t.preventDefault();
    let e = document.getElementById('hwSubject').value,
      n = document.getElementById('hwTitle').value.trim(),
      a = document.getElementById('hwDesc').value.trim(),
      s = document.getElementById('hwDueDate').value;
    if (!e || !n || !s)
      return u(
        '\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F',
        'warning',
      );
    try {
      let r = await fetch(`${d}/homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subject: e, title: n, description: a, due_date: s }),
      });
      if (r.ok)
        ((document.getElementById('hwModal').style.display = 'none'), document.getElementById('hwForm').reset(), j());
      else {
        let c = await r.json();
        u(c.error || '\u041E\u0448\u0438\u0431\u043A\u0430', 'error');
      }
    } catch {
      u('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438', 'error');
    }
  }
  async function $() {
    try {
      let e = await (await fetch(`${d}/announcements`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('announcementList');
      if (!n) return;
      if (e.length === 0) {
        n.innerHTML =
          '<div style="padding:16px;text-align:center;color:var(--text-sec)">\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</div>';
        return;
      }
      let s = JSON.parse(localStorage.getItem('user') || '{}').role === 'admin';
      n.innerHTML = e
        .map((r) => {
          let c = s
            ? `<button class="btn btn-sm btn-danger" data-action="deleteAnnouncement" data-id="${r.id}" style="margin-left:auto">\u2715</button>`
            : '';
          return `<div class="announcement-item" style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;border:1px solid var(--border);border-left:4px solid var(--warning)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:1rem">${i(r.title)}</div>
            <div style="font-size:0.8rem;color:var(--text-sec);margin-top:2px">${i(r.user_name)} \u2022 ${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
            <div style="margin-top:8px;font-size:0.92rem;line-height:1.5">${i(r.content)}</div>
          </div>
          ${c}
        </div>
      </div>`;
        })
        .join('');
    } catch {}
  }
  async function me(t) {
    t.preventDefault();
    let e = document.getElementById('annTitle').value.trim(),
      n = document.getElementById('annContent').value.trim();
    if (!e || !n)
      return u(
        '\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F',
        'warning',
      );
    try {
      let a = await fetch(`${d}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title: e, content: n }),
      });
      if (a.ok)
        ((document.getElementById('annModal').style.display = 'none'), document.getElementById('annForm').reset(), $());
      else {
        let s = await a.json();
        u(s.error || '\u041E\u0448\u0438\u0431\u043A\u0430', 'error');
      }
    } catch {
      u('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438', 'error');
    }
  }
  async function O() {
    try {
      let e = await (await fetch(`${d}/logs`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('logsBody');
      n.innerHTML = e
        .map(
          (a) => `
      <tr>
        <td style="white-space:nowrap;font-size:0.85rem">${new Date(a.timestamp).toLocaleString('ru-RU')}</td>
        <td>${i(a.user_name || '\u2014')}</td>
        <td><span style="background:var(--primary-light);padding:2px 8px;border-radius:4px;font-size:0.85rem">${i(a.action)}</span></td>
        <td style="font-size:0.9rem;color:var(--text-sec)">${i(a.details || '')}</td>
      </tr>
    `,
        )
        .join('');
    } catch {}
  }
  function He(t) {
    let e = document.getElementById('navMenu'),
      n = {
        admin: [
          ['\u{1F3E0} \u0413\u043B\u0430\u0432\u043D\u0430\u044F', 'home'],
          ['\u{1F4D3} \u0414\u043D\u0435\u0432\u043D\u0438\u043A', 'diary'],
          ['\u{1F4CB} \u0417\u0430\u0434\u0430\u043D\u0438\u044F', 'homework'],
          ['\u{1F464} \u041F\u0440\u043E\u0444\u0438\u043B\u044C', 'profile'],
          ['\u{1F4C5} \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435', 'schedule'],
          ['\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438', 'users'],
          ['\u{1F4CB} \u041B\u043E\u0433\u0438', 'logs'],
          ['\u{1F514} \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F', 'notifications'],
        ],
        teacher: [
          ['\u{1F3E0} \u0413\u043B\u0430\u0432\u043D\u0430\u044F', 'home'],
          ['\u{1F4D3} \u0414\u043D\u0435\u0432\u043D\u0438\u043A', 'diary'],
          ['\u{1F4CB} \u0417\u0430\u0434\u0430\u043D\u0438\u044F', 'homework'],
          ['\u{1F464} \u041F\u0440\u043E\u0444\u0438\u043B\u044C', 'profile'],
          ['\u{1F4C5} \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435', 'schedule'],
          ['\u{1F465} \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438', 'users'],
        ],
        student: [
          ['\u{1F3E0} \u0413\u043B\u0430\u0432\u043D\u0430\u044F', 'home'],
          ['\u{1F4D3} \u0414\u043D\u0435\u0432\u043D\u0438\u043A', 'diary'],
          ['\u{1F4CB} \u0417\u0430\u0434\u0430\u043D\u0438\u044F', 'homework'],
          ['\u{1F464} \u041F\u0440\u043E\u0444\u0438\u043B\u044C', 'profile'],
          ['\u{1F4C8} \u0413\u0440\u0430\u0444\u0438\u043A\u0438', 'charts'],
          ['\u{1F4C5} \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435', 'schedule'],
          ['\u{1F4AC} \u0427\u0430\u0442', 'chat'],
          ['\u{1F514} \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F', 'notifications'],
        ],
        parent: [
          ['\u{1F3E0} \u0413\u043B\u0430\u0432\u043D\u0430\u044F', 'home'],
          ['\u{1F4D3} \u0414\u043D\u0435\u0432\u043D\u0438\u043A', 'diary'],
          ['\u{1F4CB} \u0417\u0430\u0434\u0430\u043D\u0438\u044F', 'homework'],
          ['\u{1F464} \u041F\u0440\u043E\u0444\u0438\u043B\u044C', 'profile'],
          ['\u{1F4C8} \u0413\u0440\u0430\u0444\u0438\u043A\u0438', 'charts'],
          ['\u{1F4C5} \u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435', 'schedule'],
          ['\u{1F4AC} \u0427\u0430\u0442', 'chat'],
          ['\u{1F514} \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F', 'notifications'],
        ],
      };
    ((e.innerHTML = (n[t.role] || n.student)
      .map(
        ([s, r]) =>
          `<div class="nav-link" data-page="${r}"><span>${s}</span><span class="nav-badge" id="badge-${r}" style="display:none; margin-left:auto; background:var(--danger); color:white; font-size:0.7rem; padding:2px 8px; border-radius:10px; font-weight:600;"></span></div>`,
      )
      .join('')),
      e.querySelectorAll('.nav-link').forEach((s) => {
        s.addEventListener('click', () => _e(s.dataset.page));
      }));
    let a = document.getElementById('sidebarUser');
    if (a) {
      let s = (t.name || '')
        .split(' ')
        .map((r) => r[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      a.innerHTML = `
      <div class="sidebar-avatar">${i(s)}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${i(t.name)}</div>
        <div class="sidebar-user-role">${i(v(t.role))}</div>
      </div>`;
    }
  }
  function ue(t) {
    ($(), _(), b(), T());
  }
  function _e(t) {
    document.querySelectorAll('.page').forEach((n) => n.classList.remove('active'));
    let e = document.getElementById(t);
    (e && e.classList.add('active'),
      t === 'home' && ue(),
      t === 'profile' && re(),
      t === 'notifications' && w(),
      t === 'homework' && j(),
      t === 'grades' && (E(), X()),
      t === 'logs' && O(),
      t === 'chat' && U());
  }
  function Ae() {
    (J(), localStorage.removeItem('user'));
    let t = [];
    for (let e = 0; e < sessionStorage.length; e++) {
      let n = sessionStorage.key(e);
      n.startsWith('chatKey_') && t.push(n);
    }
    (t.forEach((e) => sessionStorage.removeItem(e)),
      fetch(`${d}/logout`, { method: 'POST', credentials: 'same-origin' }).finally(() => {
        location.href = '/';
      }));
  }
  async function T() {
    try {
      let e = await (await fetch(`${d}/notifications/unread-count`, { credentials: 'same-origin' })).json(),
        n = document.getElementById('badge-notifications');
      n &&
        (e.unread > 0
          ? ((n.textContent = e.unread > 99 ? '99+' : e.unread), (n.style.display = 'inline'))
          : (n.style.display = 'none'));
    } catch {}
  }
  function pe() {
    let t = JSON.parse(localStorage.getItem('user') || '{}');
    if (!t.id) {
      location.pathname === '/dashboard.html' && (location.href = '/');
      return;
    }
    (He(t),
      z(t),
      ue(t),
      ['teacher', 'admin'].includes(t.role) &&
        ((document.getElementById('addGradeBtn').style.display = 'block'),
        (document.getElementById('addScheduleBtn').style.display = 'block'),
        (document.getElementById('exportBtn').style.display = 'block'),
        (document.getElementById('addHwBtn').style.display = 'block'),
        Z(),
        W()),
      ['teacher', 'admin'].includes(t.role) && (document.getElementById('addAnnBtn').style.display = 'block'),
      ['admin', 'teacher'].includes(t.role) && (x(), ie()),
      ['student', 'parent'].includes(t.role) && (H(), U()),
      setInterval(T, 15e3));
    let e = null;
    function n() {
      if (typeof EventSource > 'u') return;
      let o = new EventSource(`${d}/notifications/stream`);
      ((o.onmessage = (l) => {
        try {
          JSON.parse(l.data).type === 'notification' &&
            (T(), document.getElementById('notifications')?.classList.contains('active') && w());
        } catch {}
      }),
        (o.onerror = () => {
          (o.close(), e && clearTimeout(e), (e = setTimeout(n, 5e3)));
        }));
    }
    (n(),
      B(
        'notif',
        setInterval(() => {
          document.getElementById('notifications')?.classList.contains('active') && w();
        }, 3e4),
      ),
      B(
        'stats',
        setInterval(() => {
          document.getElementById('home')?.classList.contains('active') && (_(), b(), $());
        }, 3e4),
      ),
      B(
        'grades',
        setInterval(() => {
          document.getElementById('diary')?.classList.contains('active') && E();
        }, 3e4),
      ),
      document.getElementById('weekPrev')?.addEventListener('click', () => D(-1)),
      document.getElementById('weekNext')?.addEventListener('click', () => D(1)),
      document.getElementById('weekToday')?.addEventListener('click', () => K()),
      document.querySelectorAll('[data-action]').forEach((o) => {
        let l = o.dataset.action;
        l === 'logout'
          ? o.addEventListener('click', Ae)
          : l === 'openModal'
            ? o.addEventListener('click', () => {
                let m = document.getElementById(o.dataset.modal);
                m && (m.style.display = 'flex');
              })
            : l === 'closeModal'
              ? o.addEventListener('click', () => {
                  let m = document.getElementById(o.dataset.modal);
                  m && (m.style.display = 'none');
                })
              : l === 'filterGrades'
                ? o.addEventListener('change', () => E(o.value))
                : l === 'filterSchedule'
                  ? o.addEventListener('change', () => b(o.value))
                  : l === 'filterUsers'
                    ? o.addEventListener('change', x)
                    : l === 'loadChart'
                      ? o.addEventListener('change', H)
                      : l === 'exportReport'
                        ? o.addEventListener('submit', Q)
                        : l === 'submitGrade'
                          ? o.addEventListener('submit', q)
                          : l === 'createUser'
                            ? o.addEventListener('submit', le)
                            : l === 'createSchedule'
                              ? o.addEventListener('submit', V)
                              : l === 'toggleUserClass' && o.addEventListener('change', ce);
      }),
      document.getElementById('hwForm')?.addEventListener('submit', de),
      document.getElementById('annForm')?.addEventListener('submit', me),
      document.getElementById('refreshLogs')?.addEventListener('click', O),
      document.getElementById('homeworkList')?.addEventListener('click', async (o) => {
        let l = o.target.closest('[data-action="deleteHomework"]');
        if (l) {
          let m = l.dataset.id;
          (await fetch(`${d}/homework/${m}`, { method: 'DELETE', credentials: 'same-origin' }), j());
        }
      }),
      document.getElementById('announcementList')?.addEventListener('click', async (o) => {
        let l = o.target.closest('[data-action="deleteAnnouncement"]');
        if (l) {
          let m = l.dataset.id;
          (await fetch(`${d}/announcements/${m}`, { method: 'DELETE', credentials: 'same-origin' }), $());
        }
      }));
    let a = document.getElementById('emojiToggle');
    a && a.addEventListener('click', P);
    let s = document.getElementById('attachBtn'),
      r = document.getElementById('imageInput');
    (s &&
      r &&
      (s.addEventListener('click', () => r.click()),
      r.addEventListener('change', (o) => {
        o.target.files[0] && (oe(o.target.files[0]), (o.target.value = ''));
      })),
      document.addEventListener('click', (o) => {
        if (a && !o.target.closest('#emojiPicker') && !o.target.closest('#emojiToggle')) {
          let l = document.getElementById('emojiPicker');
          l && l.classList.remove('open');
        }
      }),
      document.addEventListener('visibilitychange', () => {
        document.hidden || (T(), document.getElementById('notifications')?.classList.contains('active') && w());
      }));
    let c = document.getElementById('themeToggle');
    if (c) {
      let o = localStorage.getItem('theme') === 'dark';
      (o && document.body.classList.add('dark'),
        (c.innerHTML = o
          ? '<i class="bx bx-sun"></i> \u0421\u0432\u0435\u0442\u043B\u0430\u044F \u0442\u0435\u043C\u0430'
          : '<i class="bx bx-moon"></i> \u0422\u0451\u043C\u043D\u0430\u044F \u0442\u0435\u043C\u0430'),
        c.addEventListener('click', () => {
          document.body.classList.toggle('dark');
          let l = document.body.classList.contains('dark');
          (localStorage.setItem('theme', l ? 'dark' : 'light'),
            (c.innerHTML = l
              ? '<i class="bx bx-sun"></i> \u0421\u0432\u0435\u0442\u043B\u0430\u044F \u0442\u0435\u043C\u0430'
              : '<i class="bx bx-moon"></i> \u0422\u0451\u043C\u043D\u0430\u044F \u0442\u0435\u043C\u0430'));
        }));
    }
  }
  document.addEventListener('DOMContentLoaded', pe);
})();
