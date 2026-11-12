import { escapeHtml as h } from './domain.js';
const app=document.getElementById('app');
const money=(n)=>`UM ${(n/100).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(v)=>new Date(v).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'});
const icons={dashboard:'▦',units:'⌂',directory:'▤',charges:'≡',payments:'▤',paymentReports:'◇',announcements:'◉',notifications:'✉',documents:'▣',audit:'◎',providers:'◇',expenses:'▥',incidents:'⚑',account:'⚙'};
const names={dashboard:'Resumen',units:'Unidades',directory:'Directorio',charges:'Cuotas',payments:'Pagos',paymentReports:'Pagos informados',announcements:'Comunicados',notifications:'Notificaciones',documents:'Documentos',audit:'Auditoría',providers:'Proveedores',expenses:'Gastos',incidents:'Incidencias',account:'Gestión de cuenta'};
const state={token:null,user:null,communities:[],selected:null,data:null,page:'dashboard',modal:null,busy:false,error:'',query:'',menuOpen:false,reverseTarget:null,incidentTarget:null,ownerTarget:null,personTarget:null,directoryUnit:null,directory:null,directoryBusy:false,members:[],accounts:[],accountId:null,accountData:null,loading:false,csrf:null,notice:"",identityFlow:null,identityLogin:false,subscription:null,quote:null,reminderPreview:null,communicationConsent:null,paymentReports:[],reportDecisionTarget:null};
function takeIdentityFragment(){
  const fragment=new URLSearchParams(location.hash.slice(1));
  for(const type of ['reset','invite'])if(fragment.has(type)){
    state.identityFlow={type,token:fragment.get(type)};state.identityLogin=false;
    history.replaceState(null,'',location.pathname+location.search);return true;
  }
  return false;
}
takeIdentityFragment();
let generation=0;
class ContextChanged extends Error {}
const isAccountAdmin=()=>state.accounts.find(a=>a.id===state.accountId)?.role==='account_admin';
function clearContext(){generation++;state.data=null;state.accountData=null;state.members=[];state.modal=null;state.query='';state.error='';state.notice='';state.subscription=null;state.quote=null;state.page='dashboard';state.menuOpen=false;state.reverseTarget=null;state.ownerTarget=null;state.incidentTarget=null;state.personTarget=null;state.directory=null;state.directoryUnit=null;state.directoryBusy=false;state.reminderPreview=null;state.communicationConsent=null;state.paymentReports=[];state.reportDecisionTarget=null;}
const base=()=>`/api/communities/${state.selected}`;
async function request(path,method='GET',data){
  const token=state.token,revision=generation;
  const response=await fetch(path,{method,cache:'no-store',headers:{...(state.token&&state.token!=='cookie'?{Authorization:`Bearer ${state.token}`} : {}),...(state.csrf&&method!=='GET'?{'X-CSRF-Token':state.csrf}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,credentials:'same-origin'}).catch(error=>{if(token!==state.token||revision!==generation)throw new ContextChanged();throw error;});
  const payload=await response.json().catch(()=>({error:'Respuesta inválida del servidor'}));
  if(token!==state.token||revision!==generation)throw new ContextChanged();
  if(!response.ok)throw new Error(payload.error??`HTTP ${response.status}`);
  return payload;
}
function info(text){return `<div class="live-empty">${h(text)}</div>`;}
function viewLogin(){
  app.innerHTML=`<div class="login-shell"><div class="login-panel"><div class="login-mark">DC</div><p class="login-caption">ACCESO PRIVADO A TU COMUNIDAD</p><h1>Digi<span>Condominio</span></h1><p>Gestiona unidades, cuotas, pagos manuales y comunicaciones con acceso autenticado.</p><form id="login-form"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254" autofocus><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit" class="primary-button" ${state.busy?'disabled':''}>${state.busy?'Validando…':'Ingresar al espacio privado'}</button></form>${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}${state.notice?`<p class="live-info" role="status">${h(state.notice)}</p>`:""}<button type="button" class="secondary-button" data-recovery="1">Olvidé mi contraseña</button><small>Acceso por invitación. Si todavía no tienes cuenta, consulta a tu administrador.</small></div><div class="login-art"><div class="login-tag">GESTIÓN CON TRAZABILIDAD</div><h2>Más claridad para cada comunidad.</h2><p>Información accesible según permisos y movimientos registrados con historial.</p><div class="login-graphic"><div><strong>01</strong><span>Comunidad</span></div><div><strong>02</strong><span>Unidades</span></div><div><strong>03</strong><span>Finanzas</span></div></div></div></div>`;
}
function viewIdentity(){
  const flow=state.identityFlow;
  const titles={request:'Recuperar mi acceso',reset:'Crear nueva contraseña',invite:'Aceptar invitación'};
  const passwordFields=`<label>Nueva contraseña<input type="password" name="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Repetir contraseña<input type="password" name="confirmation" required minlength="12" maxlength="128" autocomplete="new-password"></label>`;
  const fields=flow.type==='request'?'<label>Correo electrónico<input type="email" name="email" maxlength="254" autocomplete="username" required></label>':flow.type==='reset'?passwordFields:state.token?'<p>Se aceptará con la identidad que tiene sesión iniciada. No se cambiará su contraseña.</p>':`<label>Tu nombre<input name="name" required maxlength="100" autocomplete="name"></label>${passwordFields}`;
  const label={request:'Solicitar recuperación',reset:'Guardar nueva contraseña',invite:'Aceptar invitación'}[flow.type];
  app.innerHTML=`<div class="login-shell"><main class="login-panel"><div class="login-mark">DC</div><h1>${titles[flow.type]}</h1><p>${flow.type==='invite'?'El enlace es personal y caduca. Si ya tienes una cuenta, inicia sesión con el correo invitado.':'Nunca compartas enlaces de recuperación ni tu contraseña.'}</p><form id="identity-form">${fields}<button class="primary-button" ${state.busy?'disabled':''}>${label}</button></form>${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}${state.notice?`<p class="live-info" role="status">${h(state.notice)}</p>`:''}${flow.type==='invite'?'<button class="secondary-button" data-identity-login="1">Ya tengo una cuenta</button>':''}<button class="secondary-button" data-identity-back="1">Volver</button></main></div>`;
}
const communityName=()=>state.communities.find(x=>x.id===state.selected)?.name??'Comunidad';
const canWrite=()=>!state.loading&&!state.busy&&state.data?.role==='admin';
const filtered=(items,fields)=>items.filter(x=>fields.some(f=>String(x[f]??'').toLocaleLowerCase('es').includes(state.query.toLocaleLowerCase('es'))));
const heading=()=>names[state.page];
const actions=()=>{
  if(state.loading||state.busy||!state.data)return '';
  if(!canWrite() && state.page!=='incidents' && !(state.data.role==='owner'&&state.page==='paymentReports'))return '';
  const controls={directory:['person','Añadir contacto'],paymentReports:['payment-report','Informar pago'],units:['unit','Añadir unidad'],charges:['charge','Emitir cuota'],payments:['payment','Registrar pago'],announcements:['announcement','Nuevo comunicado'],notifications:['unit-message','Aviso privado por unidad'],documents:['document','Registrar documento'],providers:['provider','Nuevo proveedor'],expenses:['expense','Registrar gasto'],incidents:['incident','Reportar incidencia']};
  if(state.page==='directory'&&(!state.directoryUnit||state.directoryBusy))return '';
  if(state.page==='paymentReports'&&state.data.role!=='owner')return '';
  const action=controls[state.page];return action?`<button class="primary-button" data-new="${action[0]}">+ ${action[1]}</button>`:'';
};
function totals(data){
  return {spent:(data.expenses??[]).reduce((sum,x)=>sum+x.amountMinor,0),charged:data.charges.filter(x=>!x.reversed).reduce((s,x)=>s+x.amountMinor,0),paid:data.payments.filter(x=>!x.reversed).reduce((s,x)=>s+x.amountMinor,0),balance:data.units.reduce((s,x)=>s+(x.balanceMinor??0),0)};
}
function renderDashboard(data){
  const t=totals(data);
  return `<div class="live-kpis"><article><span>Unidades visibles</span><strong>${data.units.length}</strong><small>Acceso definido por tu rol</small></article><article><span>Cuotas emitidas</span><strong>${data.role==='committee'?'Restringido':money(t.charged)}</strong><small>Registros inmutables</small></article><article><span>Pagos registrados</span><strong>${data.role==='committee'?'Restringido':money(t.paid)}</strong><small>Registro manual</small></article><article><span>Saldo neto</span><strong>${data.role==='committee'?'Restringido':money(t.balance)}</strong><small>Cuotas menos pagos</small></article>${data.role==='admin'?`<article><span>Gastos registrados</span><strong>${money(t.spent)}</strong><small>Libro de gastos</small></article>`:''}<article><span>Incidencias abiertas</span><strong>${(data.incidents??[]).filter(x=>!['closed','resolved'].includes(x.status)).length}</strong><small>Reportes visibles por tu rol</small></article></div><div class="live-columns"><section class="live-card"><div class="live-card-title"><h2>Unidades</h2><button data-page="units">Ver todas</button></div>${renderUnits(data,true)}</section><section class="live-card"><div class="live-card-title"><h2>Comunicados recientes</h2><button data-page="announcements">Ver todos</button></div>${renderAnnouncements(data,true)}</section></div>`;
}
function renderUnits(data,small=false){
  const list=small?data.units.slice(0,5):filtered(data.units,['code','kind','resident']);
  if(!list.length)return info('No hay unidades visibles.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Tipo</th><th>Ocupante</th>${data.role==='committee'? '':'<th>Saldo</th>'}${data.role==='admin'&&!small?'<th>Propietario</th>':''}</tr></thead><tbody>${list.map(x=>`<tr><td><strong>${h(x.code)}</strong></td><td>${h(x.kind)}</td><td>${h(x.resident||'Sin información')}</td>${data.role==='committee'?'':`<td class="money">${money(x.balanceMinor)}</td>`}${data.role==='admin'&&!small?`<td><span class="owner-display">${h(state.members.find(m=>m.id===x.ownerUserId)?.displayName??'Sin asignar')}</span><button class="owner-link" data-unit-owner="${h(x.id)}">Cambiar</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function renderReminderControls(data){
  if(data.role!=='admin')return '';
  const preview=state.reminderPreview;
  let html='<section class="live-card" aria-label="Recordatorios internos de cuotas"><h2>Recordatorios privados de vencimiento</h2>';
  html+='<p>La administración revisa primero las unidades con saldo positivo y cuotas con fecha de vencimiento explícita. Se consideran cinco días próximos o vencimiento transcurrido. No se envía ningún mensaje externo ni se afirma pago bancario confirmado.</p>';
  html+='<button type="button" class="secondary-button" data-reminder-preview="1">Previsualizar recordatorios</button>';
  if(preview){
    html+='<p><strong>'+preview.pending+' avisos pendientes de preparar</strong> de '+preview.eligible.length+' unidades elegibles (fecha UTC '+h(preview.asOf)+').</p>';
    if(preview.eligible.length){
      html+='<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Vence</th><th>Situación</th><th>Saldo administrativo</th><th>Aviso</th></tr></thead><tbody>';
      html+=preview.eligible.map(x=>'<tr><td>'+h(x.unit)+'</td><td>'+h(x.dueOn)+'</td><td>'+(x.stage==='overdue'?'Fecha transcurrida':'Próximo vencimiento')+'</td><td class="money">'+money(x.balanceMinor)+'</td><td>'+(x.alreadyQueued?'Ya preparado':'Pendiente')+'</td></tr>').join('');
      html+='</tbody></table></div>';
    }else html+='<p>No hay recordatorios elegibles: puede faltar fecha de vencimiento, propietario vinculado o saldo pendiente.</p>';
    if(preview.pending>0)html+='<button type="button" class="primary-button" data-reminder-prepare="1">Guardar '+preview.pending+' aviso(s) internos</button>';
  }
  html+='<p><small>Preparación manual y deduplicada por propietario y vencimiento. No programa envíos automáticos. Los pagos son registros administrativos sujetos a revisión.</small></p></section>';
  return html;
}
function renderCharges(data){
  if(data.role==='committee')return info('La información financiera está restringida para este rol.');
  const list=filtered(data.charges,['unit','concept','period']);
  if(!list.length)return renderReminderControls(data)+info('No se han emitido cuotas.');
  return renderReminderControls(data)+`<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Periodo</th><th>Vencimiento</th><th>Concepto</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${list.map(x=>`<tr class="${x.reversed?'live-void':''}"><td>${h(x.unit)}</td><td>${h(x.period)}</td><td>${h(x.dueOn??'Sin fecha')}</td><td>${h(x.concept)}</td><td class="money">${money(x.amountMinor)}</td><td>${x.reversed?`<span title="${h(x.reverseReason??'Anulado')}">Anulado</span>`:'Activo'}</td><td>${canWrite()&&!x.reversed?`<button class="live-reverse" data-reverse-type="charges" data-reverse-id="${h(x.id)}">Anular</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderPayments(data){
  if(data.role==='committee')return info('La información financiera está restringida para este rol.');
  const list=filtered(data.payments,['unit','reference','concept']);
  if(!list.length)return info('No se han registrado pagos.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Referencia</th><th>Concepto</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${list.map(x=>`<tr class="${x.reversed?'live-void':''}"><td>${h(x.unit)}</td><td><strong>${h(x.reference)}</strong></td><td>${h(x.concept)}</td><td class="money">${money(x.amountMinor)}</td><td>${x.reversed?`<span title="${h(x.reverseReason??'Anulado')}">Anulado</span>`:'Activo'}</td><td>${canWrite()&&!x.reversed?`<button class="live-reverse" data-reverse-type="payments" data-reverse-id="${h(x.id)}">Anular</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderAnnouncements(data,small=false){
  const list=small?data.announcements.slice(0,4):filtered(data.announcements,['title','body']);
  if(!list.length)return info('No hay comunicados para esta comunidad.');
  return `<div class="live-notices">${list.map(x=>`<article class="live-notice"><div class="live-notice-symbol">◉</div><div><h3>${h(x.title)}</h3><p>${h(x.body)}</p><small>${date(x.createdAt)}</small></div></article>`).join('')}</div>`;
}

const directoryRelationship={resident:'Residente',tenant:'Arrendatario',authorized:'Persona autorizada',emergency:'Contacto de emergencia'};
const directoryChannel={none:'Sin canal',email:'Correo (no verificado)',sms:'SMS (no verificado)',whatsapp:'WhatsApp (no verificado)'};
function renderDirectory(data){
  if(data.role!=='admin')return info('El directorio es privado y exclusivo de la administración.');
  if(!data.units.length)return info('Registra un departamento antes de usar el directorio.');
  const unit=state.directoryUnit??data.units[0].id,view=state.directory;
  const options=data.units.map(u=>"<option value='"+h(u.id)+"' "+(u.id===unit?'selected':'')+">"+h(u.code)+"</option>").join('');
  const head="<div class='live-card'><h2>Personas por departamento</h2><p>El propietario con acceso al portal se administra en «Unidades». Los demás contactos NO tienen acceso a finanzas ni reciben mensajes externos automáticamente.</p><label for='directory-unit-select'>Departamento</label><select id='directory-unit-select' class='live-community-select' aria-label='Departamento del directorio'>"+options+"</select>";
  if(state.directoryBusy)return head+info('Cargando directorio privado…')+"</div>";
  if(!view)return head+info('Selecciona una unidad para consultar sus personas vinculadas.')+"</div>";
  const owner=view.owner;
  const ownerText=owner?h(owner.displayName)+" ("+h(owner.email)+")":'Sin propietario vinculado';
  const list=filtered(view.contacts??[],['fullName','relationship','email','phone']);
  const tableRows=list.map(c=>"<tr class='"+(c.inactiveAt?'live-void':'')+"'><td><strong>"+h(c.fullName)+"</strong></td><td>"+h(directoryRelationship[c.relationship]??c.relationship)+"</td><td>"+h(c.email??c.phone??'Sin datos de contacto')+"<small style='display:block'>"+h(directoryChannel[c.contactPreference]??'Sin canal')+"</small></td><td>"+(c.paymentResponsible?'Contacto para pagos':'No')+"</td><td>"+(c.inactiveAt?'Inactivo':'Activo')+"</td><td>"+(c.inactiveAt?'—':"<button type='button' class='secondary-button' data-person-edit='"+h(c.id)+"'>Editar</button><button type='button' class='secondary-button' data-person-deactivate='"+h(c.id)+"'>Dar de baja</button>")+"</td></tr>").join('');
  const table=list.length?"<div class='live-table-wrap'><table class='live-table'><thead><tr><th>Nombre</th><th>Vínculo</th><th>Contacto</th><th>Pago</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>"+tableRows+"</tbody></table></div>":info('No hay personas vinculadas o ninguna coincide con la búsqueda.');
  return head+"<p><strong>Propietario vinculado:</strong> "+ownerText+"</p><p>Las preferencias son referencias administrativas, NO consentimientos verificados para envíos.</p>"+table+"</div>";
}
function unitPersonFields(person=null){
  const p=person??{};
  const option=(id,label,current)=>"<option value='"+h(id)+"' "+(current===id?'selected':'')+">"+h(label)+"</option>";
  const relationship=Object.entries(directoryRelationship).map(([k,v])=>option(k,v,p.relationship??'resident')).join('');
  const preference=Object.entries(directoryChannel).map(([k,v])=>option(k,v,p.contactPreference??'none')).join('');
  return "<p>Datos privados para administración. No se enviarán correos ni mensajes. Una preferencia NO constituye autorización verificada.</p>"+
    "<label>Nombre completo<input name='fullName' maxlength='100' required value='"+h(p.fullName??'')+"'></label>"+
    "<label>Relación con la unidad<select name='relationship'>"+relationship+"</select></label>"+
    "<label>Correo opcional<input type='email' name='email' autocomplete='off' maxlength='254' value='"+h(p.email??'')+"'></label>"+
    "<label>Teléfono internacional opcional<input name='phone' inputmode='tel' placeholder='+56912345678' maxlength='20' value='"+h(p.phone??'')+"'></label>"+
    "<label>Contacto para gestiones de pago<select name='paymentResponsible'>"+option('false','No',String(p.paymentResponsible??false))+option('true','Sí',String(p.paymentResponsible??false))+"</select></label>"+
    "<label>Canal de preferencia, sin envío<select name='contactPreference'>"+preference+"</select></label>";
}
function renderConsentSettings(data){
  if(data.role!=='owner')return '';
  const entries=state.communicationConsent?.entries??[];
  const labels={billing_updates:'Avisos de cuotas y pagos',community_news:'Comunicados de la comunidad'};
  const options=Object.entries(labels).map(([purpose,title])=>{
    const saved=entries.find(entry=>entry.purpose===purpose&&entry.channel==='email');
    const enabled=Boolean(saved?.enabled);
    return `<div class="live-consent-row"><div><strong>${h(title)}</strong><small style="display:block">Preferencia de correo no verificado; no se envían correos en el piloto.</small></div><button type="button" class="secondary-button" data-consent-purpose="${purpose}" data-consent-enabled="${enabled?'false':'true'}" aria-pressed="${enabled}">${enabled?'Retirar autorización':'Autorizar futuros correos'}</button></div>`;
  }).join('');
  return `<section class="live-card" aria-label="Preferencias voluntarias de comunicaciones"><h2>Autorizaciones de comunicación</h2><p>Estas preferencias se guardan con tu sesión e historial de cambios. <strong>No verifican tu dirección de correo</strong> ni activan el envío. Los avisos internos del portal permanecen disponibles aunque rechaces correos.</p>${options}</section>`;
}
const paymentStatusLabels={informado:'Informado',en_revision:'En revisión',confirmado:'Confirmado por administración',rechazado:'Rechazado',reversado:'Reversado'};
function renderPaymentReports(data){
  if(!['admin','owner'].includes(data.role))return info('No tienes permiso para ver reportes de pago.');
  const entries=filtered(state.paymentReports??[],['reference','concept','unit','status']);
  const note='<section class="live-card"><h2>Reportes de pago</h2><p>El propietario informa un pago sin reducir automáticamente su saldo. Solo la administración puede revisar y posteriormente registrar el abono. «Confirmado» significa <strong>registrado tras revisión administrativa</strong>, no conciliación bancaria automática.</p></section>';
  if(!entries.length)return note+info('No hay reportes de pagos para mostrar.');
  const actions=report=>{
    if(data.role!=='admin')return '—';
    const buttons={informado:[['review','Enviar a revisión']],en_revision:[['confirm','Registrar abono tras revisión'],['reject','Rechazar']],confirmado:[['reverse','Reversar abono']],rechazado:[],reversado:[]}[report.status]??[];
    return buttons.map(([kind,title])=>`<button class="secondary-button" type="button" data-report-decision="${h(report.id)}" data-report-action="${kind}">${h(title)}</button>`).join('')||'—';
  };
  return note+`<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Referencia</th><th>Concepto</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${entries.map(x=>`<tr><td>${h(x.unit)}</td><td>${h(x.reference)}</td><td>${h(x.concept)}</td><td class="money">${money(x.amountMinor)}</td><td>${h(paymentStatusLabels[x.status]??x.status)}</td><td>${actions(x)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderNotifications(data){
  if(data.role==='admin')return info('Los mensajes privados se almacenan en la bandeja del propietario asignado. Usa «Aviso privado por unidad» para crear uno. No se envían correos ni WhatsApp.');
  if(data.role!=='owner')return info('Esta bandeja solo está disponible para propietarios autorizados.');
  const list=filtered(data.notifications??[],['title','body','unit']);
  if(!list.length)return renderConsentSettings(data)+info('No tienes notificaciones privadas para tus departamentos.');
  return renderConsentSettings(data)+`<div class="live-notices">${list.map(x=>`<article class="live-notice"><div class="live-notice-symbol" aria-hidden="true">✉</div><div><h3>${h(x.title)}</h3><p>${h(x.body)}</p><small>Departamento ${h(x.unit)} · ${date(x.createdAt)} · ${x.readAt?'Leída':'No leída'}</small>${x.readAt?'':`<button type="button" class="secondary-button" data-notification-read="${h(x.id)}" aria-label="Marcar como leída: ${h(x.title)}">Marcar como leída</button>`}</div></article>`).join('')}</div>`;
}
function renderDocuments(data){
  const list=filtered(data.documents,['title','category','scope']);
  if(!list.length)return info('No hay documentos visibles para tu perfil.');
  return `<div class="live-notices">${list.map(x=>`<article class="live-notice"><div class="live-notice-symbol">▣</div><div><h3>${h(x.title)}</h3><p>${h(x.category)} · Visibilidad: ${h(x.scope)}</p><small>Solo ficha de documento; todavía no se permite subir ni descargar archivos</small></div></article>`).join('')}</div>`;
}
function renderProviders(data){
  const list=filtered(data.providers??[],['name','category']);
  if(!list.length)return info('No hay proveedores registrados.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Proveedor</th><th>Rubro</th><th>Registrado</th></tr></thead><tbody>${list.map(x=>`<tr><td><strong>${h(x.name)}</strong></td><td>${h(x.category)}</td><td>${date(x.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderExpenses(data){
  const list=filtered(data.expenses??[],['provider','concept','period']);
  if(!list.length)return info('No hay gastos registrados.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Proveedor</th><th>Periodo</th><th>Concepto</th><th>Importe</th><th>Registrado</th></tr></thead><tbody>${list.map(x=>`<tr><td><strong>${h(x.provider)}</strong></td><td>${h(x.period)}</td><td>${h(x.concept)}</td><td class="money">${money(x.amountMinor)}</td><td>${date(x.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
}

const incidentLabels={open:'Abierta',in_progress:'En atención',resolved:'Resuelta',closed:'Cerrada'};
const priorityLabels={low:'Baja',normal:'Normal',high:'Alta',urgent:'Urgente'};
const categoryLabels={maintenance:'Mantenimiento',security:'Seguridad',cleaning:'Limpieza',noise:'Ruidos',other:'Otros'};
function renderIncidents(data){
  const list=filtered(data.incidents??[],['title','detail','category','status','unit']);
  if(!list.length)return info('No hay incidencias visibles. Usa «Reportar incidencia» para registrar una.');
  return `<div class="incident-list">${list.map(x=>`<article class="incident-card" data-inc-card="${h(x.id)}"><div class="incident-top"><span class="incident-priority ${h(x.priority)}">${h(priorityLabels[x.priority]??x.priority)}</span><span class="incident-state">${h(incidentLabels[x.status]??x.status)}</span></div><h2>${h(x.title)}</h2><div class="incident-meta">${h(categoryLabels[x.category]??x.category)} · ${h(x.unit||'Área común')} · ${date(x.createdAt)}</div><p>${h(x.detail)}</p><div class="incident-history"><strong>Seguimiento (${x.updates.length})</strong>${x.updates.map(u=>`<div class="incident-entry"><b>${h(u.author)}</b> <small>${date(u.createdAt)}</small><p>${h(u.note)}</p></div>`).join('')}</div><div class="incident-actions"><button class="secondary-button" data-incident-comment="${h(x.id)}">Comentar</button>${canWrite()?`<button class="primary-button" data-incident-status="${h(x.id)}">Cambiar estado</button>`:''}</div></article>`).join('')}</div>`;
}
function renderAudit(data){
  if(data.role!=='admin')return info('Registro reservado a la administración.');
  if(!data.audit.length)return info('Aún no hay movimientos auditados.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Acción</th><th>ID del elemento</th><th>Registro</th></tr></thead><tbody>${data.audit.map(x=>`<tr><td>${h(x.action)}</td><td><code>${h(x.entityId)}</code></td><td>${date(x.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderAccount(){
  const d=state.accountData;
  if(!d)return info(state.loading?'Cargando cuenta…':'No tienes permiso para administrar esta cuenta.');
  const memberOptions=d.members.map(m=>`<option value="${h(m.id)}">${h(m.displayName)} (${h(m.email)})</option>`).join('');
  const communityOptions=d.communities.map(c=>`<option value="${h(c.id)}">${h(c.name)}</option>`).join('');
  return `<div class="live-card account-card"><h2>${h(d.account.name)}</h2><p>${d.account.kind==='management_company'?'Empresa administradora':'Condominio independiente'} · ${d.communities.length} condominios</p><p>Administrar la cuenta no da acceso automático a las operaciones de cada condominio. Asigna esos permisos de forma explícita.</p>
  <h3>Tarifa mensual</h3>${state.quote?`<p><strong>US$ ${(state.quote.amountMinor/100).toFixed(2)} al mes</strong> por ${state.quote.communities.length} condominios.</p><p>US$0,75 por unidad, mínimo US$25 por condominio. Impuestos y comisiones por confirmar. Esta cotización no realiza cargos.</p>`:''}
  <h3>Suscripción</h3><p>${state.subscription?.status==='unconfigured'?'Suscripción sin configurar.':`${h(state.subscription?.plan??'')} · ${h(state.subscription?.status??'unconfigured')}`}</p><p>La configuración asistida de planes no realiza cobros ni confirma pagos.</p>
  <h3>Invitar a una persona</h3><form id="account-invite-form" class="account-form"><label>Correo de la persona invitada<input name="email" type="email" required maxlength="254"></label><label>Rol de la invitación<select name="role"><option value="member">Miembro</option><option value="account_admin">Administrador de cuenta</option></select></label><label>Condominio de la invitación<select name="communityId"><option value="">Sin asignación operacional</option>${communityOptions}</select></label><label>Permiso inicial en el condominio<select name="communityRole"><option value="owner">Propietario</option><option value="committee">Comité</option><option value="admin">Administrador</option></select></label><button class="primary-button" ${state.busy?'disabled':''}>Enviar invitación</button></form><p>El correo debe estar configurado para entregar el enlace. No se muestra ni se copia el enlace en esta página.</p>
  <h3>Crear condominio</h3><form id="account-community-form" class="account-form"><label>Nombre del nuevo condominio<input name="name" required maxlength="130"></label><label>Dirección (opcional)<input name="address" maxlength="200"></label><button class="primary-button" ${state.busy?'disabled':''}>Crear condominio</button></form>
  <h3>Permisos por condominio</h3><form id="account-assignment-form" class="account-form"><label>Condominio para asignar<select name="communityId" required>${communityOptions}</select></label><label>Usuario para asignar<select name="userId" required>${memberOptions}</select></label><label>Permiso en el condominio<select name="role"><option value="admin">Administrador</option><option value="committee">Comité</option><option value="owner">Propietario</option><option value="revoke">Quitar acceso</option></select></label><button class="primary-button" ${state.busy||!d.communities.length||!d.members.length?'disabled':''}>Guardar asignación</button></form>
  <div class="live-table-wrap"><table class="live-table"><thead><tr><th>Condominio</th><th>Usuario</th><th>Permiso</th></tr></thead><tbody>${d.assignments.map(x=>`<tr><td>${h(d.communities.find(c=>c.id===x.communityId)?.name??'')}</td><td>${h(d.members.find(m=>m.id===x.userId)?.displayName??'Miembro sin acceso a la cuenta')}</td><td>${h(x.role)}</td></tr>`).join('')}</tbody></table></div>
  <h3>Miembros de la cuenta</h3><p>El alta de usuarios es asistida. Revocar una cuenta corta el acceso a todos sus condominios y conserva el historial.</p><div class="live-table-wrap"><table class="live-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Permiso de cuenta</th></tr></thead><tbody>${d.members.map(m=>`<tr><td>${h(m.displayName)}</td><td>${h(m.email)}</td><td><select aria-label="Permiso de cuenta de ${h(m.email)}" data-account-member="${h(m.id)}" ${state.busy?'disabled':''}><option value="member" ${m.role==='member'?'selected':''}>Miembro</option><option value="account_admin" ${m.role==='account_admin'?'selected':''}>Administrador de cuenta</option><option value="revoke">Revocar acceso a cuenta</option></select></td></tr>`).join('')}</tbody></table></div>
  <h3>Auditoría de cuenta</h3><div class="live-table-wrap"><table class="live-table"><thead><tr><th>Acción</th><th>Actor</th><th>Fecha</th></tr></thead><tbody>${d.audit.map(e=>`<tr><td>${h(e.action)}</td><td>${h(e.actorName??e.actorUserId??e.userId??'')}</td><td>${date(e.createdAt)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function screenContent(data){
  const content={dashboard:renderDashboard,units:renderUnits,directory:renderDirectory,charges:renderCharges,payments:renderPayments,paymentReports:renderPaymentReports,announcements:renderAnnouncements,notifications:renderNotifications,documents:renderDocuments,audit:renderAudit,providers:renderProviders,expenses:renderExpenses,incidents:renderIncidents};
  return (content[state.page]??renderDashboard)(data);
}
function selectOptions(){return state.data.units.map(x=>`<option value="${h(x.id)}">${h(x.code)}</option>`).join('');}
function providerOptions(){return (state.data.providers??[]).map(x=>`<option value="${h(x.id)}">${h(x.name)}</option>`).join('');}
function modalHtml(){
  const type=state.modal;
  if(!type||state.loading||!state.data)return '';
  const config=type==='reverse' ? ['Anular movimiento',`<p>El registro original permanecerá visible y el saldo se recalculará. Esta acción no puede repetirse.</p><label>Motivo de anulación<textarea name="reason" maxlength="500" minlength="10" rows="4" required placeholder="Describe el error y su corrección"></textarea></label>`] : {
    person:['Añadir contacto privado',unitPersonFields()],
    'person-edit':['Editar contacto privado',unitPersonFields(state.directory?.contacts.find(c=>c.id===state.personTarget))],
    'person-deactivate':['Dar de baja contacto',"<p>El contacto dejará de estar activo en esta unidad. El historial permanecerá visible solo para administración y no cambiará automáticamente los permisos del portal ni los saldos.</p><p><strong>Confirma la baja del contacto.</strong></p>"],
    unit:['Nueva unidad',`<label>Código<input name="code" maxlength="40" required placeholder="A-101"></label><label>Tipo<select name="kind"><option>Departamento</option><option>Casa</option><option>Local</option><option>Oficina</option></select></label><label>Ocupante (opcional)<input name="resident" maxlength="100"></label>`],
    charge:['Emitir cuota',`<label>Unidad<select name="unitId" required>${selectOptions()}</select></label><label>Periodo<input name="period" type="month" required value="${new Date().toISOString().slice(0,7)}"></label><label>Concepto<input name="concept" maxlength="100" required placeholder="Gasto común"></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="125.00"></label><label>Vencimiento (opcional)<input name="dueOn" type="date"></label><p>Solo las cuotas con fecha de vencimiento explícita pueden generar recordatorios internos. No se enviará correo ni WhatsApp.</p>`],
    'payment-report':['Informar pago para revisión',`<p>Este formulario no acredita una transferencia ni registra un abono. La administración debe revisarlo.</p><label>Departamento<select name="unitId" required>${selectOptions()}</select></label><label>Referencia única<input name="reference" required maxlength="90" placeholder="REFERENCIA-DEMO-0001"></label><label>Concepto<input name="concept" required maxlength="100" placeholder="Pago informado"></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="125.00"></label>`],
    'report-decision':['Revisión administrativa de pago',`<p>Acción: <strong>${h(state.reportDecisionTarget?.action??'')}</strong>. La validación administrativa no constituye conciliación bancaria automática. No confirmes pagos sin documentación externa suficiente.</p><label>Justificación de revisión<textarea name="note" rows="4" minlength="10" maxlength="240" required></textarea></label>`],
    payment:['Registrar pago manual',`<label>Unidad<select name="unitId" required>${selectOptions()}</select></label><label>Referencia única<input name="reference" maxlength="90" required placeholder="Transferencia-0001"></label><label>Concepto<input name="concept" maxlength="100" required placeholder="Abono de cuota"></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="125.00"></label><p>No valida transferencias bancarias; registra solo el dato declarado por un administrador.</p>`],
    'unit-message':['Aviso privado por departamento',`<p>Solo lo recibirá el propietario actualmente asignado a la unidad. No se envía por correo ni WhatsApp.</p><label>Departamento<select name="unitId" required>${(state.data?.units??[]).filter(x=>x.ownerUserId).map(x=>`<option value="${h(x.id)}">${h(x.code)}</option>`).join('')}</select></label><label>Título<input name="title" required maxlength="90"></label><label>Mensaje<textarea name="body" required maxlength="1000" rows="5"></textarea></label>`],
    announcement:['Nuevo comunicado',`<label>Título<input name="title" maxlength="90" required></label><label>Mensaje<textarea name="body" maxlength="2000" rows="5" required></textarea></label>`],
    provider:['Nuevo proveedor',`<label>Nombre<input name="name" maxlength="130" required></label><label>Rubro<input name="category" maxlength="70" required></label>`],
    expense:['Registrar gasto',`<label>Proveedor<select name="providerId" required>${providerOptions()}</select></label><label>Periodo<input name="period" type="month" required value="${new Date().toISOString().slice(0,7)}"></label><label>Concepto<input name="concept" maxlength="100" required></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="100.00"></label><p>Registra un gasto operativo; no equivale a contabilidad formal.</p>`],
    incident:['Reportar incidencia',`<label>Unidad o área<select name="unitId"><option value="">Área común</option>${selectOptions()}</select></label><label>Categoría<select name="category"><option value="maintenance">Mantenimiento</option><option value="security">Seguridad</option><option value="cleaning">Limpieza</option><option value="noise">Ruidos</option><option value="other">Otros</option></select></label><label>Prioridad<select name="priority"><option value="normal">Normal</option><option value="low">Baja</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label><label>Título<input name="title" maxlength="120" required></label><label>Descripción<textarea name="detail" maxlength="2000" rows="5" required></textarea></label><p>El seguimiento queda registrado. No se admiten fotografías ni archivos en esta versión.</p>`],
    'incident-comment':['Añadir comentario',`<label>Comentario<textarea name="note" maxlength="1200" rows="5" required></textarea></label>`],
    'owner-assignment':['Asignar propietario',`<p>Los usuarios se crean de forma privada mediante CLI. Solo se listan miembros con rol propietario de esta comunidad.</p><label>Propietario<select name="ownerUserId"><option value="">Sin asignar</option>${state.members.filter(m=>m.role==='owner').map(m=>`<option value="${h(m.id)}" ${state.data?.units.find(u=>u.id===state.ownerTarget)?.ownerUserId===m.id?'selected':''}>${h(m.displayName)} (${h(m.email)})</option>`).join('')}</select></label><p>La modificación quedará en el historial de auditoría. Al quitar una asignación, el propietario pierde acceso a la unidad.</p>`],
    'incident-status':['Actualizar incidencia',`<label>Estado<select name="status"><option value="in_progress">En atención</option><option value="resolved">Resuelta</option><option value="closed">Cerrada</option><option value="open">Abierta</option></select></label><label>Justificación<textarea name="note" maxlength="500" minlength="8" rows="4" required></textarea></label>`],
    document:['Registrar metadatos de documento',`<label>Título<input name="title" maxlength="150" required></label><label>Categoría<input name="category" maxlength="60" required placeholder="Actas"></label><label>Visibilidad<select name="scope"><option value="community">Toda la comunidad</option><option value="committee">Administración y comité</option><option value="admin">Solo administración</option></select></label><p>No se carga ningún archivo; es solo un registro documental.</p>`],
  }[type];
  return `<div class="modal-backdrop" data-close="1"></div><div class="modal-host"><section class="modal live-modal" role="dialog" aria-modal="true" aria-labelledby="live-modal-title"><h2 id="live-modal-title">${config[0]}</h2><form id="${type==='reverse'?'reverse-form':'create-form'}" data-type="${type}">${config[1]}${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}<div class="modal-footer"><button type="button" class="secondary-button" data-close="1">Cancelar</button><button class="primary-button" type="submit" ${state.busy?'disabled':''}>${state.busy?'Guardando…':'Guardar'}</button></div></form></section></div>`;
}
function render(){
  if(state.identityFlow&&!state.identityLogin)return viewIdentity();
  if(!state.token)return viewLogin();
  const visible=Object.keys(names).filter(x=>x!=='account'||isAccountAdmin()).filter(x=>state.data||x==='account').filter(x=>state.data?.role!=='committee'||!['charges','payments','notifications','paymentReports'].includes(x)).filter(x=>state.data?.role==='admin'||!['audit','providers','expenses','directory'].includes(x));
  const d=state.data;
  app.innerHTML=`<div class="app-shell live-app"><aside class="sidebar ${state.menuOpen?'sidebar--open':''}"><div class="brand"><div class="brand-mark">DC</div><div><strong>Digi<span>Condominio</span></strong><small>ADMINISTRACIÓN PRIVADA</small></div></div><p class="nav-label">MI COMUNIDAD</p><nav class="nav-list">${visible.map(p=>`<button data-page="${p}" class="nav-item ${p===state.page?'active':''}" ${p===state.page?'aria-current="page"':''}><span class="live-menu-icon">${icons[p]}</span><span>${names[p]}</span></button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="sidebar-note"><strong>Sesión protegida</strong><p>Rol actual: ${h(d?.role??'')}. El acceso se limita en servidor según comunidad y unidad.</p><span>MVP EN DESARROLLO</span></div><button class="nav-item live-logout" data-logout="1">Salir de la sesión</button></aside>${state.menuOpen?'<button class="mobile-shade" data-close-menu="1" aria-label="Cerrar menú"></button>':''}<div class="main-area"><header class="topbar"><div class="topbar-left"><button data-menu="1" class="mobile-menu" aria-label="Abrir menú">☰</button><strong>${h(communityName())}</strong></div><div class="topbar-right"><span class="header-pill">${state.token==='cookie'?'Piloto privado · Acceso autenticado':'Entorno local · Acceso autenticado'}</span><span class="top-avatar">${h((state.user?.displayName??'DC').slice(0,2).toUpperCase())}</span></div></header><main class="content"><div class="intro-row"><div><div class="eyebrow">ESPACIO DE GESTIÓN</div><h1>${h(heading())}</h1><p>Información persistida localmente y filtrada según los permisos de tu cuenta.</p></div><div class="intro-actions"><select class="live-community-select" id="live-account" aria-label="Cuenta seleccionada" ${state.busy?'disabled':''}>${state.accounts.map(a=>`<option value="${h(a.id)}" ${a.id===state.accountId?'selected':''}>${h(a.name)}</option>`).join('')}</select><select class="live-community-select" id="live-community" aria-label="Comunidad seleccionada" ${state.busy||!state.communities.length?'disabled':''}>${state.communities.map(c=>`<option value="${h(c.id)}" ${c.id===state.selected?'selected':''}>${h(c.name)}</option>`).join('')}</select>${actions()}${canWrite() && ['units','charges','payments','providers','expenses'].includes(state.page)?`<button class="secondary-button" data-export="${state.page}">Exportar CSV</button>`:''}</div></div><div class="live-info">Etapa MVP local · Sin operaciones bancarias ni documentos adjuntos · No apto para producción</div>${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}${state.notice?`<p class="live-info" role="status">${h(state.notice)}</p>`:''}${!['dashboard','account'].includes(state.page)?`<div class="live-filter"><input id="live-search" aria-label="Buscar" value="${h(state.query)}" placeholder="Buscar en ${h(heading().toLowerCase())}"></div>`:''}<div class="live-view">${state.loading?info('Cargando contexto…'):state.page==='account'?renderAccount():d?screenContent(d):info('No tienes condominios asignados en esta cuenta.')}</div><footer class="footer">Digi-Condominio · MVP privado de desarrollo · ${state.token==='cookie'?'Sesión segura en este navegador':'Sesión temporal en este navegador'}</footer></main></div>${modalHtml()}</div>`;
  if(state.query){const inp=document.getElementById('live-search');if(inp && document.activeElement!==inp)inp.setSelectionRange(state.query.length,state.query.length);}
}
async function refresh(){
  if(!state.token)return;
  state.reminderPreview=null;state.communicationConsent=null;state.paymentReports=[];
  const revision=++generation,accountId=state.accountId,communityId=state.selected;
  state.loading=true;state.data=null;state.members=[];state.accountData=null;render();
  try{
    const result=await request('/api/accounts');
    state.accounts=result.accounts;
    if(!state.accounts.some(a=>a.id===accountId)){
      state.accountId=state.accounts[0]?.id??null;state.selected=null;state.communities=[];
      if(state.accountId){state.loading=false;return refresh();}
      state.error='Tu cuenta no tiene acceso a ningún cliente.';return;
    }
    const cs=await request(`/api/accounts/${accountId}/communities`);
    state.communities=cs.communities;
    state.selected=cs.communities.some(c=>c.id===communityId)?communityId:cs.communities[0]?.id??null;
    if(isAccountAdmin()){state.accountData=await request(`/api/accounts/${accountId}`);state.subscription=(await request(`/api/accounts/${accountId}/subscription`)).subscription;state.quote=(await request(`/api/accounts/${accountId}/quote`)).quote;}
    if(state.selected){
      const d=await request(`/api/communities/${state.selected}/overview`);
      const members=d.role==='admin'?(await request(`/api/communities/${state.selected}/members`)).members:[];
      state.data=d;state.members=members;
      if(d.role==='admin'||d.role==='owner')state.paymentReports=(await request(`/api/communities/${state.selected}/payment-reports`)).reports;
      if(d.role==='owner')state.communicationConsent=await request(`/api/communities/${state.selected}/communication-consent`);
    }else if(isAccountAdmin())state.page='account';
    state.error='';
  }catch(e){if(revision===generation&&!(e instanceof ContextChanged)){state.data=null;state.members=[];state.accountData=null;state.error=e.message;}}
  finally{if(revision===generation){state.loading=false;render();}}
}
async function loadUnitDirectory(unitId=state.directoryUnit??state.data?.units?.[0]?.id){
  if(!state.data||state.data.role!=='admin'||!unitId)return;
  state.directoryUnit=unitId;state.directory=null;state.directoryBusy=true;render();
  const revision=generation,community=state.selected;
  try{
    const response=await request(base()+'/units/'+unitId+'/directory');
    if(revision!==generation||community!==state.selected||unitId!==state.directoryUnit)return;
    state.directory=response.directory;
    state.error='';
  }catch(e){
    if(e instanceof ContextChanged)return;
    if(revision===generation)state.error=e.message;
  }finally{
    if(revision===generation&&unitId===state.directoryUnit){state.directoryBusy=false;render();}
  }
}
async function login(form){
  const credentials=Object.fromEntries(new FormData(form));
  state.busy=true;state.error='';render();
  try{
    const login=await request('/api/login','POST',credentials);
    state.token=login.token??'cookie';state.csrf=login.csrfToken??null;state.user=login.user;clearContext();state.identityLogin=false;
    const result=await request('/api/accounts');state.accounts=result.accounts;
    state.accountId=state.accounts[0]?.id??null;state.selected=null;
    if(!state.accountId)throw new Error('Tu cuenta no tiene clientes asignados');
    await refresh();
  }catch(e){if(e instanceof ContextChanged)return;state.token=null;state.error=e.message;}
  finally{state.busy=false;render();}
}
function amountMinor(value){
  if(typeof value!=='string'|| !/^(?:0|[1-9]\d{0,8})(?:[.,]\d{1,2})?$/.test(value.trim()))throw Error('El importe debe ser positivo y tener máximo dos decimales');
  const [whole,cent='']=value.trim().replace(',','.').split('.');
  const result=Number(whole)*100+Number(cent.padEnd(2,'0'));
  if(!Number.isSafeInteger(result)||result<=0)throw Error('Importe inválido');
  return result;
}
async function submitCreate(form){
  const type=form.dataset.type;
  const data=Object.fromEntries(new FormData(form));
  if(['person','person-edit','person-deactivate'].includes(type)){
    if(!canWrite()||!state.directoryUnit)return;
    const unitId=state.directoryUnit,contactId=state.personTarget;
    state.busy=true;state.error='';render();
    try{
      const url=base()+'/units/'+unitId+'/directory';
      if(type==='person-deactivate')await request(url+'/'+contactId,'DELETE');
      else{
        const payload={fullName:data.fullName,relationship:data.relationship,email:data.email,
          phone:data.phone,paymentResponsible:data.paymentResponsible==='true',contactPreference:data.contactPreference};
        await request(type==='person-edit'?url+'/'+contactId:url,type==='person-edit'?'PATCH':'POST',payload);
      }
      state.modal=null;state.personTarget=null;
      await loadUnitDirectory(unitId);
      state.notice=type==='person-deactivate'?'Contacto desactivado, sin modificar permisos del portal.':'Contacto privado guardado sin enviar notificaciones externas.';
      render();
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}
    finally{state.busy=false;render();}
    return;
  }
  if(type==='payment-report'||type==='report-decision'){
    state.busy=true;state.error='';render();
    try{
      if(type==='payment-report'){
        if(state.data?.role!=='owner')return;
        await request(base()+'/payment-reports','POST',{
          unitId:data.unitId,reference:data.reference,concept:data.concept,amountMinor:amountMinor(data.amount)
        });
        state.notice='Pago informado para revisión. El saldo todavía no se ha reducido.';
      }else{
        if(state.data?.role!=='admin'||!state.reportDecisionTarget)return;
        const {id,action}=state.reportDecisionTarget;
        await request(base()+'/payment-reports/'+id+'/decision','POST',{action,note:data.note});
        state.notice='Decisión administrativa registrada. No se ha realizado conciliación bancaria automática.';
      }
      state.modal=null;state.reportDecisionTarget=null;
      await refresh();
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  const routes={incident:'incidents',unit:'units',charge:'charges',payment:'payments',announcement:'announcements',document:'documents',provider:'providers',expense:'expenses'};
  if(type==='unit-message'){
    if(!canWrite())return;
    state.busy=true;state.error='';
    try{
      const {unitId,title,body}=data;
      await request(`${base()}/units/${unitId}/messages`,'POST',{title,body});
      state.modal=null;state.query='';await refresh();
      state.notice='Aviso guardado en la bandeja privada del propietario asignado. No se envió un mensaje externo.';
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}
    finally{state.busy=false;render();}
    return;
  }
  if(!routes[type])return;
  try{
    if(type==='charge'||type==='payment'||type==='expense'){data.amountMinor=amountMinor(data.amount);delete data.amount;}
    if(type==='charge'&&!data.dueOn)delete data.dueOn;
    state.busy=true;state.error='';
    const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
    await request(`${base()}/${routes[type]}`,'POST',data);
    state.modal=null;state.query='';await refresh();
  }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}finally{state.busy=false;render();}
}
app.addEventListener('submit',async event=>{
  if(event.target.id==='identity-form'){
    event.preventDefault();if(state.busy)return;
    const input=Object.fromEntries(new FormData(event.target)),flow=state.identityFlow;
    if(input.password!==undefined&&input.password!==input.confirmation){state.error='Las contraseñas no coinciden';render();return;}
    state.busy=true;state.error='';state.notice='';render();
    try{
      const path=flow.type==='request'?'/api/password-reset/request':flow.type==='reset'?'/api/password-reset/complete':'/api/invitations/accept';
      await request(path,'POST',flow.type==='request'?{email:input.email}:{token:flow.token,name:input.name,password:input.password});
      if(flow.type==='request')state.notice='Si la cuenta existe, recibirás instrucciones por correo.';
      else if(flow.type==='reset'){
        clearContext();state.token=null;state.csrf=null;state.user=null;state.accounts=[];state.accountId=null;state.communities=[];state.selected=null;state.identityFlow=null;state.identityLogin=false;state.notice='Contraseña actualizada. Inicia sesión nuevamente.';
      }else{
        state.identityFlow=null;state.identityLogin=false;
        if(state.token)await refresh();
        state.notice='Invitación aceptada. Ya puedes iniciar sesión.';
      }
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}return;
  }
  if(event.target.id==='account-invite-form'){
    event.preventDefault();if(state.busy||state.loading||!isAccountAdmin())return;
    const input=Object.fromEntries(new FormData(event.target));
    input.communityId=input.communityId||null;input.communityRole=input.communityId?input.communityRole:null;
    state.busy=true;state.error='';state.notice='';render();
    try{await request(`/api/accounts/${state.accountId}/invitations`,'POST',input);await refresh();state.notice='Invitación enviada.';}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}return;
  }
  if(['account-community-form','account-assignment-form'].includes(event.target.id)){
    event.preventDefault();if(state.busy||state.loading||!isAccountAdmin())return;
    const form=event.target,data=Object.fromEntries(new FormData(form)),accountId=state.accountId;
    state.busy=true;render();
    try{
      if(form.id==='account-community-form')await request(`/api/accounts/${accountId}/communities`,'POST',data);
      else await request(`/api/accounts/${accountId}/communities/${data.communityId}/members/${data.userId}`,'PATCH',{role:data.role==='revoke'?null:data.role});
      await refresh();
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  if(event.target.id!=='login-form'&&(state.loading||state.busy)){event.preventDefault();return;}
  if(event.target.id==='login-form'){event.preventDefault();await login(event.target);return;}
  if(event.target.id==='create-form' && event.target.dataset.type==='owner-assignment'){
    event.preventDefault();if(state.busy)return;
    const ownerUserId=String(new FormData(event.target).get('ownerUserId')??'');
    state.busy=true;event.target.querySelector('button[type=submit]').disabled=true;
    try{await request(`${base()}/units/${state.ownerTarget}/owner`,'PATCH',{ownerUserId});state.modal=null;state.ownerTarget=null;await refresh();}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}finally{state.busy=false;render();}
    return;
  }
  if(event.target.id==='create-form' && ['incident-comment','incident-status'].includes(event.target.dataset.type)){
    event.preventDefault();if(state.busy)return;
    const kind=event.target.dataset.type,target=state.incidentTarget,data=Object.fromEntries(new FormData(event.target));
    state.busy=true;event.target.querySelector('button[type=submit]').disabled=true;
    try{
      if(kind==='incident-comment')await request(`${base()}/incidents/${target}/comments`,'POST',data);
      else await request(`${base()}/incidents/${target}/status`,'PATCH',data);
      state.modal=null;state.incidentTarget=null;await refresh();
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}finally{state.busy=false;render();}
    return;
  }
  if(event.target.id==='create-form'){event.preventDefault();await submitCreate(event.target);return;}
  if(event.target.id==='reverse-form'){event.preventDefault();const target=state.reverseTarget;const reason=String(new FormData(event.target).get('reason')??'').trim();const button=event.target.querySelector('button[type=submit]');if(button)button.disabled=true;
    try{await request(`${base()}/${target.type}/${target.id}/reverse`,'POST',{reason});state.modal=null;state.reverseTarget=null;await refresh();}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}return;}
});
app.addEventListener('click',async event=>{
  if(event.target.closest('[data-recovery]')){state.identityFlow={type:'request'};state.identityLogin=false;state.error='';state.notice='';render();return;}
  if(event.target.closest('[data-identity-back]')){state.identityFlow=null;state.identityLogin=false;state.error='';state.notice='';render();return;}
  if(event.target.closest('[data-identity-login]')){state.identityLogin=true;state.error='';render();return;}
  if(event.target.closest('[data-logout]')){
    const token=state.token,csrf=state.csrf;clearContext();state.token=null;state.csrf=null;state.user=null;state.accounts=[];state.accountId=null;state.communities=[];state.selected=null;state.busy=false;state.loading=false;render();
    void fetch('/api/logout',{method:'POST',headers:{...(token&&token!=='cookie'?{Authorization:`Bearer ${token}`} : {}),...(csrf?{'X-CSRF-Token':csrf}:{})},credentials:'same-origin'}).catch(()=>{});return;
  }
  if(state.loading||state.busy)return;
  const page=event.target.closest('[data-page]')?.dataset.page;
  if(page){state.page=page;state.error='';state.query='';state.menuOpen=false;render();if(page==='directory')void loadUnitDirectory();return;}
  const personEdit=event.target.closest('[data-person-edit]');
  if(personEdit&&canWrite()&&state.page==='directory'){
    state.personTarget=personEdit.dataset.personEdit;state.modal='person-edit';state.error='';render();
    document.querySelector('.live-modal input')?.focus();return;
  }
  const personDeactivate=event.target.closest('[data-person-deactivate]');
  if(personDeactivate&&canWrite()&&state.page==='directory'){
    state.personTarget=personDeactivate.dataset.personDeactivate;state.modal='person-deactivate';state.error='';render();return;
  }
  const previewReminders=event.target.closest('[data-reminder-preview]');
  if(previewReminders&&canWrite()&&state.page==='charges'){
    state.busy=true;state.error='';render();
    try{state.reminderPreview=await request(base()+'/reminders/preview');}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  const prepareReminders=event.target.closest('[data-reminder-prepare]');
  if(prepareReminders&&canWrite()&&state.page==='charges'&&state.reminderPreview?.pending>0){
    state.busy=true;state.error='';render();
    try{
      const result=await request(base()+'/reminders/prepare','POST');
      await refresh();
      state.notice='Se guardaron '+result.created+' avisos privados dentro del sistema. No se enviaron correos, SMS ni WhatsApp.';
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  const reportDecision=event.target.closest('[data-report-decision]');
  if(reportDecision&&state.data?.role==='admin'&&state.page==='paymentReports'){
    state.reportDecisionTarget={id:reportDecision.dataset.reportDecision,action:reportDecision.dataset.reportAction};
    state.modal='report-decision';state.error='';render();return;
  }
  const consentButton=event.target.closest('[data-consent-purpose]');
  if(consentButton&&state.data?.role==='owner'&&state.page==='notifications'){
    state.busy=true;state.error='';render();
    try{
      await request(base()+'/communication-consent','PUT',{
        purpose:consentButton.dataset.consentPurpose,channel:'email',enabled:consentButton.dataset.consentEnabled==='true'
      });
      state.communicationConsent=await request(base()+'/communication-consent');
      state.notice='Preferencia registrada para tu cuenta. No se ha enviado ningún correo.';
    }catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  const readNotice=event.target.closest('[data-notification-read]');
  if(readNotice){
    state.busy=true;state.error='';
    try{await request(`${base()}/notifications/${readNotice.dataset.notificationRead}/read`,'PATCH');await refresh();}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;render();}
    finally{state.busy=false;render();}
    return;
  }
  const unitOwner=event.target.closest('[data-unit-owner]');
  if(unitOwner){state.ownerTarget=unitOwner.dataset.unitOwner;state.modal='owner-assignment';state.error='';render();document.querySelector('.live-modal select')?.focus();return;}
  const replying=event.target.closest('[data-incident-comment]');
  if(replying){state.incidentTarget=replying.dataset.incidentComment;state.modal='incident-comment';state.error='';render();document.querySelector('.live-modal textarea')?.focus();return;}
  const statusButton=event.target.closest('[data-incident-status]');
  if(statusButton){state.incidentTarget=statusButton.dataset.incidentStatus;state.modal='incident-status';state.error='';render();document.querySelector('.live-modal select')?.focus();return;}
  const reversing=event.target.closest('[data-reverse-id]');
  if(reversing){state.reverseTarget={type:reversing.dataset.reverseType,id:reversing.dataset.reverseId};state.modal='reverse';state.error='';render();document.querySelector('.live-modal textarea')?.focus();return;}
  const modal=event.target.closest('[data-new]')?.dataset.new;
  if(modal){state.modal=modal;state.error='';render();document.querySelector('.live-modal input, .live-modal select')?.focus();return;}
  if(event.target.closest('[data-close]')){state.modal=null;state.error='';render();return;}
  if(event.target.closest('[data-menu]')){state.menuOpen=true;render();return;}
  if(event.target.closest('[data-close-menu]')){state.menuOpen=false;render();return;}
  const exportName=event.target.closest('[data-export]')?.dataset.export;
  if(exportName){
    const token=state.token,revision=generation;
    try{const response=await fetch(`${base()}/reports/${exportName}.csv`,{headers:state.token!=='cookie'?{Authorization:`Bearer ${state.token}`}:{},cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw Error('No fue posible exportar el informe');
      const blob=await response.blob();
      if(token!==state.token||revision!==generation)return;
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`digi-${exportName}.csv`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
    }catch(e){if(e instanceof ContextChanged||token!==state.token||revision!==generation)return;state.error=e.message;render();}return;
  }

});
app.addEventListener('change',async event=>{
  if(state.busy)return;
  if(event.target.dataset.accountMember){
    if(!isAccountAdmin()||state.loading)return;
    const role=event.target.value==='revoke'?null:event.target.value,id=event.target.dataset.accountMember;
    state.busy=true;render();
    try{await request(`/api/accounts/${state.accountId}/members/${id}`,'PATCH',{role});await refresh();}
    catch(e){if(e instanceof ContextChanged)return;state.error=e.message;}
    finally{state.busy=false;render();}
    return;
  }
  if(event.target.id==='directory-unit-select'){
    state.query='';state.error='';state.personTarget=null;
    await loadUnitDirectory(event.target.value);return;
  }
  if(event.target.id==='live-account'){
    const id=event.target.value;clearContext();state.accountId=id;state.selected=null;state.communities=[];await refresh();return;
  }
  if(event.target.id==='live-community'){
    const id=event.target.value;clearContext();state.selected=id;await refresh();
  }
});
app.addEventListener('input',event=>{
  if(event.target.id!=='live-search'||state.loading||!state.data)return;
  const selection=event.target.selectionStart;
  state.query=event.target.value;
  document.querySelector('.live-view').innerHTML=screenContent(state.data);
  event.target.focus();event.target.setSelectionRange(selection,selection);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&state.modal){state.modal=null;state.error='';render();}
  else if(event.key==='Escape'&&state.menuOpen){state.menuOpen=false;render();}
  if(event.key==='Tab'&&state.modal){const inputs=[...document.querySelectorAll('.live-modal button,.live-modal input,.live-modal textarea,.live-modal select')].filter(x=>!x.disabled);if(!inputs.length)return;const first=inputs[0],last=inputs.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
render();
async function restoreSession(){
  try{
    const session=await request('/api/session');
    if(!session.csrfToken)return;
    state.token='cookie';state.csrf=session.csrfToken;state.user=session.user;clearContext();
    const result=await request('/api/accounts');state.accounts=result.accounts;state.accountId=result.accounts[0]?.id??null;state.selected=null;
    if(state.accountId)await refresh();else render();
  }catch{/* No existing cookie session: keep the login or incoming-link screen. */}
}
void restoreSession();

window.addEventListener('hashchange',()=>{if(takeIdentityFragment()){clearContext();state.busy=false;render();}});
