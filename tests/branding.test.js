import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const read=path=>readFileSync(fileURLToPath(new URL("../"+path,import.meta.url)),"utf8");

test("identidad corporativa residencial e iconografía presentes en fuente y Pages",()=>{
 const html=read("index.html"),ui=read("src/ui.js"),css=read("src/styles.css");
 const logo=read("assets/brand/condominio-logo.svg"),mark=read("assets/brand/condominio-mark.svg");
 assert.match(html,/rel="icon" type="image\/svg\+xml"/);
 assert.match(html,/theme-color" content="#0D5348"/);
 assert.match(ui,/brand-mark-image/);
 assert.match(ui,/src="\.\/assets\/brand\/condominio-mark.svg"/);
 assert.match(css,/--dc-forest:#0D5348/);
 assert.match(css,/--dc-sand:#E9B894/);
 assert.match(mark,/viewBox="0 0 64 64"/);
 assert.match(logo,/DigiCondominio/);
});

test("el cambio de branding no habilita registros ni pagos en la demo",()=>{
 const html=read("index.html"),css=read("src/styles.css");
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.doesNotMatch(html,/type="password"/i);
 assert.match(css,/DigiCondominio \/ comunidad/);
});
