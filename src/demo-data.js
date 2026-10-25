/**
 * Datos totalmente ficticios: no contienen información de comunidades, inmuebles
 * ni personas reales. No están conectados a servicios externos ni a bases de datos.
 */
export const communities = Object.freeze([
  { id: 'aurora', name: 'Residencial Aurora', address: 'Sector demostrativo Norte', units: 64, active: 52, color: '#5a8def', initials: 'RA' },
  { id: 'encuentro', name: 'Edificio Encuentro', address: 'Sector demostrativo Centro', units: 42, active: 39, color: '#26b6a5', initials: 'EE' },
  { id: 'mirador', name: 'Condominio Mirador', address: 'Sector demostrativo Sur', units: 84, active: 71, color: '#a17df3', initials: 'CM' },
]);

export const units = Object.freeze([
  { id: 'u001', communityId: 'aurora', code: 'A-101', kind: 'Departamento', resident: 'Residente Demo 01', status: 'Al día', balance: 0 },
  { id: 'u002', communityId: 'aurora', code: 'A-102', kind: 'Departamento', resident: 'Residente Demo 02', status: 'Pendiente', balance: 78000 },
  { id: 'u003', communityId: 'aurora', code: 'B-205', kind: 'Departamento', resident: 'Residente Demo 03', status: 'Al día', balance: 0 },
  { id: 'u004', communityId: 'aurora', code: 'B-307', kind: 'Departamento', resident: 'Residente Demo 04', status: 'Pendiente', balance: 126000 },
  { id: 'u005', communityId: 'encuentro', code: '101', kind: 'Departamento', resident: 'Residente Demo 05', status: 'Al día', balance: 0 },
  { id: 'u006', communityId: 'encuentro', code: '305', kind: 'Departamento', resident: 'Residente Demo 06', status: 'Pendiente', balance: 68000 },
  { id: 'u007', communityId: 'encuentro', code: '402', kind: 'Departamento', resident: 'Residente Demo 07', status: 'Al día', balance: 0 },
  { id: 'u008', communityId: 'mirador', code: 'C-014', kind: 'Casa', resident: 'Residente Demo 08', status: 'Al día', balance: 0 },
  { id: 'u009', communityId: 'mirador', code: 'C-028', kind: 'Casa', resident: 'Residente Demo 09', status: 'Pendiente', balance: 154000 },
  { id: 'u010', communityId: 'mirador', code: 'D-032', kind: 'Casa', resident: 'Residente Demo 10', status: 'Al día', balance: 0 },
]);

export const payments = Object.freeze([
  { id: 'P-1008', communityId: 'aurora', unit: 'A-101', concept: 'Cuota ordinaria · octubre', date: '2026-10-23', amount: 82000, status: 'Confirmado' },
  { id: 'P-1007', communityId: 'mirador', unit: 'C-014', concept: 'Cuota ordinaria · octubre', date: '2026-10-22', amount: 96000, status: 'Confirmado' },
  { id: 'P-1006', communityId: 'encuentro', unit: '305', concept: 'Cuota ordinaria · octubre', date: '2026-10-21', amount: 68000, status: 'Pendiente' },
  { id: 'P-1005', communityId: 'aurora', unit: 'B-205', concept: 'Cuota ordinaria · octubre', date: '2026-10-20', amount: 82000, status: 'Confirmado' },
  { id: 'P-1004', communityId: 'mirador', unit: 'C-028', concept: 'Cuota extraordinaria', date: '2026-10-19', amount: 54000, status: 'En revisión' },
  { id: 'P-1003', communityId: 'encuentro', unit: '101', concept: 'Cuota ordinaria · octubre', date: '2026-10-18', amount: 68000, status: 'Confirmado' },
]);

export const initialAnnouncements = Object.freeze([
  { id: 'A-01', communityId: 'aurora', title: 'Mantenimiento preventivo de ascensores', date: '2026-10-24', audience: 'Toda la comunidad', category: 'Mantenimiento', body: 'Se informa una mantención programada en las áreas comunes.' },
  { id: 'A-02', communityId: 'encuentro', title: 'Actualización de horario de atención', date: '2026-10-22', audience: 'Toda la comunidad', category: 'Información', body: 'Horario actualizado de atención administrativa.' },
  { id: 'A-03', communityId: 'mirador', title: 'Consulta de estado de cuenta disponible', date: '2026-10-18', audience: 'Propietarios', category: 'Finanzas', body: 'Los comprobantes demostrativos se encuentran disponibles.' },
]);

export const documents = Object.freeze([
  { id: 'D-01', communityId: 'aurora', name: 'Reglamento de convivencia — demo.pdf', category: 'Reglamentos', date: '2026-10-20', scope: 'Comunidad', size: '128 KB' },
  { id: 'D-02', communityId: 'aurora', name: 'Resumen de gastos — demo.pdf', category: 'Finanzas', date: '2026-10-18', scope: 'Comité', size: '82 KB' },
  { id: 'D-03', communityId: 'encuentro', name: 'Acta de reunión — demo.pdf', category: 'Actas', date: '2026-10-16', scope: 'Comité', size: '94 KB' },
  { id: 'D-04', communityId: 'mirador', name: 'Circular informativa — demo.pdf', category: 'Avisos', date: '2026-10-12', scope: 'Comunidad', size: '66 KB' },
]);

export const monthlyTrend = Object.freeze([
  { month: 'May', billed: 440, collected: 364 },
  { month: 'Jun', billed: 515, collected: 432 },
  { month: 'Jul', billed: 490, collected: 420 },
  { month: 'Ago', billed: 570, collected: 492 },
  { month: 'Sep', billed: 540, collected: 459 },
  { month: 'Oct', billed: 610, collected: 520 },
]);
