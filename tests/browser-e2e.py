"""Browser/UI against the real Node API via an explicit testing bridge.

Chromium in this hosted environment blocks localhost navigation by administrator policy.
The page executes real source CSS/JS, while Python forwards fetch operations to the local
Node server. This is NOT evidence of conventional end-to-end browser networking.
"""
import os
import subprocess
import tempfile
import socket
import time
import urllib.request
import urllib.error
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = 43119
DIRECT = os.getenv('DIGI_E2E_MODE') == 'direct'
EMAIL='admin@example.test'; PASSWORD='VeryStrongPassword#2026'
with tempfile.TemporaryDirectory() as td:
    env={**os.environ,'DIGI_DB_PATH':f'{td}/test.sqlite','DIGI_ADMIN_EMAIL':EMAIL,'DIGI_ADMIN_PASSWORD':PASSWORD,'DIGI_COMMUNITY_NAME':'Comunidad demostración','PORT':str(PORT)}
    bootstrap=subprocess.run(['node','server/bootstrap.js'],cwd=ROOT,env=env,capture_output=True,text=True)
    assert bootstrap.returncode==0,bootstrap.stderr
    # Provision a synthetic owner via the private local store (no production credentials).
    seed='''import { Store } from './server/store.js';
const s=new Store(process.env.DIGI_DB_PATH);
const community=s.db.prepare('SELECT id FROM communities LIMIT 1').get().id;
const id=s.createUser('owner@example.test','OwnerStrongPassword#2026','Propietario de prueba');
s.setMembership(id,community,'owner');s.close();'''
    created=subprocess.run(['node','--input-type=module','-e',seed],cwd=ROOT,env=env,capture_output=True,text=True)
    assert created.returncode==0,created.stderr
    server=subprocess.Popen(['node','server/start.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    try:
        for n in range(80):
            try:
                with socket.create_connection(('127.0.0.1',PORT),.1):break
            except OSError:time.sleep(.06)
        else:raise RuntimeError('Node no inició')
        with sync_playwright() as pw:
            browser_path=(shutil.which('google-chrome') or shutil.which('google-chrome-stable') or shutil.which('chromium')) if DIRECT else '/usr/bin/chromium'
            assert browser_path, 'El runner necesita Google Chrome o Chromium preinstalado'
            browser=pw.chromium.launch(executable_path=browser_path,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
            errors=[]
            page.on('pageerror',lambda err:errors.append(str(err)))
            def proxy(data):
                requrl='http://127.0.0.1:'+str(PORT)+data['path']
                headers=data.get('headers') or {}
                body=data.get('body')
                request=urllib.request.Request(requrl, data=(body.encode() if isinstance(body,str) else None),method=data.get('method','GET'),headers=headers)
                try:
                    with urllib.request.urlopen(request,timeout=12) as resp:
                        return {'status':resp.status,'body':resp.read().decode(),'type':resp.headers.get('content-type','application/json')}
                except urllib.error.HTTPError as err:
                    return {'status':err.code,'body':err.read().decode(),'type':'application/json'}
            if not DIRECT:
                page.expose_function('testProxy',proxy)
            css=(ROOT/'src/styles.css').read_text()+'\n'+(ROOT/'src/connected.css').read_text()
            js=(ROOT/'src/connected.js').read_text()
            assert js.startswith("import { escapeHtml as h } from './domain.js';")
            js=js.replace("import { escapeHtml as h } from './domain.js';", '''const h=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));''',1)
            pre='''window.fetch=async function(path,options={}){
                 const result=await window.testProxy({path,method:options.method||'GET',headers:options.headers||{},body:options.body});
                 return new Response(result.body,{status:result.status,headers:{'content-type':result.type}});
                 };'''
            html='<!doctype html><html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body><div id="app"></div><script>'+pre+'\n'+js+'</script></body></html>'
            if DIRECT:
                response=page.goto('http://127.0.0.1:'+str(PORT)+'/',wait_until='domcontentloaded',timeout=15000)
                assert response and response.status==200
            else:
                page.set_content(html,wait_until='domcontentloaded')
            page.get_by_label('Correo electrónico').fill(EMAIL)
            page.get_by_label('Contraseña').fill(PASSWORD)
            page.get_by_role('button',name='Ingresar al espacio privado').click()
            page.get_by_role('heading',name='Resumen').wait_for(timeout=9000)
            page.get_by_role('button',name='Unidades').click()
            page.get_by_role('button',name='Añadir unidad').click()
            page.get_by_label('Código').fill('A-101')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_role('button',name='Cambiar').wait_for(timeout=9000)
            page.get_by_role('button',name='Cambiar').click()
            page.locator('select[name=ownerUserId]').select_option(label='Propietario de prueba (owner@example.test)')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Propietario de prueba').first.wait_for(timeout=9000)
            page.get_by_role('button',name='Directorio').click()
            page.get_by_role('button',name='Añadir contacto').wait_for(timeout=9000)
            page.get_by_role('button',name='Añadir contacto').click()
            page.get_by_label('Nombre completo').fill('Arrendataria de demostración')
            page.get_by_label('Relación con la unidad').select_option('tenant')
            page.get_by_label('Correo opcional').fill('tenant@example.test')
            page.get_by_label('Teléfono internacional opcional').fill('+56912345678')
            page.get_by_label('Contacto para gestiones de pago').select_option('true')
            page.get_by_label('Canal de preferencia, sin envío').select_option('email')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Arrendataria de demostración').wait_for(timeout=9000)
            page.get_by_role('button',name='Editar').click()
            page.get_by_label('Nombre completo').fill('Arrendataria actualizada')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Arrendataria actualizada').wait_for(timeout=9000)
            # Capturas solo de datos ficticios; nunca incluir registros personales reales.
            output=os.getenv('DIGI_E2E_SCREENSHOT_DIR')
            if output:
                Path(output).mkdir(parents=True,exist_ok=True)
                page.set_viewport_size({'width':1440,'height':900})
                page.screenshot(path=str(Path(output)/'digi-directorio-desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                page.screenshot(path=str(Path(output)/'digi-directorio-mobile.png'),full_page=True)
                page.set_viewport_size({'width':1440,'height':900})

            page.get_by_role('button',name='Dar de baja').click()
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Inactivo',exact=True).wait_for(timeout=9000)
            assert page.get_by_role('button',name='Editar').count()==0

            # Issue #31: private unit communication and automatic charge notice.
            page.get_by_role('button',name='Cuotas').click()
            page.get_by_role('button',name='Emitir cuota').click()
            page.get_by_label('Concepto').fill('Gastos comunes simulados')
            page.get_by_label('Importe en UM').fill('123.45')
            page.get_by_label('Vencimiento (opcional)').fill((datetime.now(timezone.utc).date()+timedelta(days=2)).isoformat())
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Gastos comunes simulados').wait_for(timeout=9000)
            page.get_by_role('button',name='Previsualizar recordatorios').click()
            page.get_by_role('button',name='Guardar 1 aviso(s) internos').wait_for(timeout=9000)
            # Capturas solo con cuotas sintéticas y sin datos bancarios reales.
            reminders_output=os.getenv('DIGI_E2E_SCREENSHOT_DIR')
            if reminders_output:
                Path(reminders_output).mkdir(parents=True,exist_ok=True)
                page.set_viewport_size({'width':1440,'height':900})
                page.screenshot(path=str(Path(reminders_output)/'digi-recordatorios-desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                page.screenshot(path=str(Path(reminders_output)/'digi-recordatorios-mobile.png'),full_page=True)
                page.set_viewport_size({'width':1440,'height':900})
            page.get_by_role('button',name='Guardar 1 aviso(s) internos').click()
            page.get_by_text('Se guardaron 1 avisos privados dentro del sistema').wait_for(timeout=9000)
            page.get_by_role('button',name='Notificaciones').click()
            page.get_by_role('button',name='Aviso privado por unidad').click()
            page.get_by_label('Título').fill('Aviso único de la unidad')
            page.get_by_label('Mensaje').fill('Mensaje ficticio para este departamento.')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Aviso guardado en la bandeja privada').wait_for(timeout=9000)
            page.get_by_role('button',name='Incidencias').click()
            page.get_by_role('heading',name='Incidencias').wait_for()
            page.get_by_role('button',name='Reportar incidencia').click()
            page.get_by_label('Título').fill('Alarma de ascensor fuera de servicio')
            page.get_by_label('Descripción').fill('El ascensor no responde al pulsador del primer piso.')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_role('heading',name='Alarma de ascensor fuera de servicio').wait_for(timeout=9000)
            page.get_by_role('button',name='Comentar').click()
            page.get_by_role('textbox',name='Comentario').fill('Se coordinó revisión con mantenimiento.')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Se coordinó revisión con mantenimiento.').wait_for(timeout=8000)
            page.get_by_role('button',name='Cambiar estado').click()
            page.get_by_label('Estado').select_option('in_progress')
            page.get_by_label('Justificación').fill('Se asignó revisión al proveedor de ascensores.')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Se asignó revisión al proveedor de ascensores.').wait_for(timeout=9000)
            # escaping XSS while preserving text
            page.get_by_role('button',name='Reportar incidencia').click()
            page.get_by_label('Título').fill('<img src=x onerror=alert(1)>')
            page.get_by_label('Descripción').fill('Texto de prueba para HTML escapado')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_role('heading',name='<img src=x onerror=alert(1)>').wait_for(timeout=9000)
            assert page.locator('.incident-card img').count()==0
            for width in [360,390,768,1440]:
                page.set_viewport_size({'width':width,'height':850})
                page.wait_for_timeout(80)
                dims=page.evaluate('({scroll:document.documentElement.scrollWidth, viewport:window.innerWidth})')
                assert dims['scroll']<=dims['viewport']+1,(width,dims)
                print('layout',width,dims)
            assert not errors,errors
            output=os.getenv('DIGI_E2E_SCREENSHOT_DIR')
            if output:
                Path(output).mkdir(parents=True,exist_ok=True)
                page.set_viewport_size({'width':1440,'height':900});page.screenshot(path=str(Path(output)/'digi-incidencias-desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(380);page.screenshot(path=str(Path(output)/'digi-incidencias-mobile.png'),full_page=True)
            # Confirm the reassigned owner sees their unit after a separate login.
            page.set_viewport_size({'width':1440,'height':900})
            page.wait_for_timeout(400)
            page.get_by_role('button',name='Salir de la sesión').click()
            page.get_by_label('Correo electrónico').fill('owner@example.test')
            page.get_by_label('Contraseña').fill('OwnerStrongPassword#2026')
            page.get_by_role('button',name='Ingresar al espacio privado').click()
            page.get_by_role('heading',name='Resumen').wait_for(timeout=9000)
            page.get_by_role('button',name='Unidades').click()
            page.get_by_text('A-101').wait_for(timeout=9000)
            assert page.get_by_role('button',name='Añadir unidad').count()==0
            assert page.get_by_role('button',name='Directorio').count()==0
            assert page.get_by_text('Arrendataria actualizada').count()==0
            page.get_by_role('button',name='Pagos informados').click()
            page.get_by_role('button',name='Informar pago').click()
            page.get_by_label('Referencia única').fill('REF-DEMO-BROWSER-001')
            page.get_by_label('Concepto').fill('Abono informado sintético')
            page.get_by_label('Importe en UM').fill('12.00')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('Pago informado para revisión').wait_for(timeout=9000)
            page.get_by_text('REF-DEMO-BROWSER-001').wait_for(timeout=9000)
            payment_output=os.getenv('DIGI_E2E_SCREENSHOT_DIR')
            if payment_output:
                Path(payment_output).mkdir(parents=True,exist_ok=True)
                page.set_viewport_size({'width':1440,'height':900})
                page.screenshot(path=str(Path(payment_output)/'digi-pagos-reportados-desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                page.screenshot(path=str(Path(payment_output)/'digi-pagos-reportados-mobile.png'),full_page=True)
                page.set_viewport_size({'width':1440,'height':900})
            page.get_by_text('informado',exact=True).wait_for(timeout=9000)
            page.get_by_role('button',name='Notificaciones').click()
            page.get_by_role('button',name='Autorizar futuros correos').first.wait_for(timeout=9000)
            assert page.get_by_role('button',name='Autorizar futuros correos').count()==2
            page.get_by_role('button',name='Autorizar futuros correos').first.click()
            page.get_by_role('button',name='Retirar autorización').wait_for(timeout=9000)
            page.get_by_text('Preferencia registrada para tu cuenta').wait_for(timeout=9000)
            page.get_by_role('button',name='Retirar autorización').click()
            page.wait_for_function("() => document.querySelectorAll('[data-consent-enabled=\"true\"]').length===2",timeout=9000)
            assert page.get_by_role('button',name='Autorizar futuros correos').count()==2
            page.get_by_role('heading',name='Nueva cuota registrada').wait_for(timeout=9000)
            page.get_by_role('heading',name='Recordatorio próximo vencimiento').wait_for(timeout=9000)
            page.get_by_role('heading',name='Aviso único de la unidad').wait_for(timeout=9000)
            assert page.get_by_text('Mensaje ficticio para este departamento.').count()==1
            assert page.get_by_role('button',name='Marcar como leída').count()==3
            page.get_by_role('button',name='Marcar como leída').first.click()
            page.wait_for_function("() => document.querySelectorAll('[data-notification-read]').length===2",timeout=9000)
            assert any('Leída' in node.inner_text() and 'No leída' not in node.inner_text()
                       for node in page.locator('.live-notice small').all())
            assert not errors,errors
            # El administrador revisa un reporte sintético y lo incorpora al
            # libro solo después de una decisión explícita.
            page.get_by_role('button',name='Salir de la sesión').click()
            page.get_by_label('Correo electrónico').fill('admin@example.test')
            page.get_by_label('Contraseña').fill('AdminStrongPassword#2026')
            page.get_by_role('button',name='Ingresar al espacio privado').click()
            page.get_by_role('heading',name='Resumen').wait_for(timeout=9000)
            page.get_by_role('button',name='Pagos informados').click()
            page.get_by_text('REF-DEMO-BROWSER-001').wait_for(timeout=9000)
            page.get_by_role('button',name='Enviar a revisión').click()
            page.get_by_label('Justificación de revisión').fill('Revisión sintética de referencia y monto')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('en revisión',exact=True).wait_for(timeout=9000)
            page.get_by_role('button',name='Registrar abono tras revisión').click()
            page.get_by_label('Justificación de revisión').fill('Comprobación administrativa sintética de prueba')
            page.get_by_role('button',name='Guardar').click()
            page.get_by_text('confirmado',exact=True).wait_for(timeout=9000)
            page.get_by_role('button',name='Pagos').click()
            page.get_by_text('REF-DEMO-BROWSER-001').wait_for(timeout=9000)
            assert not errors,errors
            print(('DIRECT' if DIRECT else 'BRIDGE')+' WEB+API OK: login admin/owner, assign owner, incidents, status, XSS, responsive, 0 JS errors')
            browser.close()
    finally:
        server.terminate();server.wait(timeout=5)
