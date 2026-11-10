import { communities, units, payments, documents, monthlyTrend } from './demo-data.js';
import { escapeHtml as h, formatMoney, formatDate, withinCommunity, searchItems, summaryFor, statusType, getCommunityName } from './domain.js';

const icons = {
  home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-7h6v7"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"/>',
  door: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M14.5 12h.01"/>',
  wallet: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M7 3h10"/><path d="M16 16h2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  file: '<path d="M6 2h8l5 5v15H6zM14 2v5h5M9 12h7M9 16h7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  up: '<path d="m5 16 7-7 7 7"/>',
  down: '<path d="m5 8 7 7 7-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sparkles: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 18v4m-2-2h4"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5z"/><path d="m8 12 3 3 5-6"/>',
};

export function icon(name, size = 19) {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] ?? icons.file}</svg>`;
}

const pages = [
  { id: 'dashboard', title: 'Resumen general', icon: 'home' },
  { id: 'communities', title: 'Comunidades', icon: 'building' },
  { id: 'units', title: 'Unidades', icon: 'door' },
  { id: 'payments', title: 'Finanzas', icon: 'wallet' },
  { id: 'announcements', title: 'Comunicados', icon: 'bell' },
  { id: 'documents', title: 'Documentos', icon: 'file' },
  { id: 'settings', title: 'Configuración', icon: 'settings' },
];
const headings = {
  dashboard: ['Tu comunidad, en perspectiva', 'Visibilidad operativa y financiera en un solo lugar.'],
  communities: ['Comunidades', 'Administra tus espacios desde una vista centralizada.'],
  units: ['Directorio de unidades', 'Consulta de unidades y saldos de demostración.'],
  payments: ['Control financiero', 'Movimientos de ejemplo, sin procesamiento de pagos.'],
  announcements: ['Comunicados', 'Información ordenada para cada comunidad.'],
  documents: ['Centro documental', 'Vista de documentos ilustrativos, sin archivos reales.'],
  settings: ['Configuración', 'Decisiones técnicas y comerciales pendientes.'],
};

function badge(status) { return `<span class="status status--${statusType(status)}"><span class="status-dot"></span>${h(status)}</span>`; }
function emptyState() { return `<div class="empty">${icon('search', 28)}<strong>No hay resultados</strong><p>Prueba con otro término o cambia la comunidad seleccionada.</p></div>`; }
function communityPill(id) { return `<span class="community-name">${h(getCommunityName(communities, id))}</span>`; }
function cardHeader(title, subtitle = '', extra = '') { return `<div class="panel-head"><div><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div>${extra}</div>`; }
function sectionJump(id, title) { return `<button class="text-button" data-nav="${id}">${h(title)} ${icon('arrow', 16)}</button>`; }

function shell(state, content) {
  const { page, communityId, sidebarOpen, query, announcements, modal } = state;
  const heading = headings[page] ?? headings.dashboard;
  return `<div class="app-shell">
  <aside class="sidebar ${sidebarOpen ? 'sidebar--open' : ''}" aria-label="Navegación principal">
    <div class="brand"><div class="brand-mark">${icon('building', 24)}</div><div><strong>Digi<span>Condominio</span></strong><small>GESTIÓN INTELIGENTE</small></div></div>
    <div class="workspace-label">ESPACIO DE TRABAJO</div>
    <div class="workspace-item"><div class="workspace-avatar">DC</div><div><strong>Panel de administración</strong><small>Modo de demostración</small></div>${icon('chevron', 14)}</div>
    <p class="nav-label">PRINCIPAL</p>
    <nav class="nav-list">${pages.slice(0, 6).map((item) => `<button data-nav="${item.id}" class="nav-item ${page === item.id ? 'active' : ''}" ${page === item.id ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.title}</span>${item.id === 'announcements' ? `<em>${announcements.length}</em>` : ''}</button>`).join('')}</nav>
    <p class="nav-label nav-label--space">SISTEMA</p>
    <nav class="nav-list"><button class="nav-item ${page === 'settings' ? 'active' : ''}" data-nav="settings" ${page === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}<span>Configuración</span></button></nav>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-note"><div class="sidebar-note-icon">${icon('shield')}</div><strong>Datos ficticios</strong><p>Prototipo sin cuentas, sin conexión a servicios y con datos ficticios.</p><span>FASE 0 · DEMO</span></div>
    <div class="sidebar-profile"><div class="profile-avatar">AD</div><div><strong>Administración</strong><small>Usuario de demostración</small></div><span class="profile-online"></span></div>
  </aside>
  ${sidebarOpen ? '<button class="mobile-shade" data-action="menu-close" aria-label="Cerrar menú"></button>' : ''}
  <div class="main-area"><header class="topbar"><div class="topbar-left"><button class="mobile-menu" aria-label="Abrir navegación" data-action="menu-open">${icon('menu')}</button><span class="breadcrumb">Plataforma</span>${icon('chevron', 13)}<strong>${h(pages.find((p) => p.id === page)?.title ?? 'Resumen general')}</strong></div><div class="topbar-right"><div class="header-pill">${icon('shield', 15)} Solo demostración</div><div class="top-avatar" title="Usuario demo">AD</div></div></header>
  <main id="main-content" tabindex="-1" class="content"><div class="intro-row"><div><div class="eyebrow"><span class="eyebrow-dot"></span> ESPACIO DE ADMINISTRACIÓN <span class="intro-date"> · OCTUBRE 2026</span></div><h1>${h(heading[0])}</h1><p>${h(heading[1])}</p></div><div class="intro-actions">${page !== 'settings' ? `<label class="select-wrap" for="community-select">${icon('building', 17)}<select id="community-select" aria-label="Filtrar por comunidad"><option value="all" ${communityId === 'all' ? 'selected' : ''}>Todas las comunidades</option>${communities.map((item) => `<option value="${item.id}" ${communityId === item.id ? 'selected' : ''}>${h(item.name)}</option>`).join('')}</select>${icon('chevron', 14)}</label>` : ''}${page === 'announcements' || page === 'dashboard' ? `<button class="primary-button" data-action="new-announcement">${icon('plus', 17)} Nuevo comunicado</button>` : ''}</div></div>
  <div class="demo-ribbon" role="note">${icon('sparkles', 18)}<span><strong>Vista de demostración.</strong> Datos simulados y acciones locales; no se guardan ni envían a ningún servidor.</span></div>
  ${['units', 'payments', 'announcements', 'documents'].includes(page) ? `<div class="search-bar"><div class="input-search">${icon('search', 19)}<input id="record-search" aria-label="Buscar registros" value="${h(query)}" placeholder="Buscar en ${h(pages.find((p) => p.id === page)?.title.toLowerCase())}..." autocomplete="off" /></div><span class="search-hint">La búsqueda se aplica a esta sección</span></div>` : ''}
  ${content}
  <footer class="footer"><span>© 2026 Digi-Condominio · Prototipo de evaluación privada</span><span>Versión 0.1.0 · Sin conexión a producción</span></footer></main></div>
  ${modal ? announcementModal(state) : ''}
  </div>`;
}

function statCard(label, amount, iconName, tag, variant) {
  return `<article class="stat-card stat-card--${variant}"><div class="stat-top"><span>${h(label)}</span><span class="stat-icon">${icon(iconName, 21)}</span></div><strong class="stat-number">${h(String(amount))}</strong><div class="stat-meta">${icon(variant === 'coral' ? 'clock' : 'check', 13)} ${h(tag)}</div></article>`;
}

function trendChart() {
  const max = Math.max(...monthlyTrend.flatMap((x) => [x.billed, x.collected]));
  return `<section class="panel trend-panel">${cardHeader('Movimiento de cuotas', 'Comparativo ilustrativo en unidades relativas', `<div class="legend"><span><i class="legend-billed"></i> Emitidas</span><span><i class="legend-collected"></i> Registradas</span></div>`)}<div class="chart-grid"><div class="axis-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div class="chart-bars">${monthlyTrend.map((item) => `<div class="chart-group"><div class="chart-bars-pair"><span class="bar bar-billed" style="height:${Math.round(item.billed / max * 100)}%" title="Emitidas: ${item.billed} unidades relativas"></span><span class="bar bar-collected" style="height:${Math.round(item.collected / max * 100)}%" title="Registradas: ${item.collected} unidades relativas"></span></div><span>${h(item.month)}</span></div>`).join('')}</div></div><p class="chart-note">Valores únicamente ilustrativos; no representan contabilidad ni saldos reales.</p></section>`;
}

