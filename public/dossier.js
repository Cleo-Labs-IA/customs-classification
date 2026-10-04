// Dossier lisible : la version imprimable du dossier de classification.
// dossierHtml(d) rend un document HTML complet et autonome (CSS en ligne, aucun
// script, aucune ressource externe), prévu pour l'impression A4 ou le PDF.
// Module sans accès au DOM : il s'importe aussi bien du navigateur que de Node.
// Le document rendu est en anglais ; les noms de champs reçus restent ceux de l'app.
//
// Règles tenues ici :
// - toute valeur est échappée avant d'entrer dans le HTML ;
// - une valeur absente s'écrit « Not provided », jamais un mot technique vide ;
// - un passage attribué aux pièces du produit n'est affiché comme citation que
//   s'il se retrouve mot pour mot dans la pièce, hors de toute portion déclarée
//   fausse, et s'il est assez long pour prouver quelque chose ; sinon il est
//   retiré et compté ;
// - un statut reçu (version de l'arbre, validation, révocation) est recopié tel
//   quel ou lu sur un booléen : il n'est jamais déduit d'un mot trouvé dans un texte ;
// - la confiance de l'API est recopiée telle quelle, sous le nom « confidence
//   returned by the API », seulement si c'est un nombre, sans conversion en pourcentage.

const table = (o) => Object.assign(Object.create(null), o); // sans prototype : une clé reçue ne tombe jamais sur une méthode
const ESC = table({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const vide = (v) => v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v)) || (typeof v === 'string' && !v.trim());
const liste = (v) => (Array.isArray(v) ? v.filter((x) => !vide(x)) : []);
// Une valeur seule là où une liste est attendue reste une liste d'un élément : rien ne disparaît en silence.
const tableau = (v) => (Array.isArray(v) ? liste(v) : vide(v) ? [] : [v]);
const objet = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const nombre = (x) => typeof x === 'number' && Number.isFinite(x);
// Un nombre s'écrit avec un point décimal, tel que JavaScript le rend.
const dec = (x) => String(x);
const pl = (n, un, plusieurs) => (n > 1 ? plusieurs : un);
const PROFONDEUR = 6;
const TROP_PROFOND = 'content nested too deeply, not displayed';

// Libellés des champs connus (ceux que rendent l'app, lib/obligations.mjs et lib/applicabilite.mjs).
const CLES = table({
  url: 'Address', source_url: 'Source address', reference: 'Reference', ref: 'Reference', taux: 'Rate', source: 'Source', titre: 'Title',
  autorite: 'Authority', document_id: 'Document identifier', sourcee: 'Source document cited', nature: 'Nature', categorie: 'Category',
  obligatoire: 'Mandatory', origine: 'Origin of the information', domaine_autorite: 'Authority domain', taux_min: 'Lowest rate',
  taux_max: 'Highest rate', unite: 'Unit', taux_specifique: 'Specific rate', base_legale: 'Legal basis', base: 'Basis', version: 'Version',
  niveau_source: 'Source level', pays_du_tarif: 'Tariff country', lignes_lues: 'Tariff lines read', ligne_exacte_connue: 'Exact tariff line of the product known',
  total: 'Total', devise: 'Currency', partiel: 'Partial total', ligne_tarifaire: 'Tariff line', composantes: 'Components', nom: 'Name', montant: 'Amount',
  connu: 'Known', taux_pct: 'Rate', libelle_api: 'Label returned by the API', etape: 'Step', raison: 'Reason', code: 'Code', secondes: 'Duration (s)',
  chemin: 'Call path', route: 'Route', catalogue_ecartes: 'Catalog texts set aside', destination: 'Destination', code_provisoire_ecarte: 'Provisional code set aside', error: 'Error',
  revoquee: 'Revoked', revoked: 'Revoked', revoquee_par: 'Revoked by', modifiee_par: 'Modified by', date_fin: 'End of validity date',
  expiree: 'Expired', expired: 'Expired', status: 'Status', statut: 'Status', juridiction: 'Jurisdiction', title: 'Title', description: 'Description',
  date: 'Date', id: 'Identifier', texte_disponible: 'Text read at the official source', intitule: 'Title',
  complements: 'Additional details', citation_source: 'Passage found in the official text', autorite_complements: 'Additional details on the authority',
  code_etabli: 'Code established', origine_pays: 'Country of origin',
});
// Valeurs techniques connues, traduites ; une valeur inconnue reste telle que reçue.
const VALEURS = table({
  origine: table({ deduite_par_un_modele: 'inferred by a model', lue_par_l_api: 'read by the API', catalogue_cleo: 'Cleo catalog' }),
  categorie: table({ exigee_par_la_loi: 'required by law', attendue_par_contrat: 'expected by contract', catalogue: 'Cleo catalog' }),
  chemin: table({ points_d_acces_separes: 'separate API endpoints', compliance_check: 'full API check' }),
  niveau_source: table({ mirror: 'mirror source', official: 'official source' }),
  etape: table({ obligations: 'obligations', catalogue_reglementaire: 'regulatory catalog', droits: 'customs duties', cout: 'landed cost', compliance_check: 'full check', classification: 'classification', normalisation: 'formatting' }),
});
const traduit = (k, v) => (typeof v === 'string' && VALEURS[k] && VALEURS[k][v.trim()]) || null;
// Libellé d'une clé : connu, il est en anglais ; inconnu, le nom du champ est montré tel quel, en caractères techniques.
const cleHtml = (k) => (CLES[k] ? esc(CLES[k]) : `<span class="mono">${esc(k)}</span>`);

// Texte à plat d'une valeur quelconque, ou '' si elle est vide. Jamais d'objet brut.
function plat(v, prof = 0) {
  if (vide(v)) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v !== 'object') return '';
  if (prof >= PROFONDEUR) return TROP_PROFOND;
  if (Array.isArray(v)) return v.map((x) => plat(x, prof + 1)).filter(Boolean).join(', ');
  return Object.entries(v).map(([k, x]) => [CLES[k] ? CLES[k].toLowerCase() : k.replace(/_/g, ' '), traduit(k, x) || plat(x, prof + 1)]).filter(([, x]) => x).map(([k, x]) => `${k}: ${x}`).join('; ');
}
const NR = '<span class="nr">Not provided</span>';
const t = (v) => { const s = plat(v); return s ? esc(s) : NR; };
const INCONNU = '<span class="etiq alerte">unknown</span>';

const estUrl = (u) => typeof u === 'string' && /^https?:\/\/[^\s]+$/i.test(u.trim());
// Une adresse s'affiche en entier (un PDF imprimé ne se clique pas) ; elle ne devient un lien que si elle est en http(s).
function lien(u) {
  const s = plat(u);
  if (!s) return '';
  return estUrl(s) ? `<a class="url" href="${esc(s)}">${esc(s)}</a>` : `<span class="url">${esc(s)}</span>`;
}

// Rendu générique d'une valeur de forme inconnue : texte, liste ou paires clé / valeur. Profondeur bornée.
function rendu(v, cle = '', prof = 0) {
  if (vide(v)) return NR;
  if (typeof v === 'string' && estUrl(v)) return lien(v);
  if (traduit(cle, v)) return esc(traduit(cle, v));
  if (typeof v !== 'object') return t(v);
  if (prof >= PROFONDEUR) return `<span class="nr">${TROP_PROFOND}</span>`;
  if (Array.isArray(v)) { const l = liste(v); return l.length ? `<ul>${l.map((x) => `<li>${rendu(x, cle, prof + 1)}</li>`).join('')}</ul>` : NR; }
  const p = paires(v, prof);
  return p ? `<dl class="kv">${p}</dl>` : NR;
}
// Les lignes « libellé / valeur » d'un objet, sans les champs vides.
function paires(o, prof = 0) {
  return Object.entries(o).filter(([, x]) => !vide(x) && !(Array.isArray(x) && !liste(x).length)).map(([k, x]) => `<dt>${cleHtml(k)}</dt><dd>${rendu(x, k, prof + 1)}</dd>`).join('');
}
const sans = (o, cles) => Object.fromEntries(Object.entries(o).filter(([k]) => !cles.includes(k)));

// --- citations ----------------------------------------------------------------

