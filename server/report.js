/** UTF-8 CSV reports; neutralize spreadsheet formula execution on cell import. */
export function csvCell(value){
  const str=String(value??'');
  const safe=/^[\s\u0000-\u001f]*[=+\-@]/u.test(str)?`'${str}`:str;
  return `"${safe.replaceAll('"','""')}"`;
}
export function csv(headers,records){
  return '\uFEFF'+[headers,...records].map(line=>line.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function report(store,userId,communityId,section){
  store.requireAdmin(userId,communityId);
  const d=store.overview(userId,communityId);
  const reports={
    units:{headers:['Código','Tipo','Ocupante','Saldo en centésimas UM'],data:d.units.map(x=>[x.code,x.kind,x.resident,x.balanceMinor])},
    charges:{headers:['Unidad','Periodo','Concepto','Importe en centésimas UM','Estado','Motivo anulación','Registrado'],data:d.charges.map(x=>[x.unit,x.period,x.concept,x.amountMinor,x.reversed?'Anulado':'Activo',x.reverseReason??'',x.createdAt])},
    payments:{headers:['Unidad','Referencia','Concepto','Importe en centésimas UM','Estado','Motivo anulación','Registrado'],data:d.payments.map(x=>[x.unit,x.reference,x.concept,x.amountMinor,x.reversed?'Anulado':'Activo',x.reverseReason??'',x.createdAt])},
    providers:{headers:['Nombre','Rubro','Registrado'],data:d.providers.map(x=>[x.name,x.category,x.createdAt])},
    expenses:{headers:['Proveedor','Periodo','Concepto','Importe en centésimas UM','Registrado'],data:d.expenses.map(x=>[x.provider,x.period,x.concept,x.amountMinor,x.createdAt])}
  };
  if(!Object.hasOwn(reports,section))return null;
  return csv(reports[section].headers,reports[section].data);
}
