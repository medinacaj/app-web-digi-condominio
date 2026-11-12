"""SaaS account contexts and administration against the real backend."""
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='digi accounts ') as td:
    with socket.socket() as probe:
        probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
    env={**os.environ,'DIGI_DB_PATH':str(Path(td)/'accounts.sqlite'),'PORT':str(port)}
    seed="""import {Store} from './server/store.js';
const s=new Store(process.env.DIGI_DB_PATH);
const admin=s.createUser('admin@saas.test','AccountBrowserPassword123!');
const manager=s.createUser('manager@saas.test','AccountBrowserPassword123!','Solo cuenta');
const member=s.createUser('owner@saas.test','AccountBrowserPassword123!','Residente de prueba');
const a=s.createAccount(admin,{name:'Administradora Alfa',kind:'management_company'}).id;
const b=s.createAccount(admin,{name:'Condominio Independiente Beta',kind:'independent'}).id;
s.changeAccountMember(admin,b,manager,'account_admin');
for(const [name,account] of [['Alfa Uno',a],['Alfa Dos',a],['Beta Único',b]]){
 const c=s.createCommunity(name,'',account);s.setMembership(admin,c,'admin');
 s.addUnit(admin,c,{code:name==='Beta Único'?'B-101':'A-'+name,kind:'Departamento'});
 if(name==='Alfa Uno')s.setMembership(member,c,'owner');
}
s.close();"""
    subprocess.run(['node','--input-type=module','-e',seed],cwd=ROOT,env=env,check=True,capture_output=True)
    server=subprocess.Popen(['node','server/start.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    origin=f'http://127.0.0.1:{port}'
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(origin+'/api/health',timeout=.2).close();break
            except OSError:time.sleep(.05)
        else:raise RuntimeError('Servidor no disponible')
        with sync_playwright() as pw:
            binary=shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
            browser=pw.chromium.launch(executable_path=binary,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            page=browser.new_page(viewport={'width':1440,'height':900})
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(origin)
            page.get_by_label('Correo electrónico').fill('admin@saas.test')
            page.get_by_label('Contraseña').fill('AccountBrowserPassword123!')
            page.get_by_role('button',name='Ingresar al espacio privado').click()
            account=page.get_by_label('Cuenta seleccionada')
            account.wait_for(timeout=5000)
            account.select_option(label='Administradora Alfa')
            page.get_by_role('heading',name='Resumen',exact=True).wait_for()
            communities=page.get_by_label('Comunidad seleccionada')
            communities.locator('option').filter(has_text='Alfa Uno').wait_for(state='attached')
            assert communities.locator('option').count()==2
            communities.select_option(label='Alfa Dos')
            page.get_by_text('A-Alfa Dos',exact=True).wait_for()
            account.select_option(label='Condominio Independiente Beta')
            page.get_by_text('B-101',exact=True).wait_for()
            assert page.get_by_text('A-Alfa Dos',exact=True).count()==0
            page.get_by_role('button',name='Gestión de cuenta').click()
            page.get_by_role('heading',name='Gestión de cuenta',exact=True).wait_for()
            page.get_by_label('Nombre del nuevo condominio').fill('Beta Nuevo')
            page.get_by_role('button',name='Crear condominio',exact=True).click()
            page.get_by_label('Condominio para asignar').select_option(label='Beta Nuevo')
            page.get_by_label('Usuario para asignar').select_option(label='Administración (admin@saas.test)')
            page.get_by_label('Permiso en el condominio').select_option('admin')
            page.get_by_role('button',name='Guardar asignación',exact=True).click()
            page.get_by_label('Comunidad seleccionada').locator('option').filter(has_text='Beta Nuevo').wait_for(state='attached')
            # Hold an old overview response, switch account, then release the response.
            page.get_by_role('button',name='Unidades',exact=False).click()
            page.get_by_label('Comunidad seleccionada').select_option(label='Beta Único')
            page.get_by_text('B-101',exact=True).wait_for()
            old_id=page.get_by_label('Comunidad seleccionada').input_value()
            held=[]
            def hold(route):
                held.append((route,route.fetch()))
            page.route(f'**/api/communities/{old_id}/overview',hold)
            page.get_by_label('Comunidad seleccionada').dispatch_event('change')
            for _ in range(60):
                if held:break
                page.wait_for_timeout(50)
            assert held,'No se capturó respuesta retrasada'
            page.get_by_label('Cuenta seleccionada').select_option(label='Administradora Alfa')
            page.get_by_text('A-Alfa Dos',exact=True).wait_for()
            for route,response in held:route.fulfill(response=response)
            page.wait_for_timeout(150)
            assert page.get_by_text('B-101',exact=True).count()==0
            assert page.get_by_label('Cuenta seleccionada').locator('option:checked').inner_text()=='Administradora Alfa'
            page.unroute(f'**/api/communities/{old_id}/overview',hold)
            # A stale network failure must not erase the successfully loaded account.
            current_id=page.get_by_label('Comunidad seleccionada').input_value()
            held_fail=[]
            def hold_fail(route):
                held_fail.append(route)
            page.route(f'**/api/communities/{current_id}/overview',hold_fail)
            page.get_by_label('Comunidad seleccionada').dispatch_event('change')
            for _ in range(60):
                if held_fail:break
                page.wait_for_timeout(50)
            assert held_fail
            page.get_by_label('Cuenta seleccionada').select_option(label='Condominio Independiente Beta')
            page.get_by_label('Comunidad seleccionada').select_option(label='Beta Único')
            page.get_by_text('B-101',exact=True).wait_for()
            for route in held_fail:route.abort()
            page.wait_for_timeout(150)
            page.get_by_role('button',name='Unidades',exact=False).click()
            page.get_by_text('B-101',exact=True).wait_for(timeout=3000)
            page.unroute(f'**/api/communities/{current_id}/overview',hold_fail)
            # An export started in one account must not download after switching context.
            export_id=page.get_by_label('Comunidad seleccionada').input_value()
            exports=[];downloads=[]
            page.on('download',lambda download:downloads.append(download.suggested_filename))
            def hold_export(route):exports.append((route,route.fetch()))
            page.route(f'**/api/communities/{export_id}/reports/units.csv',hold_export)
            page.get_by_role('button',name='Exportar CSV',exact=True).click()
            for _ in range(60):
                if exports:break
                page.wait_for_timeout(50)
            assert exports
            page.get_by_label('Cuenta seleccionada').select_option(label='Administradora Alfa')
            page.get_by_text('A-Alfa Dos',exact=True).wait_for()
            for route,response in exports:route.fulfill(response=response)
            page.wait_for_timeout(300)
            assert not downloads,'Un CSV del contexto anterior se descargó después del cambio'
            page.unroute(f'**/api/communities/{export_id}/reports/units.csv',hold_export)
            # A response held before logout cannot repopulate the signed-out page.
            logout_id=page.get_by_label('Comunidad seleccionada').input_value()
            logout_pending=[]
            def hold_logout(route):logout_pending.append((route,route.fetch()))
            page.route(f'**/api/communities/{logout_id}/overview',hold_logout)
            page.get_by_label('Comunidad seleccionada').dispatch_event('change')
            for _ in range(60):
                if logout_pending:break
                page.wait_for_timeout(50)
            assert logout_pending
            page.get_by_role('button',name='Salir de la sesión').click()
            for route,response in logout_pending:route.fulfill(response=response)
            page.wait_for_timeout(150)
            page.get_by_role('button',name='Ingresar al espacio privado').wait_for()
            assert page.get_by_label('Cuenta seleccionada').count()==0
            page.unroute(f'**/api/communities/{logout_id}/overview',hold_logout)
            # Account-only administrator can manage metadata without an operational grant.
            page.get_by_label('Correo electrónico').fill('manager@saas.test')
            page.get_by_label('Contraseña').fill('AccountBrowserPassword123!')
            page.get_by_role('button',name='Ingresar al espacio privado').click()
            page.get_by_role('heading',name='Gestión de cuenta',exact=True).wait_for()
            assert page.get_by_label('Comunidad seleccionada').locator('option').count()==0
            assert page.get_by_role('button',name='Cuotas',exact=False).count()==0
            page.get_by_label('Nombre del nuevo condominio').wait_for()
            page.get_by_label('Permiso de cuenta de manager@saas.test').select_option('member')
            page.get_by_text('No tienes permiso para administrar esta cuenta.',exact=True).wait_for()
            assert page.get_by_label('Nombre del nuevo condominio').count()==0
            assert not errors,errors
            browser.close()
            print('SAAS WEB OK: dos modelos, varios condominios, creación/asignación y respuesta obsoleta descartada; 0 errores JS')
    finally:
        server.terminate();server.wait(timeout=5)
