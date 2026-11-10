"""Hosted HTTPS, cookie restore, invitations and password recovery with synthetic mail."""
import base64
import hashlib
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='digi-online-') as td:
    td=Path(td);key=td/'key.pem';cert=td/'cert.pem';mail=td/'messages.json'
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],check=True,capture_output=True)
    pem=subprocess.check_output(['openssl','x509','-in',str(cert),'-pubkey','-noout'])
    der=subprocess.run(['openssl','pkey','-pubin','-outform','DER'],input=pem,capture_output=True,check=True).stdout
    spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
    with socket.socket() as probe:probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
    origin=f'https://127.0.0.1:{port}'
    env={**os.environ,'DIGI_DB_PATH':str(td/'app.sqlite'),'DIGI_PUBLIC_ORIGIN':origin,'PORT':str(port),'TEST_TLS_KEY':str(key),'TEST_TLS_CERT':str(cert),'TEST_MAIL_PATH':str(mail)}
    server=subprocess.Popen(['node','scripts/testing/https-fixture.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    try:
        context=ssl.create_default_context(cafile=str(cert))
        for _ in range(100):
            if server.poll() is not None:raise RuntimeError(server.stderr.read().decode())
            try:urllib.request.urlopen(origin+'/api/health',context=context,timeout=.2).close();break
            except OSError:time.sleep(.05)
        else:raise RuntimeError('No inició HTTPS')
        with sync_playwright() as pw:
            binary=shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
            browser=pw.chromium.launch(executable_path=binary,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors-spki-list='+spki])
            admin_context=browser.new_context();page=admin_context.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def login(page,email,password):
                page.get_by_label('Correo electrónico',exact=True).fill(email)
                page.get_by_label('Contraseña',exact=True).fill(password)
                page.get_by_role('button',name='Ingresar al espacio privado').click()
                page.get_by_role('heading',name='Resumen',exact=True).wait_for(timeout=7000)
            page.goto(origin)
            login(page,'admin@online.test','OnlineTestPassword123!')
            cookies=admin_context.cookies()
            session=next(x for x in cookies if x['name']=='__Host-digi_session')
            assert session['httpOnly'] and session['secure']
            page.reload();page.get_by_role('heading',name='Resumen',exact=True).wait_for()
            page.get_by_role('button',name='Gestión de cuenta').click()
            page.get_by_label('Correo de la persona invitada').fill('owner@online.test')
            page.get_by_label('Condominio de la invitación').select_option(label='Condominio Inicial')
            page.get_by_role('button',name='Enviar invitación',exact=True).click()
            page.get_by_text('Invitación enviada.',exact=True).wait_for()
            messages=json.loads(mail.read_text());link=re.search(r'https://\S+',messages[-1]['text']).group()
            invited_context=browser.new_context();invited=invited_context.new_page();invited.goto(link)
            invited.get_by_label('Tu nombre',exact=True).fill('Persona invitada')
            invited.get_by_label('Nueva contraseña',exact=True).fill('InvitedTestPassword123!')
            invited.get_by_label('Repetir contraseña',exact=True).fill('InvitedTestPassword123!')
            invited.get_by_role('button',name='Aceptar invitación',exact=True).click()
            invited.get_by_text('Invitación aceptada. Ya puedes iniciar sesión.',exact=True).wait_for()
            assert '#invite=' not in invited.url
            login(invited,'owner@online.test','InvitedTestPassword123!')
            recovery_context=browser.new_context();recovery=recovery_context.new_page();recovery.goto(origin)
            recovery.get_by_role('button',name='Olvidé mi contraseña',exact=True).click()
            recovery.get_by_label('Correo electrónico',exact=True).fill('admin@online.test')
            recovery.get_by_role('button',name='Solicitar recuperación',exact=True).click()
            recovery.get_by_text('Si la cuenta existe, recibirás instrucciones por correo.',exact=True).wait_for()
            for _ in range(100):
                messages=json.loads(mail.read_text())
                candidates=[m for m in messages if '#reset=' in m['text']]
                if candidates:break
                recovery.wait_for_timeout(30)
            assert candidates,'No llegó el correo sintético de recuperación'
            reset=re.search(r'https://\S+',candidates[-1]['text']).group()
            recovery.goto(reset)
            recovery.get_by_label('Nueva contraseña',exact=True).fill('ChangedTestPassword123!')
            recovery.get_by_label('Repetir contraseña',exact=True).fill('ChangedTestPassword123!')
            recovery.get_by_role('button',name='Guardar nueva contraseña',exact=True).click()
            recovery.get_by_text('Contraseña actualizada. Inicia sesión nuevamente.',exact=True).wait_for()
            page.reload();page.get_by_role('button',name='Ingresar al espacio privado').wait_for()
            login(page,'admin@online.test','ChangedTestPassword123!')
            assert not errors,errors
            browser.close()
            print('ONLINE HTTPS OK: cookie segura, recarga, invitación, recuperación y revocación de sesión; correo sintético')
    finally:
        server.terminate();server.wait(timeout=5)