function dashboard(state) {
  const d = summaryFor(communities, units, payments, state.communityId);
  const latest = withinCommunity(payments, state.communityId).slice(0, 4);
  const currentAnnouncements = withinCommunity(state.announcements, state.communityId).slice(0, 3);
  const utilization = d.units ? Math.round(100 * d.active / d.units) : 0;
  return `<div class="stats-grid">${statCard('Comunidades', d.communities, 'building', 'Espacios en vista', 'blue')}${statCard('Unidades totales', d.units, 'door', `${d.active} unidades activas`, 'violet')}${statCard('Pagos confirmados', formatMoney(d.confirmed), 'wallet', `${d.paidCount} registros de ejemplo`, 'mint')}${statCard('Saldo pendiente visible', formatMoney(d.outstanding), 'clock', `${d.pendingUnits} unidades de muestra`, 'coral')}</div>
  <div class="dashboard-grid"><div class="stack">${trendChart()}<section class="panel">${cardHeader('Últimos movimientos', 'Registro ilustrativo de pagos', sectionJump('payments', 'Ver todos'))}${paymentsTable(latest, true)}</section></div><div class="stack"><section class="panel occupancy-panel">${cardHeader('Ocupación referencial', 'Unidades activas sobre el total')}<div class="occupancy-wrap"><div class="ring" style="--progress:${utilization}%"><div><strong>${utilization}%</strong><small>Ocupación</small></div></div><div class="ring-legend"><div><span class="key-dot key-dot--mint"></span><span>Activas</span><strong>${d.active}</strong></div><div><span class="key-dot key-dot--light"></span><span>Otras</span><strong>${d.units - d.active}</strong></div></div></div></section><section class="panel announcements-panel">${cardHeader('Novedades recientes', 'Comunicaciones en vista', sectionJump('announcements', 'Ver todas'))}<div class="announcement-list">${currentAnnouncements.length ? currentAnnouncements.map((item) => `<div class="announcement-item"><div class="announcement-icon">${icon('bell', 18)}</div><div><strong>${h(item.title)}</strong><span>${h(getCommunityName(communities, item.communityId))} · ${h(formatDate(item.date))}</span></div></div>`).join('') : emptyState()}</div></section><section class="insight-card"><div class="insight-symbol">${icon('sparkles', 22)}</div><span>PRÓXIMO PASO</span><h3>De la visión a una plataforma real</h3><p>Validar permisos, país inicial y reglas financieras antes de conectar datos reales.</p><button data-nav="settings">Ver decisiones pendientes ${icon('arrow', 16)}</button></section></div></div>`;
}

