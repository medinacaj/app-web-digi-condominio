import test from 'node:test';
import assert from 'node:assert/strict';
import { communities, units, payments, initialAnnouncements } from '../src/demo-data.js';
import { escapeHtml, withinCommunity, searchItems, summaryFor, statusType, formatMoney } from '../src/domain.js';
import { renderPage } from '../src/ui.js';

test('filtra comunidades sin mezclar unidades de otra comunidad', () => {
  const filtered = withinCommunity(units, 'aurora');
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((item) => item.communityId === 'aurora'));
  assert.equal(withinCommunity(units, 'all').length, units.length);
});

test('suma solo pagos confirmados para la comunidad seleccionada', () => {
  const overview = summaryFor(communities, units, payments, 'aurora');
  assert.equal(overview.confirmed, 164000);
  assert.equal(overview.communities, 1);
  assert.equal(overview.units, 64);
  assert.equal(overview.pendingUnits, 2);
});

test('busca sin distinción de mayúsculas y evita mutar el origen', () => {
  const selected = searchItems(units, 'residente demo 02', ['resident']);
  assert.deepEqual(selected.map((unit) => unit.code), ['A-102']);
  assert.equal(searchItems(units, '', ['code']).length, units.length);
});

test('escapa HTML de títulos creados por el usuario', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('los estados y montos tienen formato explícito de demostración', () => {
  assert.equal(statusType('En revisión'), 'review');
  assert.equal(statusType('Al día'), 'success');
  assert.match(formatMoney(125000), /^UM /);
});

test('genera las seis vistas con la advertencia de datos ficticios', () => {
  const base = { communityId: 'all', sidebarOpen: false, query: '', modal: false, announcements: [...initialAnnouncements] };
  for (const page of ['dashboard','communities','units','payments','announcements','documents','settings']) {
    const html = renderPage({ ...base, page });
    assert.match(html, /Vista de demostración/);
    assert.match(html, /Sin conexión a producción/);
    assert.ok(html.includes('main-content'));
  }
});

test('renderiza contenido sintético sin inyectar HTML en los avisos', () => {
  const html = renderPage({ communityId: 'all', sidebarOpen: false, query: '', modal: false, page: 'announcements', announcements: [{ ...initialAnnouncements[0], title: '<img src=x onerror=alert(1)>' }] });
  assert.ok(!html.includes('<img src=x onerror='));
  assert.ok(html.includes('&lt;img src=x'));
});
