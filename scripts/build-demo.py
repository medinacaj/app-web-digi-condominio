"""Build a static, synthetic-only demo for GitHub Pages, including project subpaths."""
import shutil
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(destination):
    dest=Path(destination)
    dest.mkdir(parents=True,exist_ok=False)
    (dest/'src').mkdir()
    for name in ['main.js','ui.js','domain.js','demo-data.js','styles.css']:
        shutil.copyfile(ROOT/'src'/name,dest/'src'/name)
    html=(ROOT/'index.html').read_text().replace('./src/entry.js','./src/main.js').replace('  <link rel="stylesheet" href="./src/connected.css" />\n','').replace('Plataforma local privada de gestión de condominios, con autenticación y permisos por comunidad.','Demo de Digi-Condominio con datos ficticios, sin cuentas ni pagos reales.')
    (dest/'index.html').write_text(html)
    (dest/'.nojekyll').touch()
    ui=dest/'src/ui.js';ui.write_text(ui.read_text().replace('Entorno privado','Datos ficticios'))
if __name__=='__main__':build(sys.argv[1])
