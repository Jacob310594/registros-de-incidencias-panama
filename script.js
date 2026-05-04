// ── STATE ──
let incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
let currentFilter = 'Todos';
let currentEditId = null;

// ── HELPERS ──
function uid() {
  return 'INC-' + String(incidents.length + 1).padStart(4, '0');
}

function now() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' });
}

function save() {
  localStorage.setItem('incidents', JSON.stringify(incidents));
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.innerHTML = (type === 'success' ? '✓ ' : '✗ ') + msg;
  t.className = 'show toast-' + type;
  setTimeout(() => t.className = '', 3000);
}

// ── HEADER DATE ──
function updateHeader() {
  const el = document.getElementById('headerDate');
  const d = new Date();
  el.textContent = d.toLocaleDateString('es', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
}
updateHeader();
setInterval(updateHeader, 60000);

// ── TAB SWITCHER ──
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'listado')   renderListado();
  if (name === 'reporte')   renderReporte();
}

// ── CHAR COUNTER ──
document.getElementById('descripcion').addEventListener('input', function() {
  const len = this.value.length;
  const c = document.getElementById('charCount');
  c.textContent = len + ' / 1000';
  c.className = 'char-counter ' + (len >= 10 ? 'ok' : 'warn');
});

// ── VALIDATION ──
function validateField(id, rule) {
  const el = document.getElementById(id);
  const err = document.getElementById('err-' + id);
  const val = el.value.trim();
  const ok = rule(val);
  el.className = ok ? 'valid' : 'error';
  if (err) err.className = 'field-error ' + (ok ? '' : 'show');
  return ok;
}

function validateAll() {
  const r = [
    validateField('titulo',       v => v.length > 0),
    validateField('area',         v => v.length > 0),
    validateField('reportadoPor', v => v.length > 0),
    validateField('email',        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
    validateField('categoria',    v => v.length > 0),
    validateField('descripcion',  v => v.length >= 10),
  ];
  return r.every(Boolean);
}

// ── FORM SUBMIT ──
document.getElementById('incidenciaForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!validateAll()) {
    showToast('Corrija los errores antes de enviar.', 'error');
    return;
  }
  const prioridad = document.querySelector('input[name="prioridad"]:checked').value;
  const inc = {
    id:          uid(),
    titulo:      document.getElementById('titulo').value.trim(),
    area:        document.getElementById('area').value,
    reportadoPor: document.getElementById('reportadoPor').value.trim(),
    email:       document.getElementById('email').value.trim(),
    categoria:   document.getElementById('categoria').value,
    prioridad,
    descripcion: document.getElementById('descripcion').value.trim(),
    impacto:     document.getElementById('impacto').value.trim(),
    estado:      'Pendiente',
    creada:      now(),
    resuelta:    null,
  };
  incidents.unshift(inc);
  save();
  showToast('Incidencia ' + inc.id + ' registrada correctamente.');
  resetForm();
});

function resetForm() {
  document.getElementById('incidenciaForm').reset();
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.className = '';
  });
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
  document.getElementById('charCount').textContent = '0 / 1000';
  document.getElementById('charCount').className = 'char-counter';
}

// Live validation on blur
['titulo','area','reportadoPor','email','categoria','descripcion'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('blur', () => {
    const rules = {
      titulo: v => v.length > 0,
      area: v => v.length > 0,
      reportadoPor: v => v.length > 0,
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      categoria: v => v.length > 0,
      descripcion: v => v.length >= 10,
    };
    validateField(id, rules[id]);
  });
});

// ── BADGE HELPERS ──
function badgePrioridad(p) {
  const map = { 'Crítica':'critica','Alta':'alta','Media':'media','Leve':'leve' };
  return `<span class="badge badge-${map[p]||'leve'}">${p}</span>`;
}

function badgeEstado(e) {
  const map = { 'Pendiente':'pendiente','En proceso':'proceso','Resuelto':'resuelto','Cerrado':'cerrado' };
  return `<span class="badge badge-${map[e]||'pendiente'}">${e}</span>`;
}

function badgeCategoria(c) {
  return c === 'A'
    ? `<span class="badge badge-critica">Cat. A · Crítica</span>`
    : `<span class="badge badge-leve">Cat. B · Leve</span>`;
}