const MIN_CITATION = 3;   // en dessous, un passage ne prouve rien
const CITATION_LIBRE = 8; // en dessous, le passage doit être un mot entier de la pièce, pas un morceau de mot
const alnum = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
// Toutes les positions d'un passage dans un texte : à la lettre d'abord, sinon sans tenir compte de la casse.
function positions(texte, q) {
  const out = [];
  if (typeof texte !== 'string' || !q) return out;
  for (const [h, n] of [[texte, q], [texte.toLowerCase(), q.toLowerCase()]]) {
    if (h.length !== texte.length || n.length !== q.length) continue;
    for (let i = h.indexOf(n); i >= 0; i = h.indexOf(n, i + 1)) out.push(i);
    if (out.length) break;
  }
  return out;
}
// Cherche un passage dans un texte. Rend { texte } (la portion exacte de la source) ou { motif }.
// coupes : portions du texte déclarées fausses, où un passage ne peut pas servir d'appui.
function chercher(texte, citation, coupes = []) {
  const q = typeof citation === 'string' ? citation.trim() : '';
  if (!q || typeof texte !== 'string') return { motif: 'introuvable' };
  if (q.length < MIN_CITATION || !alnum([...q].find(alnum))) return { motif: positions(texte, q).length ? 'court' : 'introuvable' };
  let pos = positions(texte, q);
  if (!pos.length) return { motif: 'introuvable' };
  if (q.length < CITATION_LIBRE) {
    pos = pos.filter((i) => !alnum(texte[i - 1]) && !alnum(texte[i + q.length]));
    if (!pos.length) return { motif: 'court' };
  }
  const libre = pos.find((i) => !coupes.some(([a, b]) => i < b && i + q.length > a));
  return libre === undefined ? { motif: 'barre' } : { texte: texte.slice(libre, libre + q.length) };
}

// --- dates, pays, codes ---------------------------------------------------------

const MOIS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const jourMois = (a, m, j) => `${j} ${MOIS[m - 1]} ${a}`;
const heure = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
// Date lisible, en temps universel pour que le même dossier s'imprime pareil partout.
// Rend { ok, texte, brut } : une valeur qui n'est pas une date du calendrier n'est jamais reformulée en date.
function lireDate(v) {
  const non = { ok: false, texte: '', brut: plat(v) };
  if (vide(v)) return non;
  const universel = (d) => ({ ok: true, brut: non.brut, texte: `${jourMois(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())} at ${heure(d.getUTCHours(), d.getUTCMinutes())} (UTC)` });
  if (typeof v === 'number') return Number.isInteger(v) && v >= 946684800000 && v <= 4102444800000 ? universel(new Date(v)) : non; // millisecondes, de 2000 à 2100
  if (typeof v !== 'string') return non;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(v.trim());
  if (!m) return non;
  const [a, mo, j] = [+m[1], +m[2], +m[3]];
  if (mo < 1 || mo > 12 || j < 1 || j > new Date(Date.UTC(a, mo, 0)).getUTCDate()) return non;
  if (m[4] === undefined) return { ok: true, brut: non.brut, texte: jourMois(a, mo, j) };
  if (+m[4] > 23 || +m[5] > 59 || (m[6] !== undefined && +m[6] > 59)) return non;
  if (!m[7]) return { ok: true, brut: non.brut, texte: `${jourMois(a, mo, j)} at ${heure(+m[4], +m[5])} (time zone not specified)` };
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? non : universel(d);
}
const dateHtml = (v) => { const x = lireDate(v); return x.ok ? esc(x.texte) : x.brut ? `<span class="nr">Value received, not recognized as a date:</span> “${esc(x.brut)}”` : NR; };

function pays(code) {
  const s = plat(code);
  if (!/^[A-Za-z]{2}$/.test(s)) return s;
  try { const n = new Intl.DisplayNames(['en'], { type: 'region' }).of(s.toUpperCase()); return n && n !== s.toUpperCase() ? `${n} (${s.toUpperCase()})` : s.toUpperCase(); } catch { return s.toUpperCase(); }
}

function code(c) {
  const s = plat(c);
  if (!/^\d{6,}$/.test(s)) return s;
  return s.length === 6 ? s.replace(/^(\d{4})(\d{2})$/, '$1.$2') : s.replace(/^(\d{4})(\d{2})(.*)$/, '$1.$2.$3');
}
// Un code n'est lisible que s'il n'est fait que de chiffres, de points et d'espaces.
function lireCode(c) {
  const brut = plat(c), chiffres = brut.replace(/\D/g, '');
  return { brut, chiffres, ok: /^\d[\d.\s]*$/.test(brut) && chiffres.length >= 2 };
}
// Deux codes se contredisent si aucun n'est le début de l'autre.
const divergent = (a, b) => a.ok && b.ok && !a.chiffres.startsWith(b.chiffres) && !b.chiffres.startsWith(a.chiffres);

// Niveau réellement atteint, déduit du nombre de chiffres et de la nomenclature rendus, pas d'une promesse.
function niveau(d, c) {
  if (!c.brut) return 'no code established';
  if (!c.ok) return 'not established: the value received is not a code';
  const n = c.chiffres.length, sys = plat(d.system);
  if (n < 4) return `${n} digits only: chapter level, heading not established`;
  if (n < 6) return `${n} digits only: heading level, six-digit subheading not established`;
  if (n === 6) return 'six digits only, national code not established';
  if (!sys) return `${n} digits, nomenclature not provided: the national level is not established`;
  if (/^hs6?$/i.test(sys)) return `${n} digits received although the stated nomenclature stops at six digits: level not established`;
  return `${n} digits, in the nomenclature the API calls “${sys}”`;
}

const STATUTS = table({
  classified: 'proposal awaiting validation', needs_review: 'proposal awaiting review', needs_information: 'information needed',
  ambiguous: 'several codes remain plausible', unsupported_jurisdiction: 'no candidate retained for this destination', stale_dataset: 'nomenclature to be refreshed',
});
// Statuts où l'API présente bien un code comme sa proposition.
const PROPOSITIONS = ['classified', 'needs_review'];
const statut = (s) => { const k = plat(s); return k ? (STATUTS[k] ? `${esc(STATUTS[k])} <span class="brut">(${esc(k)})</span>` : esc(k)) : NR; };
const VERDICTS = table({ applicable: 'applicable', non_applicable: 'not applicable', partiellement: 'partially applicable', non_verifiable: 'not verifiable' });

