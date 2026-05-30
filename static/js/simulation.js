/**
 * Birthday Paradox Simulation Frontend
 * Calls Flask Python API for NumPy Monte Carlo, renders with Chart.js
 */
document.addEventListener('DOMContentLoaded', () => {

  // ======== STATE ========
  const S = {
    mode: 'exact',
    n: 23,
    delta: 1,
    trials: 1000,
    peak: 3.0,
    trough: -1.5,
    curvesChart: null,
    convChart: null,
    running: false
  };

  // ======== HELPERS ========
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  const AVATARS = ['🧑','👶','👧','👨','👩','👱','🧔','👵','👴','👮','👷','👩‍⚕️','👩‍🎓','👩‍🍳','👩‍💻','🧑‍🔬'];

  function dayStr(d) {
    let day = d;
    for (let m = 0; m < MONTH_DAYS.length; m++) {
      if (day <= MONTH_DAYS[m]) return `${day} ${MONTHS[m]}`;
      day -= MONTH_DAYS[m];
    }
    return '31 Dec';
  }

  // Analytical exact formula (local JS for instant metric updates)
  function analyticalExact(n, days=365) {
    if (n > days) return 1;
    let p = 1;
    for (let k = 0; k < n; k++) p *= (days - k) / days;
    return 1 - p;
  }

  // ======== DOM REFS ========
  const $=id=>document.getElementById(id);

  const lblN = $('lblN'), sliderN = $('sliderN'), numN = $('numN');
  const lblDelta = $('lblDelta'), sliderDelta = $('sliderDelta'), numDelta = $('numDelta');
  const lblPeak = $('lblPeak'), sliderPeak = $('sliderPeak');
  const lblTrough = $('lblTrough'), sliderTrough = $('sliderTrough');
  const selTrials = $('selTrials');
  const btnBatch = $('btnBatch'), btnSingle = $('btnSingle');
  const progressWrap = $('progressWrap'), progressFill = $('progressFill');
  const mSim = $('mSim'), mSimSub = $('mSimSub'), mAnal = $('mAnal');
  const mCross = $('mCross'), mSpeed = $('mSpeed');

  // ======== SYNC INPUTS ========
  function syncPair(slider, num, lbl, key, suffix='') {
    function up(v) {
      let p = parseFloat(v);
      if (isNaN(p)) p = parseFloat(slider.min);
      p = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), p));
      slider.value = p; num.value = p;
      if (lbl) lbl.textContent = p + suffix;
      S[key] = p;
      updateAnalLabel();
    }
    slider.addEventListener('input', e => up(e.target.value));
    num.addEventListener('change', e => up(e.target.value));
  }

  syncPair(sliderN, numN, lblN, 'n');
  syncPair(sliderDelta, numDelta, lblDelta, 'delta', ' days');

  // Peak/Trough
  sliderPeak.addEventListener('input', e => {
    S.peak = parseFloat(e.target.value);
    lblPeak.textContent = S.peak.toFixed(1) + 'x';
    fetchDistBars();
  });
  sliderTrough.addEventListener('input', e => {
    S.trough = parseFloat(e.target.value);
    lblTrough.textContent = S.trough.toFixed(1) + 'x';
    fetchDistBars();
  });

  selTrials.addEventListener('change', e => { S.trials = parseInt(e.target.value) });

  // ======== MODE SELECTOR ========
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.mode = btn.dataset.mode;
      $('groupDelta').style.display = S.mode === 'near' ? 'block' : 'none';
      $('distEditor').style.display = S.mode === 'nonuniform' ? 'block' : 'none';
      if (S.mode === 'nonuniform') fetchDistBars();
      updateAnalLabel();
    });
  });

  // ======== TABS ========
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'tabConv') runConvergence();
    });
  });

  // ======== ANALYTICAL LABEL ========
  function updateAnalLabel() {
    let val;
    if (S.mode === 'exact' || S.mode === 'nonuniform') val = analyticalExact(S.n);
    else if (S.mode === 'month') val = analyticalExact(S.n, 12);
    else val = null;
    mAnal.textContent = val !== null ? (val * 100).toFixed(2) + '%' : 'MC Only';
  }

  // ======== CHART.JS INIT ========
  function initCharts() {
    const darkGrid = 'rgba(255,255,255,0.04)';
    const tickFont = { family: 'JetBrains Mono', size: 10, color: '#8c94a9' };
    const titleFont = { family: 'Outfit', size: 11, weight: 'bold', color: '#8c94a9' };

    const tooltipStyle = {
      backgroundColor: 'rgba(16,18,29,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
      bodyFont: { family: 'JetBrains Mono', size: 12 },
      padding: 10,
      callbacks: {
        label: ctx => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(2)}%`
      }
    };

    const sizes = Array.from({length:100},(_,i)=>i+1);

    S.curvesChart = new Chart($('chartCurves'), {
      type: 'line',
      data: {
        labels: sizes,
        datasets: [
          { label: 'Simulated', data: [], borderColor: '#00f2fe', borderWidth: 3, pointRadius: 0, fill: false, tension: .1 },
          { label: 'Exact Analytical', data: [], borderColor: '#4facfe', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: .1 },
          { label: 'Poisson Approx', data: [], borderColor: '#FAAD14', borderWidth: 1.5, borderDash: [2,4], pointRadius: 0, fill: false, tension: .1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, labels: { color: '#8c94a9', font: { family: 'Outfit', size: 10 } } }, tooltip: tooltipStyle },
        scales: {
          x: { grid: { color: darkGrid }, ticks: { font: tickFont, color: '#8c94a9' }, title: { display: true, text: 'Group Size (n)', font: titleFont, color: '#8c94a9' } },
          y: { min: 0, max: 1.05, grid: { color: darkGrid }, ticks: { font: tickFont, color: '#8c94a9', callback: v => (v*100)+'%' }, title: { display: true, text: 'Match Probability', font: titleFont, color: '#8c94a9' } }
        }
      }
    });

    S.convChart = new Chart($('chartConv'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Mean Abs Error', data: [], borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.08)', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#00f2fe', fill: true, tension: .1 },
          { label: 'Upper Bound (+1σ)', data: [], borderColor: 'rgba(248,87,166,0.3)', borderWidth: 1, pointRadius: 0, fill: false, tension: .1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#8c94a9', font: { family: 'Outfit', size: 10 } } } },
        scales: {
          x: { grid: { color: darkGrid }, ticks: { font: tickFont, color: '#8c94a9' }, title: { display: true, text: 'Number of Trials', font: titleFont, color: '#8c94a9' } },
          y: { min: 0, grid: { color: darkGrid }, ticks: { font: tickFont, color: '#8c94a9' }, title: { display: true, text: '|Sim − Analytical|', font: titleFont, color: '#8c94a9' } }
        }
      }
    });
  }

  // ======== API CALLS ========
  async function runBatch() {
    if (S.running) return;
    S.running = true;
    btnBatch.classList.add('running');
    btnBatch.textContent = '⚡ Running...';
    btnSingle.disabled = true;
    progressWrap.style.display = 'block';
    progressFill.style.width = '30%';

    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: S.mode, trials: S.trials, delta: S.delta, max_n: 100, peak: S.peak, trough: S.trough })
      });
      const d = await res.json();
      progressFill.style.width = '100%';

      // Update chart
      const colorMap = { exact: '#00f2fe', near: '#f857a6', month: '#9B59B6', nonuniform: '#2FC25B' };
      S.curvesChart.data.datasets[0].borderColor = colorMap[S.mode];
      S.curvesChart.data.datasets[0].data = d.results;
      S.curvesChart.data.datasets[1].data = d.analytical_exact;
      S.curvesChart.data.datasets[2].data = d.analytical_poisson;
      S.curvesChart.update();

      // Update metrics
      const simP = d.results[S.n - 1];
      mSim.textContent = (simP * 100).toFixed(2) + '%';
      mSimSub.textContent = `${S.n} people, ${S.trials.toLocaleString()} trials`;
      mCross.textContent = d.crossing ? `n = ${d.crossing}` : 'n > 100';
      mSpeed.textContent = d.elapsed_ms + ' ms';
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => { progressWrap.style.display = 'none' }, 400);
    btnBatch.classList.remove('running');
    btnBatch.textContent = '🚀 Run Full Batch';
    btnSingle.disabled = false;
    S.running = false;
  }

  async function runSingle() {
    const sandbox = $('sandbox');
    const alert = $('matchAlert');
    sandbox.innerHTML = '';
    alert.className = 'match-alert';

    try {
      const res = await fetch('/api/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: S.mode, n: S.n, delta: S.delta, peak: S.peak, trough: S.trough })
      });
      const d = await res.json();
      const matchSet = new Set(d.matched);

      d.birthdays.forEach((b, i) => {
        const card = document.createElement('div');
        card.className = 'bday-card' + (matchSet.has(i) ? ' matched' : '');
        card.style.animationDelay = `${i * 25}ms`;

        const dateLabel = S.mode === 'month' ? MONTHS[b - 1] : dayStr(b);
        card.innerHTML = `
          <div class="bday-avatar">${AVATARS[Math.abs(b * 7 + i) % AVATARS.length]}</div>
          <div class="bday-date">${dateLabel}</div>
          <div class="bday-idx">#${i + 1}</div>
        `;
        sandbox.appendChild(card);
      });

      // Match alert
      if (d.matched.length > 0) {
        const matchDates = d.labels.map(l => {
          if (S.mode === 'month') return MONTHS[l - 1];
          if (typeof l === 'number') return dayStr(l);
          return l;
        });
        $('matchIcon').textContent = '🎉';
        $('matchText').innerHTML = `<strong>Match found!</strong> Shared: <span style="color:var(--yellow);font-weight:600">${matchDates.join(', ')}</span>`;
        alert.className = 'match-alert found';
      } else {
        $('matchIcon').textContent = '😶';
        $('matchText').textContent = 'No matches found in this room. Try again!';
        alert.className = 'match-alert none';
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function runConvergence() {
    try {
      const res = await fetch('/api/convergence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: S.n })
      });
      const d = await res.json();
      S.convChart.data.labels = d.trial_counts.map(t => t.toLocaleString());
      S.convChart.data.datasets[0].data = d.mean_errors;
      S.convChart.data.datasets[1].data = d.mean_errors.map((m, i) => m + d.std_errors[i]);
      S.convChart.update();
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDistBars() {
    try {
      const res = await fetch('/api/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peak: S.peak, trough: S.trough })
      });
      const d = await res.json();
      const container = $('distBars');
      container.querySelectorAll('.dist-bar').forEach(b => b.remove());
      d.bars.forEach(rel => {
        const bar = document.createElement('div');
        bar.className = 'dist-bar';
        const h = Math.min(Math.max(rel * 30, 5), 95);
        bar.style.height = h + '%';
        if (rel > 1.2) bar.style.background = 'var(--cyan)';
        else if (rel < 0.8) { bar.style.background = 'var(--orange)'; bar.style.opacity = '0.4' }
        container.appendChild(bar);
      });
    } catch (e) { console.error(e) }
  }

  // ======== EVENT BINDING ========
  btnBatch.addEventListener('click', runBatch);
  btnSingle.addEventListener('click', runSingle);

  // ======== INIT ========
  initCharts();
  updateAnalLabel();
  runBatch(); // Auto-run on page load
});
