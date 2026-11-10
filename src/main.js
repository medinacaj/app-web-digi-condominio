import { communities, initialAnnouncements } from './demo-data.js';
import { renderPage } from './ui.js';

const app = document.getElementById('app');
const state = {
  page: 'dashboard',
  communityId: 'all',
  sidebarOpen: false,
  query: '',
  modal: false,
  announcements: initialAnnouncements.map((item) => ({ ...item })),
};
let lastFocus = null;

function paint() { app.innerHTML = renderPage(state); }
function navigate(page) {
  state.page = page;
  state.query = '';
  state.sidebarOpen = false;
  paint();
  document.getElementById('main-content')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

app.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { navigate(nav.dataset.nav); return; }
  const community = event.target.closest('[data-community]');
  if (community) { state.communityId = community.dataset.community; navigate('dashboard'); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'new-announcement') {
    lastFocus = document.activeElement;
    state.modal = true;
    paint();
    document.querySelector('[name="title"]')?.focus();
  }
  if (action === 'close-modal') {
    state.modal = false;
    paint();
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  if (action === 'menu-open') { state.sidebarOpen = true; paint(); }
  if (action === 'menu-close') { state.sidebarOpen = false; paint(); }
});

app.addEventListener('change', (event) => {
  if (event.target.id !== 'community-select') return;
  const selected = event.target.value;
  if (selected !== 'all' && !communities.some((item) => item.id === selected)) return;
  state.communityId = selected;
  paint();
});

app.addEventListener('input', (event) => {
  if (event.target.id !== 'record-search') return;
  const position = event.target.selectionStart;
  state.query = event.target.value;
  paint();
  const search = document.getElementById('record-search');
  if (search) { search.focus(); search.setSelectionRange(position, position); }
});

app.addEventListener('submit', (event) => {
  if (event.target.id !== 'announcement-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  const title = String(data.get('title') ?? '').trim();
  const body = String(data.get('body') ?? '').trim();
  const communityId = String(data.get('communityId') ?? '');
  if (!title || !body || !communities.some((item) => item.id === communityId)) return;
  state.announcements.unshift({
    id: `A-local-${state.announcements.length + 1}`,
    communityId, title: title.slice(0, 90), body: body.slice(0, 400),
    category: 'Información', audience: 'Toda la comunidad', date: '2026-10-25',
  });
  state.modal = false;
  state.communityId = communityId;
  navigate('announcements');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.modal) { state.modal = false; paint(); if (lastFocus?.isConnected) lastFocus.focus(); }
  if (event.key === 'Escape' && state.sidebarOpen) { state.sidebarOpen = false; paint(); }
  if (event.key === 'Tab' && state.modal) {
    const buttons = Array.from(document.querySelectorAll('.modal button, .modal input, .modal select, .modal textarea')).filter((el) => !el.disabled);
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

paint();