const FAITS = table({
  material: 'Material', sole_material: 'Sole material', upper_material: 'Upper material', composition: 'Composition', function: 'Function', use: 'Use',
  process: 'Process', dimensions: 'Dimensions', thickness_mm: 'Thickness (mm)', weight_g: 'Weight (g)', power_w: 'Power (W)', engine_displacement_cc: 'Engine displacement (cm³)',
  voltage_v: 'Voltage (V)', presentation: 'Presentation', audience: 'Audience',
});
// Libellés français des mêmes faits : un dossier enregistré avant la traduction de l'app les porte encore dans ses sources.
const FAITS_FR = table({
  material: 'Matière', sole_material: 'Matière de la semelle', upper_material: 'Matière de la tige', composition: 'Composition', function: 'Fonction', use: 'Usage',
  process: 'Procédé', dimensions: 'Dimensions', thickness_mm: 'Épaisseur (mm)', weight_g: 'Poids (g)', power_w: 'Puissance (W)', engine_displacement_cc: 'Cylindrée (cm³)',
  voltage_v: 'Tension (V)', presentation: 'Présentation', audience: 'Public',
});
const nomFait = (k) => FAITS[k] || String(k).replace(/_/g, ' ');
const PIECES = table({ description: 'description', fiche_technique: 'datasheet or label' });
// Noms sous lesquels une pièce peut être désignée : clé technique, ou libellé écrit par l'app (en anglais, ou en français dans un dossier plus ancien).
const sansAccent = (s) => plat(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const ALIAS = table({
  description: 'description', 'description du catalogue': 'description', 'description technique': 'description',
  'catalog description': 'description', 'catalogue description': 'description', 'technical description': 'description', 'product description': 'description',
  fiche_technique: 'fiche_technique', 'fiche technique': 'fiche_technique', 'fiche technique ou etiquette': 'fiche_technique', etiquette: 'fiche_technique',
  'etiquette lue sur la photo': 'fiche_technique', 'etiquette photographiee': 'fiche_technique', 'transcription de l\'etiquette': 'fiche_technique',
  datasheet: 'fiche_technique', 'data sheet': 'fiche_technique', 'technical datasheet': 'fiche_technique', 'technical data sheet': 'fiche_technique',
  'datasheet or label': 'fiche_technique', label: 'fiche_technique', 'label read from the photo': 'fiche_technique', 'label read on the photo': 'fiche_technique',
  'photographed label': 'fiche_technique', 'label transcription': 'fiche_technique', 'transcription of the label': 'fiche_technique',
});
// Une source ou une provenance qui dit elle-même qu'aucune pièce ne l'appuie (texte sans accent, en minuscules).
const SANS_PIECE = /sans piece|\b(?:no|without)(?: any| a| an| supporting)* (?:evidence|documents?|exhibits?|proof)\b|\bundocumented\b|\bunsupported\b/;
const MOT_FAIT = '(?:caract[ée]ristique|characteristic|attribute|fact)';
const FAIT_CLE = new RegExp(`^${MOT_FAIT}\\s*:\\s*(.+)$`, 'i');
const FAIT_LIBELLE = new RegExp(`^${MOT_FAIT}\\s*[«“"]\\s*(.+?)\\s*[»”"]$`, 'i');
// Clé d'un fait à partir de ce que l'app a écrit : la clé technique, ou son libellé anglais ou français.
function cleFait(v) {
  const n = sansAccent(v);
  return Object.keys(FAITS).find((k) => k === v || sansAccent(FAITS[k]) === n || sansAccent(FAITS_FR[k]) === n) || v;
}
// D'où vient un passage : une pièce, un fait confirmé, une réponse sans pièce, ou une source non reconnue.
function origine(source) {
  const s = plat(source), n = sansAccent(source);
  if (!s) return { type: 'aucune' };
  if (ALIAS[n]) return { type: 'piece', cle: ALIAS[n] };
  const m = FAIT_CLE.exec(s) || FAIT_LIBELLE.exec(s);
  if (m) return { type: 'fait', cle: cleFait(m[1].replace(new RegExp(`^${MOT_FAIT}\\s*:\\s*`, 'i'), '')) };
  if (SANS_PIECE.test(n)) return { type: 'sans_piece' };
  return { type: 'inconnue' };
}

// Une pièce est un texte. Une liste de lignes ou un objet qui porte un texte se lisent aussi ; le reste est déclaré illisible.
function lirePiece(v) {
  if (vide(v)) return { texte: '', illisible: false };
  if (typeof v === 'string') return { texte: v, illisible: false };
  if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) return { texte: v.join('\n'), illisible: false };
  const o = objet(v), k = o && ['texte', 'text', 'contenu', 'content'].find((x) => typeof o[x] === 'string');
  return k ? { texte: o[k], illisible: false } : { texte: '', illisible: true };
}
// Les faits arrivent en objet { clé: { valeur, provenance, detail, passages } } (dossier de l'app)
// ou en liste [{ fact, value, source, quotes }] (lecture des pièces par le serveur).
function lireFaits(v) {
  if (Array.isArray(v)) {
    return liste(v).map((x, i) => {
      const o = objet(x);
      if (!o) return { cle: `fact no. ${i + 1}`, f: { valeur: x } };
      const or = origine(o.source);
      return { cle: plat(o.fact) || plat(o.cle) || `fact no. ${i + 1}`, f: { valeur: 'value' in o ? o.value : o.valeur, provenance: o.provenance ?? (or.type === 'piece' ? PIECES[or.cle] : o.source), detail: o.detail, passages: o.quotes ?? o.passages, source: o.source } };
    });
  }
  const o = objet(v);
  return o ? Object.keys(o).map((cle) => ({ cle, f: objet(o[cle]) || { valeur: o[cle] } })) : [];
}