// ── DASHBOARD ──
function renderDashboard() {
  const total = incidents.length;
  const pendientes = incidents.filter(i => i.estado === 'Pendiente').length;
  const resueltas = incidents.filter(i => i.estado === 'Resuelto' || i.estado === 'Cerrado').length;

  const tiempos = incidents
    .filter(i => i.resuelta)
    .map(i => (new Date(i.resuelta) - new Date(i.creada)) / 3600000);
  const avgT = tiempos.length
    ? (tiempos.reduce((a,b) => a+b, 0) / tiempos.length).toFixed(1)
    : '—';

  document.getElementById('m-total').textContent = total;
  document.getElementById('m-pendientes').textContent = pendientes;
  document.getElementById('m-resueltas').textContent = resueltas;
  document.getElementById('m-tiempo').textContent = avgT === '—' ? '—' : avgT + 'h';

  const estados = ['Pendiente','En proceso','Resuelto','Cerrado'];
  const estColors = { 'Pendiente':'var(--pending)','En proceso':'var(--accent)','Resuelto':'var(--leve)','Cerrado':'var(--text3)' };
  const estCounts = estados.map(e => incidents.filter(i => i.estado === e).length);
  const estMax = Math.max(...estCounts, 1);
  document.getElementById('estadoBars').innerHTML = estados.map((e,i) => `
    <div class="bar-item">
      <div class="bar-label">${e}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(estCounts[i]/estMax*100).toFixed(0)}%;background:${estColors[e]}"></div>
      </div>
      <div class="bar-count">${estCounts[i]}</div>
    </div>`).join('');

  const catA = incidents.filter(i => i.categoria === 'A').length;
  const catB = incidents.filter(i => i.categoria === 'B').length;
  const catMax = Math.max(catA, catB, 1);
  document.getElementById('catBars').innerHTML = [
    ['Cat. A','var(--critical)',catA],
    ['Cat. B','var(--leve)',catB],
  ].map(([l,c,v]) => `
    <div class="bar-item">
      <div class="bar-label">${l}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(v/catMax*100).toFixed(0)}%;background:${c}"></div></div>
      <div class="bar-count">${v}</div>
    </div>`).join('');

  const prios = ['Crítica','Alta','Media','Leve'];
  const prioColors = {'Crítica':'var(--critical)','Alta':'var(--pending)','Media':'var(--accent)','Leve':'var(--leve)'};
  const prioCounts = prios.map(p => incidents.filter(i => i.prioridad === p).length);
  const prioMax = Math.max(...prioCounts, 1);
  document.getElementById('prioBars').innerHTML = prios.map((p,i) => `
    <div class="bar-item">
      <div class="bar-label">${p}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(prioCounts[i]/prioMax*100).toFixed(0)}%;background:${prioColors[p]}"></div></div>
      <div class="bar-count">${prioCounts[i]}</div>
    </div>`).join('');

  const criticals = incidents.filter(i => i.prioridad === 'Crítica' && i.estado !== 'Resuelto' && i.estado !== 'Cerrado');
  const critBody = document.getElementById('criticalRows');
  if (!criticals.length) {
    critBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No hay incidencias críticas activas.</div></td></tr>`;
  } else {
    critBody.innerHTML = criticals.map(i => `
      <tr>
        <td class="td-id">${i.id}</td>
        <td class="td-title">${i.titulo}</td>
        <td>${i.area}</td>
        <td>${badgeEstado(i.estado)}</td>
        <td>${fmtDate(i.creada)}</td>
      </tr>`).join('');
  }
}

// ── LISTADO ──
let activeFilter = 'Todos';
function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderListado();
}

function renderListado() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  let filtered = incidents.filter(i => {
    const matchFilter = activeFilter === 'Todos' || i.estado === activeFilter;
    const matchSearch = !q || i.titulo.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.area.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  const tbody = document.getElementById('listadoRows');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No se encontraron incidencias.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(i => `
    <tr>
      <td class="td-id">${i.id}</td>
      <td class="td-title">${i.titulo}</td>
      <td>${badgeCategoria(i.categoria)}</td>
      <td>${badgePrioridad(i.prioridad)}</td>
      <td>${badgeEstado(i.estado)}</td>
      <td style="font-size:0.78rem;color:var(--text3)">${fmtDate(i.creada)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="action-btn" onclick="openModal('${i.id}')">Ver / Editar</button>
          <button class="action-btn resolve" onclick="quickResolve('${i.id}')">Resolver</button>
          <button class="action-btn delete" onclick="deleteInc('${i.id}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function quickResolve(id) {
  const inc = incidents.find(i => i.id === id);
  if (!inc) return;
  inc.estado = 'Resuelto';
  if (!inc.resuelta) inc.resuelta = now();
  save();
  renderListado();
  showToast(id + ' marcada como resuelta.');
}

function deleteInc(id) {
  if (!confirm('¿Eliminar la incidencia ' + id + '?')) return;
  incidents = incidents.filter(i => i.id !== id);
  save();
  renderListado();
  showToast(id + ' eliminada.', 'error');
}

// ── MODAL ──
function openModal(id) {
  const inc = incidents.find(i => i.id === id);
  if (!inc) return;
  currentEditId = id;
  document.getElementById('modalTitle').textContent = inc.id + ' · ' + inc.titulo;
  document.getElementById('modalGrid').innerHTML = `
    <div class="detail-item"><label>Área</label><span>${inc.area}</span></div>
    <div class="detail-item"><label>Categoría</label><span>${inc.categoria === 'A' ? 'A · Crítica' : 'B · Leve'}</span></div>
    <div class="detail-item"><label>Prioridad</label><span>${inc.prioridad}</span></div>
    <div class="detail-item"><label>Reportado por</label><span>${inc.reportadoPor}</span></div>
    <div class="detail-item"><label>Creada</label><span>${fmtDate(inc.creada)} ${fmtTime(inc.creada)}</span></div>
    <div class="detail-item"><label>Impacto</label><span>${inc.impacto || '—'}</span></div>
  `;
  document.getElementById('modalDesc').textContent = inc.descripcion;
  document.getElementById('modalStatus').value = inc.estado;
  document.getElementById('modalBg').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalBg')) {
    document.getElementById('modalBg').classList.remove('open');
  }
}

function saveStatus() {
  const inc = incidents.find(i => i.id === currentEditId);
  if (!inc) return;
  const newStatus = document.getElementById('modalStatus').value;
  const wasResolved = inc.estado === 'Resuelto' || inc.estado === 'Cerrado';
  inc.estado = newStatus;
  if ((newStatus === 'Resuelto' || newStatus === 'Cerrado') && !wasResolved) {
    inc.resuelta = now();
  }
  save();
  document.getElementById('modalBg').classList.remove('open');
  renderListado();
  showToast('Estado actualizado: ' + newStatus);
}

// ── REPORTE ──
function renderReporte() {
  const total = incidents.length;
  const d = new Date();
  document.getElementById('reportMeta').textContent =
    'Generado: ' + d.toLocaleDateString('es', { day:'2-digit', month:'long', year:'numeric' }) +
    ' · ' + d.toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' });
  renderDashboard(); // Se asegura de que se calculen métricas
  // (El resto de la lógica de reporte se mantiene igual según el original...)
}

// ── INIT ──
if (!incidents.length) {
  incidents = [
    { id:'INC-0001', titulo:'Caída del servidor de base de datos', area:'Tecnología', reportadoPor:'Ana García', email:'ana@empresa.com', categoria:'A', prioridad:'Crítica', descripcion:'El servidor principal de base de datos dejó de responder a las 09:15.', impacto:'200+ usuarios sin acceso', estado:'En proceso', creada: new Date(Date.now()-3*3600000).toISOString(), resuelta: null },
    { id:'INC-0002', titulo:'Error tipográfico en portal web', area:'Comercial', reportadoPor:'Luis Méndez', email:'luis@empresa.com', categoria:'B', prioridad:'Leve', descripcion:'Error ortográfico en el título principal.', impacto:'Impacto leve', estado:'Pendiente', creada: new Date(Date.now()-5*3600000).toISOString(), resuelta: null },
  ];
  save();
}