// Tests du dossier lisible. Les valeurs attendues sont lues dans la fixture JSON
// (et, pour les textes officiels, dans le texte téléchargé de la nomenclature),
// pas dans le code qui rend le document. Le document rendu est en anglais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { dossierHtml } from '../public/dossier.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(DIR, '../essais/modules/dossier-exemple.json');
const RENDU = path.join(DIR, '../essais/modules/dossier-exemple.html');
const NC = path.join(DIR, '../essais/arbre/nc2026.txt');
const RAW = path.join(DIR, '../essais/modules/obligations-raw');
const d = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const html = dossierHtml(d);

// Échappement de référence, écrit ici à part de celui du module.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const a = (texte, attendu, quoi) => assert.ok(texte.includes(esc(attendu)), `${quoi} absent du document : ${attendu}`);
const INTERDITS = ['undefined', 'null', 'NaN', '[object Object]'];
const NON_VALIDE = 'Proposal not validated';
const INTROUVABLE = /(is|are) not found word for word/;
// Toutes les adresses http(s) de la fixture, où qu'elles soient.
function urls(o, out = []) {
  if (typeof o === 'string') { if (/^https?:\/\//.test(o)) out.push(o); } else if (o && typeof o === 'object') for (const v of Object.values(o)) urls(v, out);
  return out;
}

test('fixture : chaque valeur de fait est dans le document', () => {
  const faits = Object.values(d.caracteristiques);
  assert.ok(faits.length >= 4);
  for (const f of faits) a(html, f.valeur, 'valeur de fait');
});

test('fixture : chaque adresse de source est dans le document, en clair et en lien', () => {
  const u = [...new Set(urls(d))];
  assert.ok(u.length >= 4, 'la fixture doit porter plusieurs adresses');
  for (const x of u) { a(html, x, 'adresse'); assert.ok(html.includes(`href="${esc(x)}"`), 'lien absent : ' + x); }
});

test('fixture : chaque question restante et le nom de la personne qui valide', () => {
  assert.ok(d.questions_restantes.length >= 2);
  for (const q of d.questions_restantes) { a(html, q.question, 'question restante'); a(html, q.pourquoi, 'raison de la question'); }
  a(html, `Proposal validated by ${d.validated_by} on 4 October 2026`, 'statut de validation');
});

test('fixture : sections dans l\'ordre, niveau atteint, confiance jamais en pourcentage', () => {
  const titres = ['Conclusion', 'Technical description and documents', 'Confirmed facts', 'Reasoning', 'Alternatives set aside', 'Evidence', 'Close official rulings', 'Obligations and duties', 'Open questions', 'History', 'Validation'];
  let pos = -1;
  titres.forEach((titre, i) => { const p = html.indexOf(`<span class="n">${i + 2}.</span> ${titre}</h2>`); assert.ok(p > pos, 'section absente ou mal placée : ' + titre); pos = p; });
  a(html, 'Six digits only, national code not established', 'niveau atteint');
  assert.ok(!html.includes('National nomenclature') && !html.includes('Country nomenclature'), 'un code à six chiffres ne doit pas être présenté au niveau du pays');
  assert.ok(html.includes('Confidence returned by the API'), 'libellé de la confiance');
  for (const tour of d.tours) { a(html, tour.request_id, 'identifiant de requête'); if (tour.confiance !== null) assert.ok(html.includes(`<td>${tour.confiance}</td>`), 'confiance recopiée telle quelle'); }
  // Un taux de droit s'écrit en pourcentage ; la confiance, jamais : on regarde le tableau des tours.
  const tableTours = html.slice(html.indexOf('Evaluation rounds'), html.indexOf('Robustness tests'));
  assert.ok(tableTours.includes('Confidence returned by the API') && !tableTours.includes('%'), 'aucun pourcentage dans le tableau des tours');
  assert.ok(!/probabilit|likelihood|\bchances?\b|\bodds\b/i.test(html), 'la confiance ne se présente pas comme une probabilité');
  assert.ok(html.includes('A close ruling is not proof.'), 'mise en garde sur les décisions');
  a(html, d.avertissement, "avertissement de l'API");
  for (const m of d.obligations.manquants) a(html, m, 'composante inconnue');
  a(html, d.graphe.blocage.question, "point d'arrêt");
  assert.ok(html.includes('<span class="etiq alerte">no supporting document</span>'), 'le fait saisi à la main est marqué sans pièce');
  assert.equal(html.split('<span class="etiq alerte">no supporting document</span>').length - 1, 1, 'un seul fait est sans pièce dans la fixture');
});

test('fixture : passage déclaré faux barré, passages cités retrouvés dans les pièces', () => {
  const faux = d.pieces.passages_declares_faux[0].quote;
  assert.ok(html.includes(`<del>${esc(faux)}</del>`), 'le passage est barré à sa place dans la pièce');
  assert.ok(!html.includes('passage attributed') && !html.includes('passages attributed'), 'aucun passage de la fixture ne doit être retiré');
  for (const f of Object.values(d.caracteristiques)) for (const q of f.passages) assert.ok(html.includes(`“${esc(q)}”`), 'passage cité absent : ' + q);
  for (const mot of INTERDITS) assert.ok(!html.includes(mot), 'mot interdit dans le rendu de la fixture : ' + mot);
  assert.ok(!html.includes('—'), 'aucun tiret cadratin');
});

test('fixture : le document est en anglais, sans libellé français', () => {
  assert.ok(html.includes('<html lang="en">'));
  const txt = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/[àâçéèêëîïôùûœ«»]/i.test(txt), 'caractère français dans le rendu de la fixture : ' + (txt.match(/.{0,30}[àâçéèêëîïôùûœ«»].{0,30}/i) || [''])[0]);
  for (const mot of ['Non renseigné', 'Proposition', 'pièce', 'Décision', 'Étape', 'Aucun', ' : ', ' ; ']) assert.ok(!txt.includes(mot), 'reste de français : ' + mot);
});

test('fixture : les textes officiels cités existent mot pour mot dans la nomenclature téléchargée', { skip: !existsSync(NC) && 'essais/arbre/nc2026.txt absent' }, () => {
  const nc = readFileSync(NC, 'utf8');
  const textes = [...d.graphe.chemin.flatMap((e) => e.textes.map((x) => x.texte)), ...d.preuves.map((p) => p.extrait), ...d.alternatives.map((x) => x.libelle), d.libelle];
  assert.ok(textes.length >= 7);
  for (const x of textes) assert.ok(typeof x === 'string' && x.length >= 12 && nc.includes(x), 'texte introuvable dans nc2026.txt : ' + x);
  // La version annoncée pour ces extraits est celle du règlement dont ils sont recopiés.
  for (const p of d.preuves) assert.ok(p.url.endsWith('CELEX:' + p.version), 'version et adresse de la preuve ne désignent pas le même texte');
});

test('fixture : obligations et droits se retrouvent dans les réponses enregistrées de l\'API', { skip: !existsSync(path.join(RAW, 'cn-fr-obligations.json')) && 'réponses enregistrées absentes' }, () => {
  const brut = (n) => JSON.parse(readFileSync(path.join(RAW, n + '.json'), 'utf8'));
  const ob = brut('cn-fr-obligations'), du = brut('cn-fr-duties');
  assert.ok(ob.path.includes('code=' + d.code) && ob.path.includes('country=' + d.destination), 'les réponses enregistrées portent sur un autre code ou un autre pays');
  const titres = [...ob.body.data.legally_required, ...ob.body.data.contractually_expected];
  assert.ok(d.obligations.obligations.length >= 2);
  for (const o of d.obligations.obligations) {
    const source = titres.find((x) => x.title === o.titre);
    assert.ok(source, 'obligation absente de la réponse de l\'API : ' + o.titre);
    if (o.reference !== null) assert.equal(o.reference, source.regulation);
    assert.equal(o.origine === 'deduite_par_un_modele', source.inferred === true, 'origine de l\'obligation');
    a(html, o.titre, 'intitulé d\'obligation');
  }
  const r = du.body.data.resolution;
  assert.equal(d.obligations.droits.taux_min, r.duty_pct_min);
  assert.equal(d.obligations.droits.taux_max, r.duty_pct_max);
  assert.equal(d.obligations.droits.lignes_lues, r.line_count);
  assert.equal(d.obligations.droits.source_url, du.body.data.source_url);
  assert.equal(d.obligations.droits.base_legale, du.body.data.source);
  // Aucune obligation de la fixture n'a de document source : le document doit le dire sur chacune.
  const sansSource = d.obligations.obligations.filter((o) => o.sourcee === false).length;
  assert.equal(html.split('<span class="etiq alerte">no source document</span>').length - 1, sansSource);
  // Chaque obligation déduite par un modèle est étiquetée comme telle.
  const deduites = d.obligations.obligations.filter((o) => o.origine === 'deduite_par_un_modele').length;
  assert.equal(html.split('<span class="etiq alerte">inferred by a model, to be verified</span>').length - 1, deduites);
});

test('un passage introuvable dans les pièces est retiré et compté, pas affiché', () => {
  const x = structuredClone(d);
  x.caracteristiques.power_w.passages = ['Total output: 90W Max'];
  x.graphe.chemin[0].citation = 'Sortie alternative 230 V';
  const h = dossierHtml(x);
  assert.ok(!h.includes('90W Max') && !h.includes('Sortie alternative 230 V'), 'le passage inventé ne doit pas apparaître');
  assert.ok(h.includes('2 passages attributed to the product documents are not found word for word'), 'le compte des retraits est annoncé');
});

test('dossier minimal : rien que sku et destination', () => {
  const h = dossierHtml({ sku: 'MIN-1', destination: 'FR' });
  for (const mot of INTERDITS) assert.ok(!h.includes(mot), 'mot interdit dans le rendu minimal : ' + mot);
  assert.ok(h.startsWith('<!doctype html>') && h.includes('MIN-1') && h.includes('France (FR)'));
  assert.ok(h.includes('Not provided') && h.includes(NON_VALIDE));
  assert.ok(!/validated/i.test(h.replaceAll(NON_VALIDE, '')), 'un dossier non validé n\'écrit jamais « validated »');
  assert.ok(!h.includes('Obligations and duties'), 'section absente omise');
  assert.ok(h.includes('No code proposed') && h.includes('No code established'));
});

test('formes inattendues : valeurs vides, tableaux de chaînes, objets inconnus', () => {
  const h = dossierHtml({
    sku: 'X', destination: 'ZZ', code: null, validated_at: '2026-10-04T10:00:00Z', validated_by: '   ', tours: [null, { confiance: NaN, secondes: undefined }, 'texte'],
    caracteristiques: { poids: 12, vide: null, objet: { valeur: { a: 1, b: [2, 3] } } }, graphe: { chemin: [null, { reponse: true }], blocage: { question: null, options: ['a', null] } },
    alternatives: ['850440', null], preuves: [{}], decisions_officielles_proches: [{ applicabilite: {} }, null], obligations: { obligations: [{ x: { y: null } }, 'texte libre'], droits: 0, manquants: [null] },
    questions_restantes: ['Une question'], epreuves: [{}], autres_destinations: [{ pays: null }], photo: {}, pieces: { passages_declares_faux: ['faux'] },
  });
  for (const mot of INTERDITS) assert.ok(!h.includes(mot), 'mot interdit : ' + mot);
  assert.ok(!/validated/i.test(h.replaceAll(NON_VALIDE, '')), 'une date sans nom ne vaut pas validation');
  assert.ok(h.includes('a: 1; b: 2, 3') && h.includes('Une question'));
});

test('injection : une balise script dans un champ est échappée, une adresse non http ne devient pas un lien', () => {
  const S = '<script>alert(1)</script>';
  const h = dossierHtml({
    sku: S, destination: S, code: S, system: S, status_api: S, validated_by: S, validated_at: S, request_id: S, libelle: S, version_nomenclature: S, niveau_hint: S, avertissement: S,
    pieces: { description: S + ' texte', fiche_technique: S, passages_declares_faux: [{ source: 'description', quote: S, sujet: S }] }, photo: { fichier: S, non_lu: [S] },
    caracteristiques: { [S]: { valeur: S, provenance: S, detail: S, passages: [S] } },
    graphe: { version: S, statut_version: S, resultat: { statut: S, code: S }, chemin: [{ question: S, reponse: S, textes: [{ ref: S, texte: S, url: 'javascript:alert(1)' }], citation: S, source: 'description' }], blocage: { question: S, options: { [S]: [S] } } },
    alternatives: [{ code: S, libelle: S, raison: S }], preuves: [{ ref: S, url: 'https://exemple.test/"onmouseover="alert(1)', extrait: S, version: S }],
    decisions_officielles_proches: [{ ruling_id: S, source: S, official_code: S, ruling_date: S, url: S, similarity: S, applicabilite: { verdict: S, motif: S, meme_juridiction: S, points_communs: [{ aspect: S, produit: { citation: S }, decision: { citation: S } }], differences: [{ aspect: S, decision: { citation: S }, pourquoi_ca_compte: S }] } }],
    obligations: { obligations: [{ intitule: S, [S]: S }, S], droits: { [S]: S }, cout: S, manquants: [S] }, questions_restantes: [{ question: S, pourquoi: S }],
    tours: [{ cause: S, statut: S, code_retenu: S, confiance: S, request_id: S, secondes: S }], epreuves: [{ type: S, input: S, before: S, after: S, verdict: S }], autres_destinations: [{ pays: S, statut: S, code: S, nomenclature: S, erreur: S }],
  });
  assert.ok(!/<script/i.test(h), 'aucune balise script dans le document');
  assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!/href="javascript:/i.test(h), 'une adresse javascript: ne devient pas un lien');
  assert.ok(!h.includes('"onmouseover="'), 'un guillemet dans une adresse ne ferme pas l\'attribut');
});

test('le fichier rendu sur le disque est bien le rendu de la fixture', { skip: !existsSync(RENDU) && 'dossier-exemple.html pas encore rendu' }, () => {
  assert.equal(readFileSync(RENDU, 'utf8'), html);
});

test('le module ne touche pas au DOM et le document n\'appelle rien d\'extérieur', () => {
  const src = readFileSync(path.join(DIR, '../public/dossier.js'), 'utf8');
  assert.ok(!/\b(document|window)\.[a-zA-Z]+\s*[(=.[]|localStorage|navigator\./.test(src));
  assert.ok(!/<(script|link|img|iframe)\b/i.test(html) && !/@import|url\(/i.test(html));
});

// ---------------------------------------------------------------------------
// Défauts reproduits par la relecture adverse. Chaque test part du scénario du
// relecteur : les valeurs attendues sont celles du scénario, pas celles du code.
// ---------------------------------------------------------------------------

// Texte lisible du document : sans la feuille de style ni les balises.
const lisible = (h) => h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const rend = (modif) => { const x = structuredClone(d); modif(x); return dossierHtml(x); };
const partie = (h, de, a2) => { const i = h.indexOf(de); const j = a2 ? h.indexOf(a2, i) : -1; return h.slice(i, j < 0 ? undefined : j); };
const MIN = { sku: 'A', destination: 'FR' };

test('défaut 1 : le statut de la version de l\'arbre est recopié, jamais interprété', () => {
  for (const s of ['not approved', 'disapproved', 'pending approval', 'approved', 'non approuvée', d.graphe.statut_version]) {
    const txt = lisible(rend((x) => { x.graphe.statut_version = s; }));
    assert.ok(txt.includes(`“${s}”`), 'statut reçu absent : ' + s);
    assert.ok(!/approved version|working version|version approuvée|version de travail/i.test(txt), 'le statut ne doit pas être paraphrasé : ' + s);
  }
  // Le libellé d'honnêteté de la fixture garde sa force : rédigé par IA, non relu par un déclarant.
  assert.ok(/drafted by AI/.test(d.graphe.statut_version) && /not reviewed by a customs declarant/.test(d.graphe.statut_version));
});

test('défaut 2 : seule une personne nommée vaut validation', () => {
  for (const v of [false, 0, true, { id: 7 }, 'null', 'undefined', 'true', 12, ['x'], '   ', '42', 'yes', 'no', 'oui']) {
    const h = dossierHtml({ ...MIN, validated_by: v, validated_at: '2026-10-04T10:00:00Z' });
    assert.ok(h.includes(NON_VALIDE), 'devrait être non validée : ' + JSON.stringify(v));
    assert.ok(!lisible(h).includes('validated by') && !h.includes('class="statut oui"'), 'validation affichée à tort : ' + JSON.stringify(v));
  }
  // Témoin : un nom écrit valide bien.
  const ok = dossierHtml({ ...MIN, validated_by: 'Camille Durand' });
  assert.ok(lisible(ok).includes('Proposal validated by Camille Durand, date not provided') && ok.includes('class="statut oui"'));
});

test('défaut 3 : les libellés de source écrits par l\'app sont reconnus, en anglais comme en français', () => {
  for (const [fiche, description] of [['Datasheet', 'Catalog description'], ['Fiche technique', 'Description du catalogue']]) {
    const h = rend((x) => {
      x.graphe.chemin[0].source = fiche;
      x.graphe.chemin[1].source = description; x.graphe.chemin[1].citation = 'USB-C wall power adapter';
    });
    assert.ok(h.includes(`“${esc(d.graphe.chemin[0].citation)}”</blockquote>`) && h.includes('“USB-C wall power adapter”</blockquote>'), 'citations exactes retirées à tort : ' + fiche);
    assert.ok(!INTROUVABLE.test(lisible(h)), 'aucun passage ne doit être déclaré introuvable : ' + fiche);
    // Témoin : sous le bon libellé, un passage absent de la pièce nommée reste retiré.
    const ko = rend((x) => { x.graphe.chemin[0].source = description; });
    assert.ok(lisible(ko).includes('1 passage attributed to the product documents is not found word for word'), 'témoin : ' + description);
  }
});

test('défaut 3 bis : une réponse donnée sans pièce n\'est jamais citée comme pièce, quel que soit le libellé', () => {
  for (const source of ['réponse du marchand, sans pièce', 'merchant answer, no supporting document', 'merchant answer, without evidence', 'answer from the merchant, no document']) {
    const h = lisible(rend((x) => { x.graphe.chemin[0].source = source; }));
    const etape = partie(h, 'Step 1.', 'Step 2.');
    assert.ok(etape.includes('Answer given by a person: no product document establishes it.'), 'réponse sans pièce non signalée : ' + source);
    assert.ok(!etape.includes('What establishes it in the product documents'), 'réponse sans pièce citée comme pièce : ' + source);
  }
  // Un fait dont la provenance dit « sans pièce », dans l'une ou l'autre langue, est étiqueté.
  for (const provenance of ['Sans pièce', 'No supporting document', 'No evidence', 'No document']) {
    const h = dossierHtml({ ...MIN, caracteristiques: { weight_g: { valeur: 112, provenance, passages: [] } } });
    assert.equal(h.split('<span class="etiq alerte">no supporting document</span>').length - 1, 1, 'provenance non reconnue : ' + provenance);
  }
});

test('défaut 4 : révocation, expiration et rejets d\'une décision sont affichés, le verdict est en clair', () => {
  const h = rend((x) => {
    Object.assign(x.decisions_officielles_proches[1], { revoked: true, status: 'REVOKED', revoquee: true, date_fin: '2020-01-01', expiree: true });
    x.decisions_officielles_proches[0].applicabilite = { decision: { revoquee: true, revoquee_par: ['H999'], date_fin: '2020-01-01', expiree: true }, verdict: 'partiellement', motif: 'x', meme_juridiction: false, points_communs: [], differences: [], rejetes: 3, hors_criteres: 2 };
  });
  const s8 = lisible(partie(h, 'Close official rulings</h2>', 'Obligations and duties</h2>'));
  for (const mot of ['evoked', 'REVOKED', 'H999', '2020', 'xpired', '3 comparison items rejected', '2 items set aside']) assert.ok(s8.includes(mot), 'absent de la section des décisions : ' + mot);
  assert.equal(h.split('<span class="etiq alerte">revoked</span>').length - 1, 2, 'les deux décisions révoquées sont étiquetées');
  assert.ok(s8.includes('partially applicable'));
  const nv = lisible(rend((x) => { x.decisions_officielles_proches[0].applicabilite.verdict = 'non_verifiable'; }));
  assert.ok(nv.includes('not verifiable') && !nv.includes('non_verifiable'), 'verdict en clé brute');
  // Témoins : la fixture n'a aucune décision révoquée ; un statut qui nie la révocation n'étiquette rien.
  assert.ok(!html.includes('<span class="etiq alerte">revoked</span>'));
  assert.ok(!rend((x) => { x.decisions_officielles_proches[1].status = 'not revoked'; }).includes('<span class="etiq alerte">revoked</span>'));
  // Une différence de la fixture porte un passage du produit et une autre n'en porte pas : les deux se voient.
  const diff = d.decisions_officielles_proches[0].applicabilite.differences;
  assert.ok(html.includes(`“${esc(diff[0].produit.citation)}”`) && lisible(html).includes('The documents say nothing about it'));
});

test('défaut 5 : un passage situé dans une portion déclarée fausse ne sert pas d\'appui', () => {
  const faux = d.pieces.passages_declares_faux[0].quote;
  const h = rend((x) => { x.caracteristiques.batterie = { valeur: 'yes', provenance: 'Datasheet', passages: [faux] }; });
  assert.ok(!h.includes(`<blockquote>“${esc(faux)}”</blockquote>`), 'le passage déclaré faux ne doit pas être cité à l\'appui');
  assert.ok(lisible(h).includes('1 passage cited in support lies in a part of the documents that a person declared false'));
  // Témoin : le même passage, quand personne ne l'a déclaré faux, est bien cité.
  const ok = rend((x) => { x.pieces.passages_declares_faux = []; x.caracteristiques.batterie = { valeur: 'yes', provenance: 'Datasheet', passages: [faux] }; });
  assert.ok(ok.includes(`<blockquote>“${esc(faux)}”</blockquote>`));
});

test('défaut 6 : un passage déclaré faux absent des pièces n\'est pas affiché ; toutes les occurrences sont barrées', () => {
  const invente = 'Waterproof to 50 m, medical grade.';
  const h = rend((x) => { x.pieces.passages_declares_faux = [{ source: 'description', quote: invente, sujet: 'Water resistance' }]; });
  assert.ok(!h.includes('Waterproof') && !lisible(h).includes('These passages appear in the documents'), 'passage inventé affiché comme passage des pièces');
  assert.ok(lisible(h).includes('1 passage declared false does not appear in the documents'));
  const faux = d.pieces.passages_declares_faux[0].quote;
  const deux = rend((x) => { x.pieces.description += ' ' + faux; });
  assert.equal(partie(deux, 'Technical description and documents</h2>', '<h3>Photo</h3>').split(`<del>${esc(faux)}</del>`).length - 1, 2, 'les deux occurrences sont barrées');
});

test('défaut 7 : un fait sans passage vérifié est signalé, un passage hors liste n\'est pas perdu', () => {
  const h = rend((x) => { x.caracteristiques.voltage_v = { valeur: 230, provenance: 'Datasheet', detail: 'Datasheet, quoted passage', passages: [] }; });
  assert.equal(h.split('<span class="etiq alerte">no verified passage</span>').length - 1, 1);
  assert.ok(!html.includes('no verified passage'), 'témoin : aucun fait de la fixture n\'est dans ce cas');
  const c = rend((x) => { x.caracteristiques.voltage_v = { valeur: 230, provenance: 'Datasheet', passages: 'Input: 999V' }; });
  assert.ok(!c.includes('999V') && lisible(c).includes('1 passage attributed to the product documents is not found word for word'), 'un passage donné en chaîne est vérifié et compté');
});

test('défaut 8 : obligations en liste, appels en échec, valeurs seules', () => {
  const liste = lisible(dossierHtml({ ...MIN, obligations: [{ intitule: 'CE marking' }] }));
  assert.ok(liste.includes('Obligations and duties') && liste.includes('CE marking'));
  const echec = lisible(dossierHtml({ ...MIN, obligations: { obligations: [], droits: null, cout: null, manquants: [], etapes_en_echec: [{ etape: 'obligations', raison: 'HTTP 503' }], rejetes: 4, error: 'HTTP 503' } }));
  assert.ok(echec.includes('HTTP 503') && echec.includes('4 obligations set aside'), 'échec ou rejets passés sous silence');
  assert.ok(!echec.includes('No duty returned') && echec.includes('The obligations could not be read'));
  const seul = lisible(dossierHtml({ ...MIN, obligations: { obligations: [], droits: false, cout: 0 } }));
  const s9 = partie(seul, 'Customs duties');
  assert.ok(!/Customs duties\s+no\b/.test(s9) && !/Cost\s+0\b/.test(s9), 'une valeur seule ne se lit ni comme « pas de droits » ni comme un coût nul');
  assert.equal(s9.split('unknown').length - 1, 2);
  // Témoin : sans échec déclaré, la phrase reste « no duty returned ».
  assert.ok(lisible(dossierHtml({ ...MIN, obligations: { obligations: [], droits: null } })).includes('No duty returned'));
});

test('défaut 9 : le niveau affiché est celui que le code atteint, le code non retenu n\'est pas présenté comme proposé', () => {
  const niv = (o) => lisible(dossierHtml({ ...MIN, ...o }));
  for (const [o, attendu] of [[{ code: '8504', system: 'CN' }, '4 digits only'], [{ code: '85' }, '2 digits only'], [{ code: '85044095', system: '' }, 'nomenclature not provided'], [{ code: '8504.40.00', system: 'hs6?' }, '“hs6?”']]) {
    const x = niv(o);
    assert.ok(x.includes(attendu), `niveau attendu « ${attendu} » pour ${JSON.stringify(o)}`);
    assert.ok(!x.includes('Six digits only') && !x.includes('National nomenclature') && !x.includes('Country nomenclature'), 'niveau affirmé à tort pour ' + JSON.stringify(o));
  }
  const err = dossierHtml({ ...MIN, code: 'ERROR 500' });
  assert.ok(lisible(err).includes('No readable code') && !err.includes('<div class="code">ERROR 500</div>') && !lisible(err).includes('Six digits only'));
  const us = dossierHtml({ sku: 'A', destination: 'US', code: '850440', system: 'hs6', status_api: 'unsupported_jurisdiction' });
  assert.ok(!us.includes('<div class="d">Proposed code</div>') && us.includes('<div class="code faible">8504.40</div>'), 'code non retenu présenté comme proposé');
  assert.ok(lisible(us).includes('The API does not present this code as a settled proposal'));
  // Témoin : la fixture, statut « classified », garde son code en titre et son niveau à six chiffres.
  assert.ok(html.includes('<div class="d">Proposed code</div><div class="code">8504.40</div>'));
});

test('défaut 10 : un fait saisi sans pièce ne devient pas une preuve tirée des pièces', () => {
  const h = lisible(rend((x) => { x.graphe.chemin[0].source = 'caracteristique:weight_g'; x.graphe.chemin[0].citation = String(d.caracteristiques.weight_g.valeur); }));
  const etape = partie(h, 'Step 1.', 'Step 2.');
  assert.ok(!etape.includes('What establishes it in the product documents'), 'un fait n\'est pas une pièce');
  assert.ok(etape.includes('is not supported by any verified passage from the documents'), 'le fait sans pièce doit être signalé');
  // Témoin : un fait appuyé par un passage vérifié n'est pas signalé comme sans appui, que l'app l'ait nommé en anglais ou en français.
  for (const source of ['Characteristic “Power (W)”', 'Characteristic "Power (W)"', 'Characteristic « Power (W) »', 'Fact “Power (W)”', 'Caractéristique « Puissance (W) »', 'caracteristique:power_w']) {
    const ok = partie(lisible(rend((x) => { x.graphe.chemin[0].source = source; x.graphe.chemin[0].citation = '65'; })), 'Step 1.', 'Step 2.');
    assert.ok(ok.includes('confirmed fact “Power (W)”') && ok.includes('quoted in section 4'), 'fait non reconnu sous le libellé : ' + source);
  }
});

test('défaut 11 : la forme rendue par lib/obligations.mjs s\'affiche en anglais, sans clé technique', () => {
  const h = lisible(dossierHtml({ ...MIN, obligations: { obligations: [{ titre: 'RoHS', autorite: 'Commission', sourcee: false, nature: 'Cleo catalog regulation', categorie: 'catalogue', origine: 'deduite_par_un_modele', domaine_autorite: 'europa.eu' }], droits: { taux: null, taux_min: 0, taux_max: 3.7, unite: '%', base_legale: 'TARIC' }, cout: { total: 0, devise: 'USD', partiel: true } } }));
  for (const brut of ['autorite', 'sourcee', 'categorie', 'origine', 'deduite', 'deduite_par_un_modele', 'domaine autorite', 'domaine_autorite', 'base legale', 'base_legale', 'unite', 'taux', 'devise', 'partiel']) assert.ok(!h.includes(brut), 'clé ou valeur technique visible : ' + brut);
  for (const clair of ['Authority', 'Commission', 'inferred by a model', 'Authority domain', 'Legal basis', 'TARIC', 'from 0% to 3.7%', 'partial total', 'no source document']) assert.ok(h.includes(clair), 'libellé attendu absent : ' + clair);
  // La fixture porte la forme réelle : aucune de ses clés ne doit apparaître telle quelle.
  const cles = new Set(); (function w(v) { if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { cles.add(k); w(x); } })(d.obligations);
  const txt = lisible(partie(html, 'Obligations and duties</h2>', 'Open questions</h2>'));
  for (const k of cles) if (k.includes('_')) assert.ok(!txt.includes(k), 'clé technique visible dans la fixture : ' + k);
});

test('défaut 12 : un extrait sans référence ni adresse n\'est pas affiché comme texte officiel', () => {
  const phrase = 'Chargers of all kinds are classified in 8504.40 with certainty.';
  const h = dossierHtml({ ...MIN, preuves: [phrase] });
  assert.ok(!h.includes(phrase) && !h.includes('class="officiel"'), 'une simple chaîne ne devient pas un extrait officiel');
  assert.ok(lisible(h).includes('1 excerpt received without a reference or an address is not displayed'));
  // Témoin : avec une référence, l'extrait s'affiche, étiqueté sans adresse et avec la mise en garde.
  const ok = lisible(dossierHtml({ ...MIN, preuves: [{ ref: 'Heading 8504', extrait: phrase }] }));
  assert.ok(ok.includes(phrase) && ok.includes('no address') && ok.includes('to be re-read at the address given'));
  assert.ok(lisible(html).includes('This document does not compare them with the official text'));
});

test('défaut 13 : pièces en lignes ou en objet, faits en liste', () => {
  const h = dossierHtml({ ...MIN, pieces: { description: ['ligne 1', 'ligne 2'], fiche_technique: { texte: 'Output 5V' } }, caracteristiques: { voltage_v: { valeur: 5, provenance: 'Datasheet', passages: ['Output 5V'] } } });
  assert.ok(h.includes('<div class="piece">ligne 1\nligne 2</div>') && h.includes('<div class="piece">Output 5V</div>') && h.includes('<blockquote>“Output 5V”</blockquote>'));
  assert.ok(!INTROUVABLE.test(lisible(h)));
  const f = partie(lisible(dossierHtml({ ...MIN, pieces: { fiche_technique: 'Rated 65W' }, caracteristiques: [{ fact: 'power_w', value: 65, source: 'fiche_technique', quotes: ['65W'] }] })), '4. Confirmed facts', '5. Reasoning');
  assert.ok(f.includes('Power (W): 65') && f.includes('“65W”') && !f.includes('Not provided'), 'liste de faits ignorée');
  const ill = lisible(dossierHtml({ ...MIN, pieces: { description: 42 } }));
  assert.ok(ill.includes('unreadable document') && ill.includes('1 document received is not readable text'));
});

test('défaut 14 : une clé qui porte un nom du prototype n\'affiche pas de code', () => {
  const h = dossierHtml({ ...MIN, status_api: 'constructor', caracteristiques: { toString: { valeur: 1, provenance: 'x' }, hasOwnProperty: 2 }, obligations: { obligations: [{ titre: 'T', constructor: 'c', valueOf: 'v', origine: 'toString', categorie: '__proto__' }], etapes_en_echec: [{ etape: 'constructor', raison: 'r' }] }, graphe: { chemin: [{ source: 'constructor', citation: 'abc def ghi' }] }, pieces: { passages_declares_faux: [{ source: 'toString', quote: 'abc' }] } });
  assert.ok(!h.includes('native code') && !/function\s/.test(lisible(h)), 'code source de fonction dans le document');
  assert.ok(lisible(h).includes('toString: 1'));
});

test('défaut 15 : une date impossible ou illisible n\'est jamais reformulée', () => {
  for (const v of ['2026-02-31', '2026-13-45', 'hier', 'yesterday', '2026-10-04T25:99:00Z', 12, '2026-10-04T10:00:00+99:00']) {
    const h = lisible(dossierHtml({ ...MIN, validated_by: 'X Y', validated_at: v }));
    assert.ok(h.includes('Proposal validated by X Y, date received unreadable'), 'date illisible attendue pour ' + v);
    assert.ok(!h.includes('31 February') && !h.includes(`on ${v}`), 'date recopiée dans la phrase : ' + v);
    assert.ok(h.includes(`not recognized as a date: “${v}”`), 'la valeur reçue reste visible, désignée comme non reconnue');
  }
  // Un horodatage en millisecondes se lit comme une date ; l'attendu vient d'Intl, pas du module.
  const ms = 1759578120000, jour = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
  const h = lisible(dossierHtml({ ...MIN, validated_by: 'X Y', validated_at: ms }));
  assert.ok(h.includes(`validated by X Y on ${jour} at`) && !h.includes(String(ms)), 'horodatage : ' + jour);
  assert.ok(lisible(dossierHtml({ ...MIN, validated_by: 'X Y', validated_at: '2024-02-29' })).includes('on 29 February 2024'), 'témoin : 29 février d\'une année bissextile');
  // L'heure est écrite sans ambiguïté, avec son fuseau.
  assert.ok(lisible(html).includes('4 October 2026 at 11:42 (UTC)'));
});

test('défaut 16 : la confiance n\'est recopiée que si c\'est un nombre ; l\'arbre sans code ou en désaccord est signalé', () => {
  const h = dossierHtml({ ...MIN, tours: [{ cause: 'c', statut: 'classified', code_retenu: '850440', confiance: '97 %' }, { confiance: true }, { confiance: 0.42 }] });
  const tours = partie(h, 'Evaluation rounds', 'Robustness tests');
  assert.ok(!tours.includes('97') && !tours.includes('%') && !tours.includes('<td>yes</td>'), 'confiance non numérique recopiée');
  assert.equal(tours.split('non-numeric value received, not displayed').length - 1, 2);
  assert.ok(tours.includes('<td>0.42</td>'), 'témoin : un nombre est recopié tel quel');
  assert.ok(lisible(h).includes('does not measure whether the code is right'), 'la confiance est dite sans valeur de justesse');
  const sansCode = lisible(dossierHtml({ ...MIN, graphe: { version: 'v', statut_version: 'x', resultat: { statut: 'code', code: null }, chemin: [] } }));
  assert.ok(!sansCode.includes('leads to code') && sansCode.includes('The tree announces a code but returns none'));
  const ecart = lisible(rend((x) => { x.graphe.resultat = { statut: 'code', code: '85171300' }; }));
  assert.ok(ecart.includes('(8517.13.00) is not the code 8504.40 returned by the API'), 'désaccord entre l\'arbre et le code proposé non signalé');
  // Témoin : un code d'arbre qui prolonge le code proposé n'est pas un désaccord.
  assert.ok(!lisible(rend((x) => { x.graphe.resultat = { statut: 'code', code: '85044060' }; })).includes('is not the code'));
});

test('défaut 17 : une citation de deux caractères ne prouve rien ; un objet très imbriqué ne fait pas tomber le document', () => {
  const h = rend((x) => { x.caracteristiques.power_w.passages = ['Total output: 65W Max', '65']; });
  assert.ok(!h.includes('<blockquote>“65”</blockquote>') && lisible(h).includes('1 passage is too short to prove anything'));
  assert.ok(h.includes('<blockquote>“Total output: 65W Max”</blockquote>'), 'témoin : le passage long reste cité');
  let profond = {}; for (let i = 0, o = profond; i < 20000; i++) { o.a = {}; o = o.a; }
  let doc;
  assert.doesNotThrow(() => { doc = dossierHtml({ sku: 'A', obligations: { obligations: [profond], droits: profond, cout: { composantes: [profond], x: profond } }, caracteristiques: { p: profond }, preuves: [{ ref: profond }] }); });
  assert.ok(doc.includes('content nested too deeply, not displayed'));
});

test('défaut 19 : le bandeau d\'exemple ne dépend pas de la forme exacte du drapeau', () => {
  for (const v of [true, 'true', 1, 'oui', 'yes']) assert.ok(rend((x) => { x.exemple = v; }).includes('<strong>Example file.</strong>'), 'bandeau absent pour ' + JSON.stringify(v));
  for (const v of [false, 'false', 0, null, 'non', 'no']) assert.ok(!rend((x) => { x.exemple = v; }).includes('class="exemple"'), 'bandeau présent à tort pour ' + JSON.stringify(v));
  a(html, d.note_exemple, 'note qui dit ce qui est inventé et ce qui est réel');
});

// Défaut 18 : le débordement ne se mesure que dans un navigateur. Sonde Chromium (Playwright de ~/cleo-chat) si disponible.
let chromium = null;
try { chromium = createRequire(path.join(process.env.HOME || '', 'cleo-chat/'))('playwright').chromium; } catch { /* pas de navigateur : test sauté */ }
test('défaut 18 : aucune largeur ne dépasse la fenêtre, même avec des références sans espace', { skip: !chromium && 'Playwright introuvable dans ~/cleo-chat' }, async () => {
  const long = 'REF-' + 'A1B2C3D4'.repeat(12), nom = 'Camille_' + 'Durand'.repeat(15);
  const page = rend((x) => {
    Object.assign(x, { sku: long, libelle: long, validated_by: nom, request_id: long, version_nomenclature: long, system: long });
    x.questions_restantes[0].question = long; x.tours[0].cause = long; x.tours[0].statut = long; x.tours[1].code_retenu = long;
    x.alternatives[0].code = long; x.epreuves[0].verdict = long; x.autres_destinations[0].nomenclature = long;
    x.decisions_officielles_proches[0].source = long; x.decisions_officielles_proches[0].applicabilite.differences[0].aspect = long;
    x.obligations.obligations[0].titre = long; x.obligations.obligations[0][long] = long; x.caracteristiques[long] = { valeur: long, provenance: long };
  });
  const b = await chromium.launch();
  try {
    for (const [doc, nomDoc] of [[page, 'références longues'], [html, 'fixture']]) for (const largeur of [390, 1000]) {
      const p = await b.newPage({ viewport: { width: largeur, height: 900 } });
      await p.setContent(doc);
      const m = await p.evaluate(() => ({ page: document.documentElement.scrollWidth, fenetre: window.innerWidth, dehors: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length }));
      assert.ok(m.page <= m.fenetre, `${nomDoc}, ${largeur} px : la page fait ${m.page} px de large`);
      assert.equal(m.dehors, 0, `${nomDoc}, ${largeur} px : ${m.dehors} élément(s) dépassent`);
      await p.close();
    }
  } finally { await b.close(); }
});
