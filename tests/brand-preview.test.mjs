import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = relative => readFileSync(fileURLToPath(new URL("../" + relative, import.meta.url)), "utf8");
test("DigiCondominio tiene identidad y favicon diferenciados", () => {
  const html=read("index.html"),ui=read("src/ui.js"),css=read("src/styles.css");
  const mark=read("assets/brand/condominio-mark.svg"),logo=read("assets/brand/condominio-logo.svg");
  assert.match(html, /rel="icon" type="image\/svg\+xml"/);
  assert.match(html, /DigiCondominio \| Gestión de comunidades/);
  assert.match(html, /theme-color" content="#0D5348"/);
  assert.match(ui, /brand-mark-image/);
  assert.match(ui, /assets\/brand\/condominio-mark.svg/);
  assert.match(css, /--dc-forest:#0D5348/);
  assert.match(css, /--dc-sand:#E9B894/);
  assert.match(css, /\.intro-row::before/);
  assert.match(mark, /<svg/);
  assert.match(mark, /viewBox="0 0 64 64"/);
  assert.match(logo, /DigiCondominio/);
});
test("la vista previa conserva datos sintéticos y no incorpora autenticación falsa",()=>{
  const html=read("index.html"),ui=read("src/ui.js");
  assert.match(html,/Demo de Digi-Condominio con datos ficticios/);
  assert.match(ui,/Vista de demostración/);
  assert.match(ui,/sin conexión a producción/i);
  assert.doesNotMatch(html,/<input[^>]*type=["']password|api\/auth\/register/i);
});
