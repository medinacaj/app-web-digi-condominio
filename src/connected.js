import { escapeHtml as h } from './domain.js';
const app=document.getElementById('app');
const money=(n)=>`UM ${(n/100).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(v)=>new Date(v).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'});
const icons={dashboard:'▦',units:'⌂',charges:'≡',payments:'▤',announcements:'◉',documents:'▣',audit:'◎',providers:'◇',expenses:'▥',incidents:'⚑'};
const names={dashboard:'Resumen',units:'Unidades',charges:'Cuotas',payments:'Pagos',announcements:'Comunicados',documents:'Documentos',audit:'Auditoría',providers:'Proveedores',expenses:'Gastos',incidents:'Incidencias'};
const state={token:null,user:null,communities:[],selected:null,data:null,page:'dashboard',modal:null,busy:false,error:'',query:'',menuOpen:false,reverseTarget:null,incidentTarget:null};
const base=()=>`/api/communities/${state.selected}`;
async function request(path,method='GET',data){
  const response=await fetch(path,{method,cache:'no-store',headers:{...(state.token?{Authorization:`Bearer ${state.token}`} : {}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,credentials:'omit'});
  const payload=await response.json().catch(()=>({error:'Respuesta inválida del servidor'}));
  if(!response.ok)throw new Error(payload.error??`HTTP ${response.status}`);
  return payload;
}
function info(text){return `<div class="live-empty">${h(text)}</div>`;}
function viewLogin(){
  app.innerHTML=`<div class="login-shell"><div class="login-panel"><div class="login-mark">DC</div><p class="login-caption">PLATAFORMA LOCAL PRIVADA</p><h1>Digi<span>Condominio</span></h1><p>Gestiona unidades, cuotas, pagos manuales y comunicaciones con acceso autenticado.</p><form id="login-form"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254" autofocus><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit" class="primary-button" ${state.busy?'disabled':''}>${state.busy?'Validando…':'Ingresar al espacio privado'}</button></form>${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}<small>Sin registro público. El administrador inicial se configura localmente. No introduce ni almacena tus credenciales en el código fuente.</small></div><div class="login-art"><div class="login-tag">GESTIÓN CON TRAZABILIDAD</div><h2>Más claridad para cada comunidad.</h2><p>Información accesible según permisos y movimientos registrados con historial.</p><div class="login-graphic"><div><strong>01</strong><span>Comunidad</span></div><div><strong>02</strong><span>Unidades</span></div><div><strong>03</strong><span>Finanzas</span></div></div></div></div>`;
}
const communityName=()=>state.communities.find(x=>x.id===state.selected)?.name??'Comunidad';
const canWrite=()=>state.data?.role==='admin';
const filtered=(items,fields)=>items.filter(x=>fields.some(f=>String(x[f]??'').toLocaleLowerCase('es').includes(state.query.toLocaleLowerCase('es'))));
const heading=()=>names[state.page];
const actions=()=>{
  if(!canWrite() && state.page!=='incidents')return '';
  const controls={units:['unit','Añadir unidad'],charges:['charge','Emitir cuota'],payments:['payment','Registrar pago'],announcements:['announcement','Nuevo comunicado'],documents:['document','Registrar documento'],providers:['provider','Nuevo proveedor'],expenses:['expense','Registrar gasto'],incidents:['incident','Reportar incidencia']};
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
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Tipo</th><th>Ocupante</th>${data.role==='committee'? '':'<th>Saldo</th>'}</tr></thead><tbody>${list.map(x=>`<tr><td><strong>${h(x.code)}</strong></td><td>${h(x.kind)}</td><td>${h(x.resident||'Sin información')}</td>${data.role==='committee'?'':`<td class="money">${money(x.balanceMinor)}</td>`}</tr>`).join('')}</tbody></table></div>`;
}
function renderCharges(data){
  if(data.role==='committee')return info('La información financiera está restringida para este rol.');
  const list=filtered(data.charges,['unit','concept','period']);
  if(!list.length)return info('No se han emitido cuotas.');
  return `<div class="live-table-wrap"><table class="live-table"><thead><tr><th>Unidad</th><th>Periodo</th><th>Concepto</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${list.map(x=>`<tr class="${x.reversed?'live-void':''}"><td>${h(x.unit)}</td><td>${h(x.period)}</td><td>${h(x.concept)}</td><td class="money">${money(x.amountMinor)}</td><td>${x.reversed?`<span title="${h(x.reverseReason??'Anulado')}">Anulado</span>`:'Activo'}</td><td>${canWrite()&&!x.reversed?`<button class="live-reverse" data-reverse-type="charges" data-reverse-id="${h(x.id)}">Anular</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
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
function screenContent(data){
  const content={dashboard:renderDashboard,units:renderUnits,charges:renderCharges,payments:renderPayments,announcements:renderAnnouncements,documents:renderDocuments,audit:renderAudit,providers:renderProviders,expenses:renderExpenses,incidents:renderIncidents};
  return (content[state.page]??renderDashboard)(data);
}
function selectOptions(){return state.data.units.map(x=>`<option value="${h(x.id)}">${h(x.code)}</option>`).join('');}
function providerOptions(){return (state.data.providers??[]).map(x=>`<option value="${h(x.id)}">${h(x.name)}</option>`).join('');}
function modalHtml(){
  const type=state.modal;
  if(!type)return '';
  const config=type==='reverse' ? ['Anular movimiento',`<p>El registro original permanecerá visible y el saldo se recalculará. Esta acción no puede repetirse.</p><label>Motivo de anulación<textarea name="reason" maxlength="500" minlength="10" rows="4" required placeholder="Describe el error y su corrección"></textarea></label>`] : {
    unit:['Nueva unidad',`<label>Código<input name="code" maxlength="40" required placeholder="A-101"></label><label>Tipo<select name="kind"><option>Departamento</option><option>Casa</option><option>Local</option><option>Oficina</option></select></label><label>Ocupante (opcional)<input name="resident" maxlength="100"></label>`],
    charge:['Emitir cuota',`<label>Unidad<select name="unitId" required>${selectOptions()}</select></label><label>Periodo<input name="period" type="month" required value="${new Date().toISOString().slice(0,7)}"></label><label>Concepto<input name="concept" maxlength="100" required placeholder="Gasto común"></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="125.00"></label>`],
    payment:['Registrar pago manual',`<label>Unidad<select name="unitId" required>${selectOptions()}</select></label><label>Referencia única<input name="reference" maxlength="90" required placeholder="Transferencia-0001"></label><label>Concepto<input name="concept" maxlength="100" required placeholder="Abono de cuota"></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="125.00"></label><p>No valida transferencias bancarias; registra solo el dato declarado por un administrador.</p>`],
    announcement:['Nuevo comunicado',`<label>Título<input name="title" maxlength="90" required></label><label>Mensaje<textarea name="body" maxlength="2000" rows="5" required></textarea></label>`],
    provider:['Nuevo proveedor',`<label>Nombre<input name="name" maxlength="130" required></label><label>Rubro<input name="category" maxlength="70" required></label>`],
    expense:['Registrar gasto',`<label>Proveedor<select name="providerId" required>${providerOptions()}</select></label><label>Periodo<input name="period" type="month" required value="${new Date().toISOString().slice(0,7)}"></label><label>Concepto<input name="concept" maxlength="100" required></label><label>Importe en UM<input name="amount" required inputmode="decimal" placeholder="100.00"></label><p>Registra un gasto operativo; no equivale a contabilidad formal.</p>`],
    incident:['Reportar incidencia',`<label>Unidad o área<select name="unitId"><option value="">Área común</option>${selectOptions()}</select></label><label>Categoría<select name="category"><option value="maintenance">Mantenimiento</option><option value="security">Seguridad</option><option value="cleaning">Limpieza</option><option value="noise">Ruidos</option><option value="other">Otros</option></select></label><label>Prioridad<select name="priority"><option value="normal">Normal</option><option value="low">Baja</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label><label>Título<input name="title" maxlength="120" required></label><label>Descripción<textarea name="detail" maxlength="2000" rows="5" required></textarea></label><p>El seguimiento queda registrado. No se admiten fotografías ni archivos en esta versión.</p>`],
    'incident-comment':['Añadir comentario',`<label>Comentario<textarea name="note" maxlength="1200" rows="5" required></textarea></label>`],
    'incident-status':['Actualizar incidencia',`<label>Estado<select name="status"><option value="in_progress">En atención</option><option value="resolved">Resuelta</option><option value="closed">Cerrada</option><option value="open">Abierta</option></select></label><label>Justificación<textarea name="note" maxlength="500" minlength="8" rows="4" required></textarea></label>`],
    document:['Registrar metadatos de documento',`<label>Título<input name="title" maxlength="150" required></label><label>Categoría<input name="category" maxlength="60" required placeholder="Actas"></label><label>Visibilidad<select name="scope"><option value="community">Toda la comunidad</option><option value="committee">Administración y comité</option><option value="admin">Solo administración</option></select></label><p>No se carga ningún archivo; es solo un registro documental.</p>`],
  }[type];
  return `<div class="modal-backdrop" data-close="1"></div><div class="modal-host"><section class="modal live-modal" role="dialog" aria-modal="true" aria-labelledby="live-modal-title"><h2 id="live-modal-title">${config[0]}</h2><form id="${type==='reverse'?'reverse-form':'create-form'}" data-type="${type}">${config[1]}${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}<div class="modal-footer"><button type="button" class="secondary-button" data-close="1">Cancelar</button><button class="primary-button" type="submit" ${state.busy?'disabled':''}>${state.busy?'Guardando…':'Guardar'}</button></div></form></section></div>`;
}
function render(){
  if(!state.token)return viewLogin();
  const visible=Object.keys(names).filter(x=>state.data?.role!=='committee'||!['charges','payments'].includes(x)).filter(x=>state.data?.role==='admin'||!['audit','providers','expenses'].includes(x));
  const d=state.data;
  app.innerHTML=`<div class="app-shell live-app"><aside class="sidebar ${state.menuOpen?'sidebar--open':''}"><div class="brand"><div class="brand-mark">DC</div><div><strong>Digi<span>Condominio</span></strong><small>ADMINISTRACIÓN PRIVADA</small></div></div><p class="nav-label">MI COMUNIDAD</p><nav class="nav-list">${visible.map(p=>`<button data-page="${p}" class="nav-item ${p===state.page?'active':''}" ${p===state.page?'aria-current="page"':''}><span class="live-menu-icon">${icons[p]}</span><span>${names[p]}</span></button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="sidebar-note"><strong>Sesión local protegida</strong><p>Rol actual: ${h(d?.role??'')}. El acceso se limita en servidor según comunidad y unidad.</p><span>MVP EN DESARROLLO</span></div><button class="nav-item live-logout" data-logout="1">Salir de la sesión</button></aside>${state.menuOpen?'<button class="mobile-shade" data-close-menu="1" aria-label="Cerrar menú"></button>':''}<div class="main-area"><header class="topbar"><div class="topbar-left"><button data-menu="1" class="mobile-menu" aria-label="Abrir menú">☰</button><strong>${h(communityName())}</strong></div><div class="topbar-right"><span class="header-pill">Entorno local · Acceso autenticado</span><span class="top-avatar">${h((state.user?.displayName??'DC').slice(0,2).toUpperCase())}</span></div></header><main class="content"><div class="intro-row"><div><div class="eyebrow">ESPACIO DE GESTIÓN</div><h1>${h(heading())}</h1><p>Información persistida localmente y filtrada según los permisos de tu cuenta.</p></div><div class="intro-actions"><select class="live-community-select" id="live-community" aria-label="Comunidad seleccionada">${state.communities.map(c=>`<option value="${h(c.id)}" ${c.id===state.selected?'selected':''}>${h(c.name)}</option>`).join('')}</select>${actions()}${canWrite() && ['units','charges','payments','providers','expenses'].includes(state.page)?`<button class="secondary-button" data-export="${state.page}">Exportar CSV</button>`:''}</div></div><div class="live-info">Etapa MVP local · Sin operaciones bancarias ni documentos adjuntos · No apto para producción</div>${state.error?`<p class="live-error" role="alert">${h(state.error)}</p>`:''}${state.page!=='dashboard'?`<div class="live-filter"><input id="live-search" aria-label="Buscar" value="${h(state.query)}" placeholder="Buscar en ${h(heading().toLowerCase())}"></div>`:''}<div class="live-view">${d?screenContent(d):info('Cargando datos…')}</div><footer class="footer">Digi-Condominio · MVP privado de desarrollo · El token permanece solo en memoria</footer></main></div>${modalHtml()}</div>`;
  if(state.query){const inp=document.getElementById('live-search');if(inp && document.activeElement!==inp)inp.setSelectionRange(state.query.length,state.query.length);}
}
async function refresh(){
  const [cs,d]=await Promise.all([request('/api/communities'),request(`${base()}/overview`)]);
  state.communities=cs.communities;state.data=d;state.error='';render();
}
async function login(form){
  state.busy=true;state.error='';render();
  try{const login=await request('/api/login','POST',Object.fromEntries(new FormData(form)));state.token=login.token;state.user=login.user;
    const result=await request('/api/communities');state.communities=result.communities;
    if(!state.communities.length)throw new Error('Tu cuenta no tiene comunidades asignadas');
    state.selected=state.communities[0].id;await refresh();
  }catch(e){state.token=null;state.error=e.message;}finally{state.busy=false;render();}
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
  const routes={incident:'incidents',unit:'units',charge:'charges',payment:'payments',announcement:'announcements',document:'documents',provider:'providers',expense:'expenses'};
  if(!routes[type])return;
  try{
    if(type==='charge'||type==='payment'||type==='expense'){data.amountMinor=amountMinor(data.amount);delete data.amount;}
    state.busy=true;state.error='';
    const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
    await request(`${base()}/${routes[type]}`,'POST',data);
    state.modal=null;state.query='';await refresh();
  }catch(e){state.error=e.message;render();}finally{state.busy=false;}
}
app.addEventListener('submit',async event=>{
  if(event.target.id==='login-form'){event.preventDefault();await login(event.target);return;}
  if(event.target.id==='create-form' && ['incident-comment','incident-status'].includes(event.target.dataset.type)){
    event.preventDefault();if(state.busy)return;
    const kind=event.target.dataset.type,target=state.incidentTarget,data=Object.fromEntries(new FormData(event.target));
    state.busy=true;event.target.querySelector('button[type=submit]').disabled=true;
    try{
      if(kind==='incident-comment')await request(`${base()}/incidents/${target}/comments`,'POST',data);
      else await request(`${base()}/incidents/${target}/status`,'PATCH',data);
      state.modal=null;state.incidentTarget=null;await refresh();
    }catch(e){state.error=e.message;render();}finally{state.busy=false;}
    return;
  }
  if(event.target.id==='create-form'){event.preventDefault();await submitCreate(event.target);return;}
  if(event.target.id==='reverse-form'){event.preventDefault();const target=state.reverseTarget;const reason=String(new FormData(event.target).get('reason')??'').trim();const button=event.target.querySelector('button[type=submit]');if(button)button.disabled=true;
    try{await request(`${base()}/${target.type}/${target.id}/reverse`,'POST',{reason});state.modal=null;state.reverseTarget=null;await refresh();}
    catch(e){state.error=e.message;render();}return;}
});
app.addEventListener('click',async event=>{
  const page=event.target.closest('[data-page]')?.dataset.page;
  if(page){state.page=page;state.error='';state.query='';state.menuOpen=false;render();return;}
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
    try{const response=await fetch(`${base()}/reports/${exportName}.csv`,{headers:{Authorization:`Bearer ${state.token}`},cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('No fue posible exportar el informe');
      const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`digi-${exportName}.csv`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
    }catch(e){state.error=e.message;render();}return;
  }
  if(event.target.closest('[data-logout]')){try{await request('/api/logout','POST');}catch{}state.token=null;state.user=null;state.data=null;state.error='';render();}
});
app.addEventListener('change',async event=>{
  if(event.target.id!=='live-community')return;
  state.selected=event.target.value;state.error='';state.query='';try{await refresh();}catch(e){state.error=e.message;render();}
});
app.addEventListener('input',event=>{
  if(event.target.id!=='live-search')return;
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
