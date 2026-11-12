// Calendar-only dates in UTC; never rely on Date.parse normalization.
export function strictUtcDay(value){
  if(typeof value!=='string'||!/^20[2-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value))return null;
  const timestamp=Date.parse(value+'T00:00:00.000Z');
  if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==value)return null;
  return value;
}
export function addUtcDays(day,count){
  if(!strictUtcDay(day)||!Number.isInteger(count)||Math.abs(count)>366)throw new RangeError('Fecha UTC inválida');
  const epoch=Date.parse(day+'T00:00:00.000Z');
  return new Date(epoch+count*86_400_000).toISOString().slice(0,10);
}
export const utcToday=()=>new Date().toISOString().slice(0,10);
