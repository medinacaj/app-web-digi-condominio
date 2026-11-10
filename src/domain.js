/** Pure helpers: demo presentation, not financial accounting or legal calculations. */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export const formatMoney = (amount) => `UM ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(amount)}`;

export const formatDate = (iso) => new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

export function withinCommunity(items, communityId) {
  return communityId === 'all' ? [...items] : items.filter((item) => item.communityId === communityId);
}

export function searchItems(items, query, fields) {
  const needle = String(query).toLocaleLowerCase('es').trim();
  if (!needle) return [...items];
  return items.filter((item) => fields.some((field) => String(item[field] ?? '').toLocaleLowerCase('es').includes(needle)));
}

export function summaryFor(communities, units, payments, communityId) {
  const communityList = communityId === 'all' ? communities : communities.filter((item) => item.id === communityId);
  const selection = withinCommunity(units, communityId);
  const selectedPayments = withinCommunity(payments, communityId);
  return {
    communities: communityList.length,
    units: communityList.reduce((sum, item) => sum + item.units, 0),
    active: communityList.reduce((sum, item) => sum + item.active, 0),
    outstanding: selection.reduce((sum, item) => sum + item.balance, 0),
    pendingUnits: selection.filter((item) => item.balance > 0).length,
    confirmed: selectedPayments.filter((item) => item.status === 'Confirmado').reduce((sum, item) => sum + item.amount, 0),
    reviewed: selectedPayments.filter((item) => item.status === 'En revisión').length,
    paidCount: selectedPayments.filter((item) => item.status === 'Confirmado').length,
    sampleCount: selection.length,
  };
}

export function statusType(status) {
  if (['Confirmado', 'Al día'].includes(status)) return 'success';
  if (status === 'En revisión') return 'review';
  return 'pending';
}

export function getCommunityName(communities, id) {
  return communities.find((item) => item.id === id)?.name ?? 'Comunidad no encontrada';
}
