"""Build a clean portable ZIP with an official, checksum-verified Node Windows ZIP.

Usage: python scripts/package-windows.py NODE_ZIP SHASUMS256.txt OUTPUT.zip
Download both inputs from the same https://nodejs.org/dist/v24.x.y/ directory.
"""
import hashlib
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build(runtime_zip, checksums, output):
    runtime_zip, checksums, output = map(Path, (runtime_zip, checksums, output))
    if not re.fullmatch(r'node-v24\.\d+\.\d+-win-x64\.zip', runtime_zip.name):
        raise ValueError('Expected official Node 24 LTS Windows x64 ZIP')
    expected = None
    for line in checksums.read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        if name.lstrip('*') == runtime_zip.name:
            expected = digest
    with runtime_zip.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if expected is None or actual != expected:
        raise ValueError('Node SHA-256 verification failed; package not created')
    # Explicit release manifest: never pick up future scratch scripts or private notes.
    names = (
        'package.json', 'index.html', 'Iniciar Digi-Condominio.cmd', 'LEEME-WINDOWS.txt',
        'README.md', 'SECURITY.md', 'README_INICIAR_AQUI.md', 'ESTADO_ACTUAL.md',
        'CONTEXTO_MAESTRO.md', 'DECISIONES_Y_CAMBIOS.md', 'PROMPT_REANUDACION.md',
        'INFORME_TRANSFERENCIA.md',
        'server/start.js', 'server/local-launcher.js', 'server/account-migration.js',
        'server/migrate-accounts.js', 'server/provision-account.js', 'server/identity.js', 'server/web-security.js',
        'server/pricing.js', 'server/subscriptions.js', 'server/set-subscription.js', 'server/mailer.js',
        'server/hosted-config.js', 'server/hosted-start.js', 'server/hosted-launch.js', 'server/store.js', 'server/app.js',
        'server/report.js', 'server/bootstrap.js', 'server/backup.js', 'server/add-user.js',
        'server/import-csv.js', 'server/secure-backup.js', 'server/secure-backup-cli.js',
        'server/restore-backup-cli.js',
        'src/domain.js', 'src/ui.js', 'src/demo-data.js', 'src/main.js', 'src/entry.js',
        'src/connected.js', 'src/styles.css', 'src/connected.css',
        'docs/MVP_LOCAL.md', 'docs/RESPALDOS_CIFRADOS.md', 'docs/BACKLOG_MVP.md',
        'docs/AUDITORIA_INICIAL.md', 'docs/ASIGNACIONES.md', 'docs/PROTOTIPO_WEB.md',
        'docs/INCIDENCIAS.md', 'docs/SAAS_BASE.md', 'docs/ONLINE_PILOT.md',
    )
    files = [ROOT / name for name in names]
    output.parent.mkdir(parents=True, exist_ok=True)
    prefix = 'Digi-Condominio/'
    with zipfile.ZipFile(runtime_zip) as source:
        base = runtime_zip.stem + '/'
        selected = [base + 'node.exe', base + 'LICENSE']
        for name in selected:
            if name not in source.namelist():
                raise ValueError(f'Missing runtime file {name}')
        with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
            for path in files:
                archive.write(path, prefix + path.relative_to(ROOT).as_posix())
            for name in selected:
                archive.writestr(prefix + 'runtime/' + Path(name).name, source.read(name))
            archive.writestr(prefix + 'runtime/PROVENANCE.txt',
                f'Source: https://nodejs.org/dist/{runtime_zip.name.split("-win-")[0].removeprefix("node-")}/{runtime_zip.name}\n'
                f'Archive SHA-256: {actual}\nSHA-256 matched the supplied SHASUMS256.txt. Obtain both inputs from the official HTTPS source above.\n')
    print(f'{output}: {output.stat().st_size:,} bytes; Node SHA-256 verified')

if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    build(*sys.argv[1:])