const CSS = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#efece6;color:#1c1b19;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;overflow-wrap:anywhere}
.page{max-width:210mm;margin:24px auto;background:#fff;padding:18mm 16mm;box-shadow:0 1px 6px rgba(0,0,0,.12)}
h1{font-size:26px;line-height:1.2;margin:0 0 4px;letter-spacing:-.01em}
.sur{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b665d;margin:0 0 6px}
h2{font-size:18px;margin:34px 0 12px;padding-bottom:6px;border-bottom:2px solid #1c1b19;break-after:avoid;page-break-after:avoid}
h2 .n{display:inline-block;min-width:1.9em;color:#8a5a1c}
h3{font-size:14px;margin:18px 0 6px;break-after:avoid;page-break-after:avoid}
p{margin:0 0 8px}
ul,ol{margin:0 0 8px;padding-left:20px}
li{margin:0 0 3px}
a{color:#1b4f8a;text-decoration:none}
.url{font-size:.86em;word-break:break-word}
.nr{color:#8b867c;font-style:italic}
.brut{color:#6b665d;font-size:.9em}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.84em}
.exemple{border:1px dashed #8a5a1c;background:#fbf4e8;color:#6a4410;padding:8px 12px;margin:0 0 18px;font-size:13px}
.statut{display:inline-block;max-width:100%;margin:12px 0 0;padding:7px 12px;border:1.5px solid;font-weight:600;font-size:15px}
.statut.oui{border-color:#1f6b3a;color:#17522c;background:#eef7f0}
.statut.non{border-color:#9a5b12;color:#7a4508;background:#fdf5e7}
dl.fiche{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 18px;margin:14px 0 0}
dl.fiche dt{color:#6b665d}
dl.fiche dd{margin:0;min-width:0}
dl.kv{display:grid;grid-template-columns:fit-content(42%) minmax(0,1fr);gap:2px 12px;margin:0}
dl.kv dt{color:#6b665d;min-width:0}
dl.kv dd{margin:0;min-width:0}
.conclusion{border:1.5px solid #1c1b19;padding:14px 16px;break-inside:avoid;page-break-inside:avoid}
.conclusion .code{font-size:34px;font-weight:700;letter-spacing:.02em;line-height:1.1}
.conclusion .code.faible{font-size:22px;font-weight:600;color:#6b665d}
.conclusion .lib{font-size:16px;margin:4px 0 0}
.alerte-bloc{border:1.5px solid #9a5b12;background:#fdf5e7;color:#7a4508;padding:8px 12px;margin:10px 0 0;break-inside:avoid;page-break-inside:avoid}
.bloc{border-left:3px solid #d9d4c9;padding:2px 0 2px 14px;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
.bloc>h3:first-child{margin-top:0}
.bloc dl.kv{margin:0 0 8px}
.bloc.arret{border-left-color:#9a5b12}
.bloc.long{break-inside:auto;page-break-inside:auto}
.bloc.long>dl{break-inside:avoid;page-break-inside:avoid}
.piece{break-inside:avoid;page-break-inside:avoid;white-space:pre-wrap;background:#f7f5f0;border:1px solid #e4dfd4;padding:10px 12px;margin:0 0 10px;font-size:14px}
blockquote{white-space:pre-wrap;margin:6px 0;padding:6px 12px;border-left:3px solid #8a5a1c;background:#faf7f1;break-inside:avoid;page-break-inside:avoid}
blockquote.officiel{border-left-color:#1b4f8a;background:#f3f6fa}
.d{color:#6b665d;font-size:13px}
del{color:#8f2a2a;text-decoration-thickness:1.5px}
.etiq{display:inline-block;max-width:100%;font-size:12px;padding:1px 7px;border:1px solid #b9b3a6;border-radius:10px;color:#4c4841;vertical-align:1px;font-weight:400}
.etiq.alerte{border-color:#9a5b12;color:#7a4508;background:#fdf5e7}
table{width:100%;table-layout:fixed;border-collapse:collapse;margin:0 0 12px;font-size:13.5px}
th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #e4dfd4}
.w5{width:5%}.w9{width:9%}.w13{width:13%}.w15{width:15%}.w17{width:17%}.w20{width:20%}.w21{width:21%}.w22{width:22%}.w33{width:33%}
.nb{white-space:nowrap}
th{font-weight:600;color:#4c4841;border-bottom:1.5px solid #1c1b19;font-size:12.5px}
tr{break-inside:avoid;page-break-inside:avoid}
.note{background:#f7f5f0;border:1px solid #e4dfd4;padding:10px 12px;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
.note ul{margin:6px 0 0}
.avert{border:1px solid #1c1b19;padding:10px 12px;font-size:13.5px;break-inside:avoid;page-break-inside:avoid}
@media (max-width:700px){.page{margin:0;padding:20px 16px}dl.fiche,dl.kv{grid-template-columns:minmax(0,1fr);gap:0}dl.fiche dd,dl.kv dd{margin:0 0 6px}table{font-size:12px}th,td{padding:5px 3px}.nb{white-space:normal}.w5{width:8%}.conclusion .code{font-size:28px}}
@page{size:A4;margin:18mm 16mm 20mm}
@page{@bottom-right{content:counter(page) " / " counter(pages);font:9pt -apple-system,Helvetica,Arial,sans-serif;color:#6b665d}}
@media print{
  body{background:#fff;font-size:10.5pt}
  .page{max-width:none;margin:0;padding:0;box-shadow:none}
  h1{font-size:20pt}h2{font-size:13.5pt;margin-top:22pt}h3{font-size:11pt}
  .conclusion .code{font-size:24pt}.conclusion .code.faible{font-size:15pt}
  table{font-size:9.5pt}th{font-size:9pt}.piece{font-size:10pt}
  a{color:#1c1b19}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

const section = (n, titre, corps) => `<section><h2><span class="n">${n}.</span> ${esc(titre)}</h2>${corps}</section>`;
const citation = (q, classe = '') => `<blockquote${classe ? ` class="${classe}"` : ''}>“${esc(q)}”</blockquote>`;
// Une cellule de code ne refuse le retour à la ligne que si elle est courte.
const nb = (s) => (plat(s).length <= 16 ? ' class="nb"' : '');
// Un score (confiance, similarité) n'est recopié que si c'est un nombre ; jamais un texte, un pourcentage ou un booléen.
function score(v) {
  if (nombre(v)) return esc(String(v));
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return esc(v.trim());
  return null;
}
const SCORE_ILLISIBLE = '<span class="nr">non-numeric value received, not displayed</span>';
const MOTS_VIDES = /^(null|undefined|nan|true|false|none|oui|non|yes|no|n\/a|\[object object\])$/i;

export function dossierHtml(d) {
  d = objet(d) || {};
  const pieces = objet(d.pieces) || {};
  const lues = table({ description: lirePiece(pieces.description), fiche_technique: lirePiece(pieces.fiche_technique) });
  const textes = table({ description: lues.description.texte, fiche_technique: lues.fiche_technique.texte });
  const faits = lireFaits(d.caracteristiques);
  const valeurs = new Map(faits.map(({ cle, f }) => [cle, plat(f.valeur)]));
  const etatFaits = new Map(); // clé du fait -> nombre de passages vérifiés qui l'appuient

  // Ce qui est retiré du document est compté, motif par motif.
  const retraits = { introuvable: 0, barre: 0, court: 0, sans_piece: 0, faux_absent: 0, sans_source: 0 };

  // Passages déclarés faux : repérés à toutes leurs occurrences, dans la pièce nommée (ou dans les deux).
  const coupes = table({ description: [], fiche_technique: [] });
  const faux = tableau(pieces.passages_declares_faux).map((p) => (objet(p) ? { ...p } : { quote: p })).map((p) => {
    const q = typeof p.quote === 'string' ? p.quote.trim() : '', or = origine(p.source);
    const cibles = or.type === 'piece' ? [or.cle] : or.type === 'aucune' || or.type === 'inconnue' ? ['fiche_technique', 'description'] : [];
    const ou = [];
    if (q.length >= MIN_CITATION) for (const c of cibles) { const pos = positions(textes[c], q); if (pos.length) { ou.push(c); for (const i of pos) coupes[c].push([i, i + q.length]); } }
    if (!ou.length) retraits.faux_absent++;
    return { ...p, q, ou };
  });
  const barrer = (nom) => {
    const texte = textes[nom], c = [...coupes[nom]].sort((a, b) => a[0] - b[0]);
    let out = '', pos = 0;
    for (const [a, b] of c) { if (b <= pos) continue; const de = Math.max(a, pos); out += esc(texte.slice(pos, de)) + `<del>${esc(texte.slice(de, b))}</del>`; pos = b; }
    return out + esc(texte.slice(pos));
  };

  // Vérification d'un passage attribué au produit. Rend { type:'piece', texte, ou }, { type:'fait', texte, cle } ou { motif }.
  const passage = (q, source) => {
    const or = origine(source);
    let r;
    if (typeof q !== 'string') r = { motif: 'introuvable' };
    else if (or.type === 'sans_piece') r = { motif: 'sans_piece' };
    else if (or.type === 'fait') {
      const v = valeurs.get(or.cle);
      const egal = typeof v === 'string' && v && v.toLowerCase() === q.trim().toLowerCase();
      const x = egal ? { texte: v } : chercher(v, q);
      r = x.texte ? { type: 'fait', texte: x.texte, cle: or.cle } : x;
    } else {
      const cibles = or.type === 'piece' ? [or.cle] : ['fiche_technique', 'description'];
      const ordre = ['barre', 'court', 'introuvable'];
      r = { motif: 'introuvable' };
      for (const c of cibles) {
        const x = chercher(textes[c], q, coupes[c]);
        if (x.texte) { r = { type: 'piece', texte: x.texte, ou: c }; break; }
        if (ordre.indexOf(x.motif) < ordre.indexOf(r.motif)) r = x;
      }
    }
    if (r.motif) retraits[r.motif]++;
    return r;
  };
  const MOTIFS = table({
    introuvable: 'A stated passage is not found word for word in the cited document: it is not displayed.',
    barre: 'A stated passage lies in a part of the documents that a person declared false: it is not displayed as support.',
    court: 'A stated passage is too short to prove anything: it is not displayed.',
    sans_piece: 'The attached text comes from an answer given without a document: it is not displayed as a quotation from the documents.',
  });
  const refus = (r) => `<p class="d">${MOTIFS[r.motif]}</p>`;
  // Un fait cité comme appui n'est pas une pièce : on dit ce qui l'appuie lui-même.
  const appuiFait = (cle) => (etatFaits.get(cle) > 0 ? 'This fact is supported by passages from the documents, quoted in section 4.' : 'This fact is not supported by any verified passage from the documents: it is not evidence drawn from the product documents.');

  // Validation : seul un nom écrit vaut validation. Un booléen, un nombre, un objet ou un mot technique n'en est pas un.
  const quiBrut = d.validated_by;
  const qui = typeof quiBrut === 'string' ? quiBrut.trim() : '';
  const valide = Boolean(qui) && /\p{L}/u.test(qui) && !MOTS_VIDES.test(qui);
  const nomIllisible = !valide && !vide(quiBrut);
  const quand = lireDate(d.validated_at);
  const phraseStatut = valide ? `Proposal validated by ${esc(qui)}${quand.ok ? ` on ${esc(quand.texte)}` : quand.brut ? ', date received unreadable' : ', date not provided'}` : 'Proposal not validated';
  const dateDossier = quand.ok ? esc(quand.texte) : vide(d.validated_at) ? dateHtml(d.date) : dateHtml(d.validated_at);

  // 1. En-tête
  const exemple = !(vide(d.exemple) || d.exemple === false || d.exemple === 0 || /^(false|0|non|no)$/i.test(plat(d.exemple)));
  const entete = `<header>
<p class="sur">Customs classification file</p>
<h1>${t(d.sku)}</h1>
<div class="statut ${valide ? 'oui' : 'non'}">${phraseStatut}</div>
<dl class="fiche">
<dt>Product reference</dt><dd>${t(d.sku)}</dd>
<dt>Destination</dt><dd>${t(pays(d.destination))}</dd>
<dt>Date</dt><dd>${dateDossier}</dd>
<dt>Status returned by the API</dt><dd>${statut(d.status_api)}</dd>
<dt>Request identifier</dt><dd>${plat(d.request_id) ? `<span class="mono">${esc(plat(d.request_id))}</span>` : NR}</dd>
</dl></header>`;

  // 2. Conclusion
  const c = lireCode(d.code);
  const niv = niveau(d, c);
  const g = objet(d.graphe);
  const res = g ? objet(g.resultat) || {} : {};
  const codeArbre = lireCode(res.code);
  const ecartArbre = plat(res.statut) === 'code' && divergent(c, codeArbre)
    ? `The code the interpretation tree leads to (${esc(code(res.code))}) is not the code ${esc(code(d.code))} returned by the API. Both cannot be right at once: the discrepancy must be resolved before any use.` : '';
  // Décision unique : quand un déclarant a arbitré, c'est son code qui figure au dossier, avec sa raison.
  const decis = objet(d.decision), arb = decis ? objet(decis.arbitrage) : null, enPresence = decis ? objet(decis.codes_en_presence) || {} : {};
  const arbitre = Boolean(arb && plat(arb.qui) && plat(arb.raison) && lireCode(arb.code).ok && plat(decis.origine) === 'arbitrage');
  const blocArbitrage = arbitre ? `<div class="alerte-bloc"><strong>Arbitration by ${esc(plat(arb.qui))}${plat(arb.quand) ? ' on ' + esc(plat(arb.quand).slice(0, 10)) : ''}.</strong> Code retained: ${esc(code(arb.code))}. Engine: ${plat(enPresence.moteur) ? esc(code(enPresence.moteur)) : 'no code'}. Encoded rule: ${plat(enPresence.regle) ? esc(code(enPresence.regle)) : 'no conclusion'}.<br>Reason given: ${esc(plat(arb.raison))}${tableau(arb.elements).length ? `<br>Elements examined: ${tableau(arb.elements).map((x) => esc(plat(x))).join(', ')}` : ''}</div>` : '';
  const origineTxt = decis ? { convergence: 'The engine and the encoded rule reach the same code.', moteur: 'Code proposed by the engine; no encoded rule concluded on this product.', arbitrage: 'Code retained by a declarant after arbitration between two readings.' }[plat(decis.origine)] || '' : '';
  const st = plat(d.status_api);
  const ferme = PROPOSITIONS.includes(st) || arbitre || (decis && plat(decis.origine) === 'convergence');
  const reserve = !c.ok ? '' : ferme ? '' : st
    ? `Status returned by the API: ${statut(d.status_api)}. The API does not present this code as a settled proposal.`
    : 'The status returned by the API is not provided: nothing indicates that this code is a retained proposal.';
  const blocCode = !c.brut ? '<div class="d">Proposed code</div><div class="code"><span class="nr">No code proposed</span></div>'
    : !c.ok ? `<div class="d">Proposed code</div><div class="code faible"><span class="nr">No readable code</span></div><p class="d">Value received in place of the code: “${esc(c.brut)}”</p>`
      : `<div class="d">${ferme ? 'Proposed code' : 'Code received, not retained as a proposal'}</div><div class="code${ferme ? '' : ' faible'}">${esc(code(d.code))}</div>`;
  const conclusion = section(2, 'Conclusion', `<div class="conclusion">
${blocCode}
<div class="lib">${plat(d.libelle) ? esc(plat(d.libelle)) : '<span class="nr">Heading description not provided</span>'}</div>
${origineTxt ? `<p class="d">${esc(origineTxt)}</p>` : ''}${blocArbitrage}${reserve && !arbitre ? `<div class="alerte-bloc">${reserve}</div>` : ''}${ecartArbre && !arbitre ? `<div class="alerte-bloc">${ecartArbre}</div>` : ''}
<dl class="fiche">
<dt>Status returned by the API</dt><dd>${statut(d.status_api)}</dd>
<dt>Validation</dt><dd>${phraseStatut}</dd>
<dt>Level reached</dt><dd><strong>${esc(niv.charAt(0).toUpperCase() + niv.slice(1))}</strong>${plat(d.niveau_hint) ? `<div class="d">Detail from the API: ${esc(plat(d.niveau_hint))}</div>` : ''}</dd>
<dt>Nomenclature</dt><dd>${t(d.system)}</dd>
<dt>Nomenclature version</dt><dd>${t(d.version_nomenclature)}</dd>
</dl></div>`);

  // 3. Description technique et pièces
  const photo = objet(d.photo);
  const nonLu = photo ? tableau(photo.non_lu) : [];
  const blocPiece = (nom) => (lues[nom].illisible ? '<p><span class="etiq alerte">unreadable document</span> This document was received in a form that is not text: it is not displayed, and no passage can be verified in it.</p>'
    : textes[nom].trim() ? `<div class="piece">${barrer(nom)}</div>` : `<p>${NR}</p>`);
  const fauxVus = faux.filter((p) => p.ou.length);
  const sPieces = section(3, 'Technical description and documents', `
<h3>Description</h3>${blocPiece('description')}
<h3>Datasheet or label transcription</h3>${blocPiece('fiche_technique')}
<h3>Photo</h3>${photo
    ? `<p>File: ${plat(photo.fichier) ? `<span class="mono">${esc(plat(photo.fichier))}</span>` : NR}</p>${nonLu.length ? `<p>What could not be read on the photo:</p><ul>${nonLu.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : '<p class="d">No unreadable part reported.</p>'}`
    : '<p class="d">No photo attached to this file.</p>'}
${faux.length ? `<h3>Passages declared false by a person</h3>${fauxVus.length ? `<p class="d">These passages appear in the documents but a person declared them false. They are struck through wherever they appear and were not used for the classification.</p><ul>${fauxVus.map((p) => `<li><del>“${esc(p.q)}”</del> <span class="d">(${[plat(p.sujet) && `subject: ${esc(plat(p.sujet))}`, `document: ${esc(p.ou.map((x) => PIECES[x]).join(', '))}`].filter(Boolean).join('; ')})</span></li>`).join('')}</ul>` : ''}${faux.length > fauxVus.length ? `<p class="d">${faux.length - fauxVus.length} ${pl(faux.length - fauxVus.length, 'passage declared false does not appear', 'passages declared false do not appear')} in the documents of this file: ${pl(faux.length - fauxVus.length, 'it is not displayed', 'they are not displayed')}.</p>` : ''}` : ''}`);

  // 4. Faits confirmés
  const sFaits = section(4, 'Confirmed facts', faits.length ? faits.map(({ cle, f }) => {
    const annonces = tableau(f.passages);
    const verifies = annonces.map((q) => passage(q, f.source));
    const cites = verifies.filter((r) => r.type === 'piece');
    etatFaits.set(cle, cites.length);
    const sansPiece = !cites.length && (SANS_PIECE.test(sansAccent(f.provenance)) || !plat(f.provenance));
    const sansPassage = !cites.length && !sansPiece;
    return `<div class="bloc"><h3>${esc(nomFait(cle))}: ${t(f.valeur)} ${sansPiece ? '<span class="etiq alerte">no supporting document</span>' : sansPassage ? '<span class="etiq alerte">no verified passage</span>' : ''}</h3>
<p><span class="d">Provenance:</span> ${t(f.provenance)}${plat(f.detail) ? `<br><span class="d">${esc(plat(f.detail))}</span>` : ''}</p>
${cites.map((r) => citation(r.texte)).join('')}${[...new Set(verifies.filter((r) => r.motif).map((r) => r.motif))].map((m) => refus({ motif: m })).join('')}
${sansPiece ? '<p class="d">Fact entered by hand: no document in the file supports it.</p>' : sansPassage ? '<p class="d">The stated provenance is not supported by any verified passage in the documents of this file.</p>' : ''}</div>`;
  }).join('') : `<p>${NR}</p>`);

  // Un texte présenté comme officiel doit porter une référence ou une adresse ; sinon il est retiré et compté.
  const officiel = (x, cleTexte) => {
    const corps = plat(x[cleTexte]);
    if (corps && !plat(x.ref) && !estUrl(plat(x.url))) { retraits.sans_source++; return null; }
    return corps;
  };

  // 5. Raisonnement
  let raisonnement;
  if (!g) raisonnement = '<p>No interpretation tree was followed for this file. The proposed code rests on the evidence and the evaluation rounds described below.</p>';
  else {
    const rs = plat(res.statut);
    const issue = rs === 'code' ? (codeArbre.brut ? `The tree leads to code <strong>${esc(code(res.code))}</strong>.` : 'The tree announces a code but returns none.')
      : rs === 'information_manquante' ? 'The tree stops before reaching a code: a piece of information is missing.'
        : rs === 'hors_perimetre' ? 'The product falls outside the scope covered by the tree.'
          : rs ? `Outcome returned by the tree: ${esc(rs)}${plat(res.code) ? `, code ${esc(code(res.code))}` : ''}.` : 'Tree outcome not provided.';
    const etapes = liste(g.chemin).map((e, i) => {
      e = objet(e) || {};
      const officiels = tableau(e.textes).map((x) => (objet(x) ? x : { texte: x }));
      const or = origine(e.source);
      const r = plat(e.citation) ? passage(e.citation, e.source) : null;
      const appui = !r ? (or.type === 'sans_piece' ? '<p class="d">Answer given by a person: no product document establishes it.</p>' : '<p class="d">Passage from the product documents: not provided for this step.</p>')
        : r.type === 'piece' ? `<p class="d">What establishes it in the product documents (${esc(PIECES[r.ou])}):</p>${citation(r.texte)}`
          : r.type === 'fait' ? `<p class="d">What establishes it is not a passage from the documents but the confirmed fact “${esc(nomFait(r.cle))}”, with value “${esc(r.texte)}”. ${appuiFait(r.cle)}</p>`
            : (r.motif === 'sans_piece' ? '<p class="d">Answer given by a person: no product document establishes it.</p>' : '') + refus(r);
      return `<div class="bloc"><h3>Step ${i + 1}. ${t(e.question)}</h3>
<p><span class="d">Answer:</span> <strong>${t(e.reponse)}</strong></p>
${officiels.length ? officiels.map((x) => { const corps = officiel(x, 'texte'); return corps === null ? '<p class="d">A text received without a reference or an address is not displayed as an official text.</p>' : `<p class="d">Official text: ${t(x.ref)}</p>${corps ? citation(corps, 'officiel') : ''}${plat(x.url) ? `<p>${lien(x.url)}</p>` : ''}`; }).join('') : '<p class="d">Official text: not provided for this step.</p>'}
${appui}</div>`;
    }).join('');
    const b = objet(g.blocage);
    const options = b ? (objet(b.options) ? Object.entries(b.options).map(([k, v]) => `<li>If the answer is “${esc(k)}”: ${t(Array.isArray(v) ? v.map(code) : v)}</li>`) : tableau(b.options).map((o) => `<li>${t(o)}</li>`)) : [];
    raisonnement = `<p class="note">Interpretation tree, version ${t(g.version)}. Status of this version, copied as the application wrote it: ${plat(g.statut_version) ? `“${esc(plat(g.statut_version))}”` : NR}. ${issue}</p>
${ecartArbre ? `<div class="alerte-bloc" style="margin:0 0 14px">${ecartArbre}</div>` : ''}
${etapes || '<p class="d">No step followed.</p>'}
${b ? `<div class="bloc arret"><h3>Stopping point</h3><p>The path stops at this question, which the documents do not answer: <strong>${t(b.question)}</strong></p>${options.length ? `<p class="d">What the answer decides between:</p><ul>${options.join('')}</ul>` : ''}</div>` : ''}`;
  }
  const sRaison = section(5, 'Reasoning', raisonnement);

  // 6. Alternatives écartées
  const alts = tableau(d.alternatives).map((a) => (objet(a) ? a : { raison: a }));
  const sAlt = section(6, 'Alternatives set aside', alts.length
    ? `<table><thead><tr><th class="w17">Code</th><th class="w33">Description</th><th>Reason for setting aside</th></tr></thead><tbody>${alts.map((a) => `<tr><td${nb(code(a.code))}><strong>${t(code(a.code))}</strong></td><td>${t(a.libelle)}</td><td>${t(a.raison)}</td></tr>`).join('')}</tbody></table>`
    : `<p>${NR}</p>`);

  // 7. Preuves
  const preuves = tableau(d.preuves).map((p) => (objet(p) ? p : { extrait: p }));
  const preuvesHtml = preuves.map((p) => {
    const corps = officiel(p, 'extrait');
    if (corps === null) return '';
    return `<div class="bloc"><h3>${t(p.ref)}${estUrl(plat(p.url)) ? '' : ' <span class="etiq alerte">no address</span>'}</h3>${corps ? citation(corps, 'officiel') : `<p>Excerpt: ${NR}</p>`}<p><span class="d">Version:</span> ${t(p.version)}</p><p>${lien(p.url) || `<span class="d">Address:</span> ${NR}`}</p></div>`;
  }).filter(Boolean);
  const preuvesRetirees = preuves.length - preuvesHtml.length;
  const sPreuves = section(7, 'Evidence', preuves.length
    ? `${preuvesHtml.length ? '<p class="note">The excerpts below are those the API returned with their reference. This document does not compare them with the official text: they are to be re-read at the address given.</p>' : ''}${preuvesHtml.join('')}${preuvesRetirees ? `<p class="d">${preuvesRetirees} ${pl(preuvesRetirees, 'excerpt received without a reference or an address is not displayed', 'excerpts received without a reference or an address are not displayed')}: nothing allows ${pl(preuvesRetirees, 'it', 'them')} to be presented as official text.</p>` : ''}`
    : `<p>${NR}</p>`);

  // 8. Décisions officielles proches
  const CHAMPS_DECISION = ['ruling_id', 'source', 'official_code', 'ruling_date', 'url', 'similarity', 'applicabilite'];
  const decisions = tableau(d.decisions_officielles_proches).map((x) => (objet(x) ? x : { ruling_id: x }));
  const cit = (o) => plat(objet(o) ? o.citation : o);
  // Côté produit d'une comparaison : passage vérifié dans la pièce nommée, fait confirmé, ou rien.
  const coteProduit = (p, absent) => {
    if (!cit(p)) return absent;
    const r = passage(cit(p), objet(p) ? p.source : '');
    return r.type === 'piece' ? `“${esc(r.texte)}” <span class="d">(${esc(PIECES[r.ou])})</span>`
      : r.type === 'fait' ? `Confirmed fact “${esc(nomFait(r.cle))}”: “${esc(r.texte)}”${etatFaits.get(r.cle) > 0 ? '' : ' <span class="etiq alerte">no verified passage</span>'}`
        : `<span class="nr">${esc(MOTIFS[r.motif])}</span>`;
  };
  const sDecisions = section(8, 'Close official rulings', decisions.length
    ? `<p class="note"><strong>A close ruling is not proof.</strong> It concerns another product, sometimes in another jurisdiction or at another date. It informs the reasoning, it does not establish it.</p>${decisions.map((x) => {
      const a = objet(x.applicabilite), ad = (a && objet(a.decision)) || {};
      const communs = a ? liste(a.points_communs).map((p) => objet(p) || {}) : [];
      const diffs = a ? liste(a.differences).map((p) => objet(p) || {}) : [];
      // Révocation, expiration, modification : lues sur un booléen ou une liste, jamais devinées dans un texte.
      const revoquee = [x.revoquee, x.revoked, x.is_revoked, ad.revoquee].includes(true) || /^(revoked|r[ée]voqu[ée]e)$/i.test(plat(x.status)) || liste(ad.revoquee_par).length > 0 || liste(x.revoquee_par).length > 0;
      const expiree = [x.expiree, x.expired, x.is_expired, ad.expiree].includes(true);
      const modifiee = liste(ad.modifiee_par).length > 0 || liste(x.modifiee_par).length > 0;
      const reserves = [revoquee && 'revoked', expiree && 'expired', modifiee && 'modified since'].filter(Boolean);
      const autres = sans(x, CHAMPS_DECISION);
      const autresAd = sans(ad, ['id', 'source', 'date', 'url', 'code', 'revoquee', 'revoquee_par', 'modifiee_par', 'date_fin', 'expiree', 'texte_disponible', 'juridiction']);
      const sim = score(x.similarity);
      const v = a ? plat(a.verdict) : '';
      return `<div class="bloc${a ? ' long' : ''}"><h3>${t(x.ruling_id)} <span class="etiq">${t(x.source)}</span>${reserves.map((r) => ` <span class="etiq alerte">${r}</span>`).join('')}</h3>
${revoquee ? '<p><strong>This ruling is reported as revoked: it can no longer be relied on.</strong></p>' : ''}${expiree ? '<p><strong>This ruling has passed its end of validity date.</strong></p>' : ''}${modifiee ? '<p><strong>This ruling was modified by a later ruling, to be read before any use.</strong></p>' : ''}
<dl class="kv"><dt>Ruling code</dt><dd>${t(code(x.official_code))}</dd><dt>Ruling date</dt><dd>${dateHtml(x.ruling_date)}</dd>${vide(x.similarity) ? '' : `<dt>Similarity returned by the API</dt><dd>${sim === null ? SCORE_ILLISIBLE : sim}</dd>`}<dt>Address</dt><dd>${lien(x.url) || NR}</dd></dl>
${Object.keys(autres).some((k) => !vide(autres[k])) ? `<p class="d">Other fields returned for this ruling:</p>${rendu(autres)}` : ''}
${a ? `<h3>Applicability check</h3>
<dl class="kv"><dt>Verdict</dt><dd><strong>${v ? esc(VERDICTS[v] || v) : NR}</strong></dd><dt>Grounds</dt><dd>${t(a.motif)}</dd><dt>Same jurisdiction as the destination</dt><dd>${typeof a.meme_juridiction === 'boolean' ? (a.meme_juridiction ? 'yes' : 'no') : t(a.meme_juridiction)}</dd>
${objet(a.decision) ? `<dt>Text read at the official source</dt><dd>${ad.texte_disponible === true ? 'yes' : ad.texte_disponible === false ? 'no' : NR}</dd>
<dt>Revocation</dt><dd>${ad.revoquee === true ? '<strong>revoked</strong>' : ad.revoquee === false ? 'not revoked, according to the source' : 'not known: the source does not make it possible to tell'}${liste(ad.revoquee_par).length ? `, by ${t(ad.revoquee_par)}` : ''}</dd>
${liste(ad.modifiee_par).length ? `<dt>Modified by</dt><dd>${t(ad.modifiee_par)}</dd>` : ''}
<dt>End of validity date</dt><dd>${dateHtml(ad.date_fin)}</dd>
<dt>Expired</dt><dd>${ad.expiree === true ? '<strong>yes</strong>' : ad.expiree === false ? 'no' : 'not known'}</dd>` : ''}
${nombre(a.rejetes) && a.rejetes > 0 ? `<dt>Items rejected</dt><dd>${a.rejetes} ${pl(a.rejetes, 'comparison item rejected: its quotation', 'comparison items rejected: their quotation')} could not be found word for word in the product documents or in the ruling.</dd>` : ''}
${nombre(a.hors_criteres) && a.hors_criteres > 0 ? `<dt>Items outside the criteria</dt><dd>${a.hors_criteres} ${pl(a.hors_criteres, 'item set aside: it did', 'items set aside: they did')} not bear on a criterion that decides the classification.</dd>` : ''}</dl>
${Object.keys(autresAd).some((k) => !vide(autresAd[k])) ? rendu(autresAd) : ''}
${communs.length ? `<table><thead><tr><th class="w22">Point in common</th><th>In the product documents</th><th>In the ruling</th></tr></thead><tbody>${communs.map((p) => `<tr><td>${t(p.aspect)}</td><td>${coteProduit(p.produit, NR)}</td><td>${cit(p.decision) ? `“${esc(cit(p.decision))}”` : NR}</td></tr>`).join('')}</tbody></table>` : '<p class="d">Points in common: not provided.</p>'}
${diffs.length ? `<table><thead><tr><th class="w17">Difference</th><th>In the product documents</th><th>In the ruling</th><th>Why it matters</th></tr></thead><tbody>${diffs.map((p) => `<tr><td>${t(p.aspect)}${p.decisive === true ? '<br><span class="etiq alerte">decisive</span>' : ''}</td><td>${coteProduit(p.produit, '<span class="nr">The documents say nothing about it</span>')}</td><td>${cit(p.decision) ? `“${esc(cit(p.decision))}”` : NR}</td><td>${t(p.pourquoi_ca_compte)}</td></tr>`).join('')}</tbody></table>` : '<p class="d">Differences: not provided.</p>'}
<p class="d">The quotations from the ruling are to be re-read at the address given: the text of the ruling is not attached to this file.</p>`
        : '<p class="d">Applicability check: not carried out for this ruling.</p>'}</div>`;
    }).join('')}`
    : '<p>No close official ruling is attached to this file.</p>');

  // 9. Obligations et droits
  let sOblig = '';
  if (!vide(d.obligations)) {
    const ob = objet(d.obligations) || (Array.isArray(d.obligations) ? { obligations: d.obligations } : null);
    if (!ob) sOblig = section(9, 'Obligations and duties', `<p><span class="etiq alerte">unexpected form</span> The content received for this section does not have the expected form.</p>${typeof d.obligations === 'string' ? `<p>Text received: “${esc(d.obligations.trim())}”</p>` : '<p class="d">The value received reads neither as a list of obligations nor as a duty: it is not displayed.</p>'}`);
    else {
      const items = tableau(ob.obligations), manquants = tableau(ob.manquants);
      const echecs = tableau(ob.etapes_en_echec).map((e) => (objet(e) ? e : { raison: e }));
      const erreur = plat(ob.error) || plat(ob.erreur);
      const enEchec = (noms) => Boolean(erreur) || echecs.some((e) => !plat(e.etape) || noms.includes(plat(e.etape)));
      const TITRES = ['intitule', 'titre', 'title', 'nom', 'obligation', 'label'];
      // Une valeur seule (nombre, booléen) ne dit ni un taux ni son absence : elle n'est pas présentée comme telle.
      const seule = (v, quoi) => (typeof v === 'boolean' ? `<p>${INCONNU} The value received is a boolean: it states neither ${quoi} nor its absence.</p>`
        : typeof v === 'number' ? `<p>${INCONNU} The value received is a bare number (${esc(dec(v))}), with no unit or source: it does not read as ${quoi}.</p>`
          : typeof v === 'string' ? `<div class="bloc"><p>${t(v)}</p><p class="d">Text received as is, with no basis or source.</p></div>` : null);
      const droitsHtml = (v) => {
        if (vide(v)) return `<p>${INCONNU} ${enEchec(['droits', 'compliance_check', 'classification']) ? 'The duties could not be read (see the failed calls below).' : 'No duty returned for this file.'}</p>`;
        const s = seule(v, 'a duty rate');
        if (s) return s;
        const o = objet(v);
        if (!o) return `<div class="bloc">${rendu(v)}</div>`;
        const u = plat(o.unite), avec = (x) => (u === '%' ? `${dec(x)}%` : u ? `${dec(x)} ${u}` : `${dec(x)} (unit not specified)`);
        const taux = nombre(o.taux) ? esc(avec(o.taux)) : plat(o.taux) ? esc(plat(o.taux))
          : nombre(o.taux_min) && nombre(o.taux_max) ? (o.taux_min === o.taux_max ? esc(avec(o.taux_min)) : `${esc(`from ${avec(o.taux_min)} to ${avec(o.taux_max)}`)} depending on the national tariff line: the rate applicable to the product is not known`) : '';
        const reste = sans(o, ['taux', 'taux_min', 'taux_max', 'unite']);
        return `<div class="bloc"><dl class="kv"><dt>Base rate</dt><dd>${taux ? `<strong>${taux}</strong>` : `${INCONNU} no readable rate`}</dd>${paires(reste)}</dl></div>`;
      };
      const coutHtml = (v) => {
        if (vide(v)) return `<p>${INCONNU} ${enEchec(['cout', 'compliance_check', 'classification']) ? 'The cost could not be calculated (see the failed calls below).' : 'No cost returned for this file.'}</p>`;
        const s = seule(v, 'a cost');
        if (s) return s;
        const o = objet(v);
        if (!o) return `<div class="bloc">${rendu(v)}</div>`;
        const dev = plat(o.devise), argent = (x) => esc(`${dec(x)}${dev ? ` ${dev}` : ' (currency not specified)'}`);
        const comp = tableau(o.composantes).map((x) => objet(x) || { nom: x });
        const reste = sans(o, ['total', 'devise', 'partiel', 'composantes']);
        return `<div class="bloc"><dl class="kv"><dt>Total</dt><dd>${nombre(o.total) ? `<strong>${argent(o.total)}</strong>` : `${INCONNU} no total returned`}${o.partiel === true ? ' <span class="etiq alerte">partial total</span><div class="d">This total does not include the components that are not known: it is not the full cost.</div>' : ''}</dd>${paires(reste)}</dl>
${comp.length ? `<table><thead><tr><th>Component</th><th class="w22">Amount</th><th class="w15">Rate</th><th class="w33">Source</th></tr></thead><tbody>${comp.map((x) => `<tr><td>${t(x.nom)}</td><td>${x.connu !== false && nombre(x.montant) ? argent(x.montant) : INCONNU}</td><td>${nombre(x.taux_pct) ? esc(`${dec(x.taux_pct)}%`) : ''}</td><td>${lien(x.source_url)}</td></tr>`).join('')}</tbody></table>` : ''}</div>`;
      };
      const route = objet(ob.route);
      const contexte = sans(ob, [...(route ? ['route'] : []), 'obligations', 'textes_catalogue', 'droits', 'cout', 'manquants', 'etapes_en_echec', 'rejetes', 'catalogue_ecartes', 'ecartes', 'error', 'erreur', 'brut']);
      const catalogue = tableau(ob.textes_catalogue);
      const obligationHtml = (o) => {
        if (!objet(o)) return `<div class="bloc"><p>${t(o)}</p></div>`;
        const k = TITRES.find((x) => plat(o[x]));
        const reste = sans(o, [k]);
        const alertes = [o.sourcee === false && 'no source document', plat(o.origine) === 'deduite_par_un_modele' && 'inferred by a model, to be verified'].filter(Boolean);
        return `<div class="bloc">${k ? `<h3>${esc(plat(o[k]))}${alertes.map((x) => ` <span class="etiq alerte">${x}</span>`).join('')}</h3>` : alertes.map((x) => `<span class="etiq alerte">${x}</span> `).join('')}${Object.keys(reste).some((x) => !vide(reste[x])) ? rendu(reste) : ''}</div>`;
      };
      sOblig = section(9, 'Obligations and duties', `
<h3>Obligations</h3>${items.length ? items.map(obligationHtml).join('') : `<p>${enEchec(['obligations', 'catalogue_reglementaire', 'compliance_check', 'classification']) ? `${INCONNU} The obligations could not be read (see the failed calls below). Their absence is not established.` : 'No obligation is returned for this file.'}</p>`}
${catalogue.length ? `<h3>Regulatory catalog texts</h3><p class="d">These texts are listed for this type of product. Their application to this product is not established.</p>${catalogue.map(obligationHtml).join('')}` : ''}
<h3>Customs duties</h3>${droitsHtml(ob.droits)}
<h3>Cost</h3>${coutHtml(ob.cout)}
${manquants.length ? `<h3>What is missing or remains unknown</h3><ul>${manquants.map((m) => `<li>${INCONNU} ${t(m)}</li>`).join('')}</ul>` : ''}
${echecs.length || erreur ? `<h3>Failed calls</h3><ul>${echecs.map((e) => `<li><span class="etiq alerte">failed</span> ${plat(e.etape) ? `${esc(traduit('etape', e.etape) || plat(e.etape))}: ` : ''}${t(e.raison)}</li>`).join('')}${erreur ? `<li><span class="etiq alerte">failed</span> Error returned: ${esc(erreur)}</li>` : ''}</ul>` : ''}
${nombre(ob.rejetes) && ob.rejetes > 0 ? `<p>${ob.rejetes} ${pl(ob.rejetes, 'obligation set aside: its title', 'obligations set aside: their title')} could not be found word for word in the API response.</p>` : ''}
${nombre(ob.catalogue_ecartes) && ob.catalogue_ecartes > 0 ? `<p>${ob.catalogue_ecartes} ${pl(ob.catalogue_ecartes, 'catalog text set aside: empty entry or unreadable title', 'catalog texts set aside: empty entry or unreadable title')}.</p>` : ''}
${nombre(ob.ecartes) && ob.ecartes > 0 ? `<p>${ob.ecartes} ${pl(ob.ecartes, 'item calculated on a provisional code was set aside', 'items calculated on a provisional code were set aside')}.</p>` : ''}
${route || Object.keys(contexte).some((k) => !vide(contexte[k])) ? `<h3>Conditions of the lookup</h3><dl class="kv">${route ? `<dt>Country of origin</dt><dd>${t(pays(route.origine))}</dd><dt>Country of destination</dt><dd>${t(pays(route.destination))}</dd>${paires(sans(route, ['origine', 'destination']))}` : ''}${paires(contexte)}</dl>` : ''}
${vide(ob.brut) ? '' : '<p class="d">The raw API responses are kept in the file; they are not reproduced in this document.</p>'}`);
    }
  }

  // 10. Questions restantes
  const questions = tableau(d.questions_restantes).map((q) => (objet(q) ? q : { question: q }));
  const sQuestions = section(10, 'Open questions', questions.length
    ? `<ol>${questions.map((q) => `<li><strong>${t(q.question)}</strong>${plat(q.pourquoi) ? `<br><span class="d">Why it matters: ${esc(plat(q.pourquoi))}</span>` : ''}</li>`).join('')}</ol>`
    : '<p>No open question is recorded in this file.</p>');

  // 11. Historique
  const tours = tableau(d.tours).map((x) => objet(x) || {});
  const epreuves = tableau(d.epreuves).map((x) => objet(x) || {});
  const autres = tableau(d.autres_destinations).map((x) => objet(x) || {});
  const sHisto = section(11, 'History', `
<h3>Evaluation rounds</h3>${tours.length ? `<table><thead><tr><th class="w5">#</th><th>Cause</th><th class="w21">Status</th><th class="w13">Code retained</th><th class="w15">Confidence returned by the API</th><th class="w9">Time</th></tr></thead><tbody>${tours.map((x, i) => `<tr><td>${i + 1}</td><td>${t(x.cause)}<div class="d">Request: ${plat(x.request_id) ? `<span class="mono">${esc(plat(x.request_id))}</span>` : NR}</div></td><td>${statut(x.statut)}</td><td${nb(code(x.code_retenu))}>${plat(x.code_retenu) ? esc(code(x.code_retenu)) : '<span class="nr">none</span>'}</td><td>${vide(x.confiance) ? '<span class="nr">not supplied</span>' : score(x.confiance) ?? SCORE_ILLISIBLE}</td><td>${vide(x.secondes) ? NR : nombre(x.secondes) ? `${esc(dec(x.secondes))} s` : esc(plat(x.secondes))}</td></tr>`).join('')}</tbody></table><p class="d">The confidence returned by the API is a score internal to the engine, copied as is. It serves to compare the rounds with one another and does not measure whether the code is right.</p>` : `<p>${NR}</p>`}
<h3>Robustness tests</h3>${epreuves.length ? `<table><thead><tr><th class="w15">Test</th><th>What was replayed</th><th class="w20">Before</th><th class="w20">After</th><th class="w20">Verdict</th></tr></thead><tbody>${epreuves.map((x) => `<tr><td>${t(x.type)}</td><td>${t(x.input)}</td><td>${t(x.before)}</td><td>${t(x.after)}</td><td><strong>${t(x.verdict)}</strong></td></tr>`).join('')}</tbody></table>` : '<p>No robustness test was replayed for this file.</p>'}
${autres.length ? `<h3>Other destinations evaluated</h3><table><thead><tr><th class="w22">Country</th><th>Status</th><th class="w15">Code</th><th class="w20">Nomenclature</th></tr></thead><tbody>${autres.map((x) => `<tr><td>${t(pays(x.pays))}</td><td>${plat(x.erreur) ? `Error: ${esc(plat(x.erreur))}` : statut(x.statut)}</td><td${nb(code(x.code))}>${plat(x.code) ? esc(code(x.code)) : '<span class="nr">none</span>'}</td><td>${t(x.nomenclature)}</td></tr>`).join('')}</tbody></table>` : ''}`);

  // 12. Validation
  const sValidation = section(12, 'Validation', `
<div class="statut ${valide ? 'oui' : 'non'}" style="margin:0 0 12px">${phraseStatut}</div>
${valide ? `<dl class="fiche" style="margin:0 0 14px"><dt>Person</dt><dd>${esc(qui)}</dd><dt>Date</dt><dd>${dateHtml(d.validated_at)}</dd></dl>` : `<p>No authorized person has approved this proposal yet. It must not be used for a declaration as it stands.</p>${nomIllisible ? '<p class="d">The value received in place of the person\'s name is not a name: it does not count as validation and is not displayed.</p>' : ''}`}
<h3>API disclaimer</h3><div class="avert">${plat(d.avertissement) ? esc(plat(d.avertissement)) : NR}</div>`);

  // Le compte de ce qui a été retiré ne se connaît qu'une fois tout le document rendu.
  const corps = sPieces + sFaits + sRaison + sAlt + sPreuves + sDecisions + sOblig + sQuestions + sHisto + sValidation;
  const illisibles = Object.keys(lues).filter((k) => lues[k].illisible).length;
  const n = retraits;
  const lignes = [
    n.introuvable && `${n.introuvable} ${pl(n.introuvable, 'passage attributed to the product documents is not found', 'passages attributed to the product documents are not found')} word for word in those documents.`,
    n.barre && `${n.barre} ${pl(n.barre, 'passage cited in support lies', 'passages cited in support lie')} in a part of the documents that a person declared false.`,
    n.court && `${n.court} ${pl(n.court, 'passage is too short', 'passages are too short')} to prove anything.`,
    n.sans_piece && `${n.sans_piece} ${pl(n.sans_piece, 'text attached to an answer given without a document is not a quotation', 'texts attached to answers given without a document are not quotations')} from the documents.`,
    n.faux_absent && `${n.faux_absent} ${pl(n.faux_absent, 'passage declared false does not appear', 'passages declared false do not appear')} in the documents.`,
    n.sans_source && `${n.sans_source} ${pl(n.sans_source, 'text presented as official arrived', 'texts presented as official arrived')} without a reference or an address.`,
    illisibles && `${illisibles} ${pl(illisibles, 'document received is not readable text', 'documents received are not readable text')}: no passage can be verified in ${pl(illisibles, 'it', 'them')}.`,
  ].filter(Boolean);
  const total = n.introuvable + n.barre + n.court + n.sans_piece + n.faux_absent + n.sans_source;
  const compte = lignes.length ? `<div class="note"><strong>${total ? `${total} ${pl(total, 'item was removed', 'items were removed')} from this document because ${pl(total, 'it', 'they')} could not be verified.` : 'The documents could not be verified.'}</strong><ul>${lignes.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Classification file ${t(d.sku).replace(/<[^>]+>/g, '')}</title>
<style>${CSS}</style>
</head>
<body>
<main class="page">
${exemple ? `<p class="exemple"><strong>Example file.</strong> It shows the layout and contains invented values. This document has no classification value.${plat(d.note_exemple) ? ` ${esc(plat(d.note_exemple))}` : ''}</p>` : ''}
<section>${entete}</section>
${compte}
${conclusion}
${corps}
</main>
</body>
</html>
`;
}

export default dossierHtml;