function paymentsTable(rows, compact = false) {
  if (!rows.length) return emptyState();
  return `<div class="table-wrap"><table><thead><tr><th>Unidad / Comunidad</th><th>Concepto</th>${compact ? '' : '<th>Fecha</th>'}<th>Monto</th><th>Estado</th></tr></thead><tbody>${rows.map((item) => `<tr><td><strong>${h(item.unit)}</strong><small>${h(getCommunityName(communities, item.communityId))}</small></td><td>${h(item.concept)}</td>${compact ? '' : `<td>${h(formatDate(item.date))}</td>`}<td class="money">${h(formatMoney(item.amount))}</td><td>${badge(item.status)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderCommunities(state) {
  const rows = state.communityId === 'all' ? communities : communities.filter((item) => item.id === state.communityId);
  return `<div class="section-summary"><strong>${rows.length}</strong> comunidades en la vista <span>Información demostrativa · seleccionar una tarjeta filtra el panel</span></div><div class="community-grid">${rows.map((item) => `<button class="community-card" data-community="${item.id}"><div class="community-card-top"><span class="building-symbol" style="--building-color:${item.color}">${icon('building', 25)}</span><span class="subtle-arrow">${icon('arrow', 19)}</span></div><h2>${h(item.name)}</h2><p>${h(item.address)}</p><div class="community-metrics"><div><strong>${item.units}</strong><span>Unidades</span></div><div><strong>${item.active}</strong><span>Activas</span></div><div><strong>${Math.round(item.active / item.units * 100)}%</strong><span>Ocupación</span></div></div><div class="card-link">Explorar comunidad ${icon('arrow', 16)}</div></button>`).join('')}</div>`;
}

function renderUnits(state) {
  const rows = searchItems(withinCommunity(units, state.communityId), state.query, ['code','resident','kind','status']);
  return `<section class="panel wide-panel">${cardHeader('Unidades registradas', `${rows.length} unidades de ejemplo; los totales generales incluyen registros no detallados`, `<span class="mini-tag">FILTRO ACTIVO</span>`)}<div class="table-wrap"><table><thead><tr><th>Identificador</th><th>Comunidad</th><th>Ocupante</th><th>Tipo</th><th>Saldo de muestra</th><th>Estado</th></tr></thead><tbody>${rows.map((item) => `<tr><td><strong>${h(item.code)}</strong></td><td>${communityPill(item.communityId)}</td><td>${h(item.resident)}</td><td>${h(item.kind)}</td><td class="money">${h(formatMoney(item.balance))}</td><td>${badge(item.status)}</td></tr>`).join('')}</tbody></table></div>${rows.length ? '' : emptyState()}</section>`;
}

function renderPayments(state) {
  const rows = searchItems(withinCommunity(payments, state.communityId), state.query, ['unit','concept','status','id']);
  const total = rows.filter((item) => item.status === 'Confirmado').reduce((sum, item) => sum + item.amount, 0);
  return `<div class="finance-top"><div><span>Total confirmado en los registros filtrados</span><strong>${h(formatMoney(total))}</strong><small>Moneda ficticia de prueba · UM</small></div><span class="finance-decoration">${icon('wallet', 40)}</span></div><section class="panel wide-panel">${cardHeader('Movimientos de ejemplo', `${rows.length} registros visibles · no hay procesamiento bancario`, `<span class="mini-tag">SOLO LECTURA</span>`)}${paymentsTable(rows)}</section>`;
}

function renderAnnouncements(state) {
  const rows = searchItems(withinCommunity(state.announcements, state.communityId), state.query, ['title','body','category']);
  return `<div class="announcement-grid">${rows.map((item) => `<article class="notice-card"><div class="notice-top"><span class="notice-category">${icon('bell', 14)} ${h(item.category)}</span><span>${h(formatDate(item.date))}</span></div><h2>${h(item.title)}</h2><p>${h(item.body)}</p><div class="notice-bottom">${communityPill(item.communityId)}<small>${h(item.audience)}</small></div></article>`).join('')}</div>${rows.length ? '' : emptyState()}`;
}

function renderDocuments(state) {
  const rows = searchItems(withinCommunity(documents, state.communityId), state.query, ['name','category','scope']);
  return `<section class="panel wide-panel">${cardHeader('Biblioteca de documentos', 'Archivos representados como ejemplos, sin descargas disponibles', `<span class="mini-tag">${rows.length} DOCUMENTOS</span>`)}<div class="document-grid">${rows.map((item) => `<article class="document-row"><span class="document-icon">${icon('file', 22)}</span><div><strong>${h(item.name)}</strong><small>${h(item.category)} · ${h(getCommunityName(communities, item.communityId))}</small></div><span class="doc-size">${h(item.size)}</span><span class="doc-lock" title="Sin archivo real" aria-label="Archivo no disponible">${icon('lock', 17)}</span></article>`).join('')}</div>${rows.length ? '' : emptyState()}</section>`;
}

function renderSettings() {
  const rows = [
    ['Mercado inicial', 'Chile, Venezuela u otro mercado', 'Pendiente de aprobación'],
    ['Marca comercial', 'Digi-Condominio es un identificador técnico', 'Pendiente de aprobación'],
    ['Proveedor de infraestructura', 'Sin proveedor ni despliegue configurados', 'No definido'],
    ['Autenticación y permisos', 'Requieren backend y aislamiento multi-tenant', 'No implementado'],
    ['Pagos e integraciones', 'Sin pasarela ni almacenamiento de comprobantes', 'No implementado'],
  ];
  return `<div class="settings-grid"><section class="panel">${cardHeader('Decisiones del proyecto', 'No se asumirán decisiones pendientes')}<div class="decision-list">${rows.map(([name, desc, state]) => `<div class="decision-row"><div><strong>${h(name)}</strong><span>${h(desc)}</span></div><em>${h(state)}</em></div>`).join('')}</div></section><section class="panel security-panel"><div class="security-symbol">${icon('shield', 29)}</div><h2>Privacidad desde el inicio</h2><p>Esta versión funciona sin API, sin sesiones, sin cookies y sin persistencia. Todos los datos son demostrativos.</p><div class="security-feature">${icon('check', 17)} Repositorio GitHub privado</div><div class="security-feature">${icon('check', 17)} Sin datos personales reales</div><div class="security-feature">${icon('check', 17)} Sin conexiones externas</div><div class="security-feature future">${icon('clock', 17)} Autorización y auditoría: pendientes</div></section></div>`;
}

function announcementModal(state) {
  return `<div class="modal-backdrop" data-action="close-modal" aria-hidden="true"></div><div class="modal-host"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><span>CREACIÓN LOCAL</span><h2 id="modal-title">Nuevo comunicado demo</h2></div><button class="icon-button" data-action="close-modal" aria-label="Cerrar">${icon('close', 20)}</button></div><form id="announcement-form"><p>Se mostrará en esta sesión del navegador, sin guardarse ni enviarse a nadie.</p><label>Título <input name="title" maxlength="90" required placeholder="Ej.: Aviso de mantenimiento" /></label><label>Comunidad <select name="communityId" required>${communities.map((item) => `<option value="${item.id}" ${state.communityId === item.id ? 'selected' : ''}>${h(item.name)}</option>`).join('')}</select></label><label>Descripción <textarea name="body" rows="4" maxlength="400" required placeholder="Describe el aviso de prueba..."></textarea></label><div class="modal-footer"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button type="submit" class="primary-button">${icon('check', 16)} Añadir aviso demo</button></div></form></section></div>`;
}

export function renderPage(state) {
  const content = ({
    dashboard: dashboard,
    communities: renderCommunities,
    units: renderUnits,
    payments: renderPayments,
    announcements: renderAnnouncements,
    documents: renderDocuments,
    settings: renderSettings,
  }[state.page] ?? dashboard)(state);
  return shell(state, content);
}
