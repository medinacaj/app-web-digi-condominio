"""First-run setup, real login, unit creation and persistence after launcher restart."""
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='digi wizard ') as td:
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    env = {**os.environ, 'PORT': str(port), 'DIGI_DB_PATH': str(Path(td) / 'demo.sqlite'), 'DIGI_OPEN_BROWSER': '0'}
    origin = f'http://127.0.0.1:{port}'
    def start():
        process = subprocess.Popen(['node', 'server/local-launcher.js'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError(process.stderr.read().decode())
            try:
                with urllib.request.urlopen(origin, timeout=.3) as response:
                    if response.status == 200:
                        return process
            except OSError:
                time.sleep(.05)
        process.terminate()
        process.wait(timeout=5)
        raise RuntimeError('No inició el asistente')
    server = start()
    try:
        with sync_playwright() as pw:
            browser_path = shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
            assert browser_path, 'Chromium o Chrome requerido'
            browser = pw.chromium.launch(executable_path=browser_path, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width': 390, 'height': 844})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin)
            page.get_by_label('Nombre de la comunidad').fill('Comunidad de prueba Windows')
            page.get_by_label('Correo electrónico').fill('admin@wizard.test')
            page.get_by_label('Contraseña', exact=True).fill('SyntheticWizardPassword123!')
            page.get_by_label('Repetir contraseña').fill('SyntheticWizardPassword123!')
            page.get_by_role('button', name='Crear mi cuenta y comenzar').click()
            page.get_by_role('button', name='Ingresar al espacio privado').wait_for()
            def login():
                page.get_by_label('Correo electrónico').fill('admin@wizard.test')
                page.get_by_label('Contraseña').fill('SyntheticWizardPassword123!')
                page.get_by_role('button', name='Ingresar al espacio privado').click()
                page.get_by_role('heading', name='Resumen').wait_for()
            login()
            page.set_viewport_size({'width': 1440, 'height': 900})
            page.get_by_role('button', name='Unidades').click()
            page.get_by_role('button', name='Añadir unidad').click()
            page.get_by_label('Código').fill('PC-101')
            page.get_by_role('button', name='Guardar', exact=True).click()
            page.get_by_text('PC-101', exact=True).wait_for()
            server.terminate()
            server.wait(timeout=5)
            server = start()
            page.reload()
            page.get_by_role('button', name='Ingresar al espacio privado').wait_for()
            assert page.get_by_label('Repetir contraseña').count() == 0
            login()
            page.get_by_role('button', name='Unidades').click()
            page.get_by_text('PC-101', exact=True).wait_for()
            assert not errors, errors
            browser.close()
            print('LOCAL WIZARD OK: configuración, login, unidad, reinicio y persistencia; 0 errores JS')
    finally:
        if server.poll() is None:
            server.terminate()
            server.wait(timeout=5)
