// Dossier lisible : la version imprimable du dossier de classification.
// dossierHtml(d) rend un document HTML complet et autonome (CSS en ligne, aucun
// script, aucune ressource externe), prévu pour l'impression A4 ou le PDF.
// Module sans accès au DOM : il s'importe aussi bien du navigateur que de Node.
//
// Règles tenues ici :
// - toute valeur est échappée avant d'entrer dans le HTML ;
// - une valeur absente s'écrit « Non renseigné », jamais un mot technique vide ;
// - un passage attribué aux pièces du produit n'est affiché comme citation que
//   s'il se retrouve mot pour mot dans la pièce, hors de toute portion déclarée
//   fausse, et s'il est assez long pour prouver quelque chose ; sinon il est
//   retiré et compté ;
// - un statut reçu (version de l'arbre, validation, révocation) est recopié tel
//   quel ou lu sur un booléen : il n'est jamais déduit d'un mot trouvé dans un texte ;
// - la confiance de l'API est recopiée telle quelle, sous le nom « confiance rendue
//   par l'API », seulement si c'est un nombre, sans conversion en pourcentage.

const table = (o) => Object.assign(Object.create(null), o); // sans prototype : une clé reçue ne tombe jamais sur une méthode
const ESC = table({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const vide = (v) => v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v)) || (typeof v === 'string' && !v.trim());
const liste = (v) => (Array.isArray(v) ? v.filter((x) => !vide(x)) : []);
// Une valeur seule là où une liste est attendue reste une liste d'un élément : rien ne disparaît en silence.
const tableau = (v) => (Array.isArray(v) ? liste(v) : vide(v) ? [] : [v]);
const objet = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const nombre = (x) => typeof x === 'number' && Number.isFinite(x);
const fr = (x) => String(x).replace('.', ',');
const pl = (n, un, plusieurs) => (n > 1 ? plusieurs : un);
const PROFONDEUR = 6;
const TROP_PROFOND = 'contenu trop imbriqué, non affiché';

// Libellés des champs connus (ceux que rendent l'app, lib/obligations.mjs et lib/applicabilite.mjs).
const CLES = table({
  url: 'Adresse', source_url: 'Adresse de la source', reference: 'Référence', ref: 'Référence', taux: 'Taux', source: 'Source', titre: 'Intitulé',
  autorite: 'Autorité', document_id: 'Identifiant du document', sourcee: 'Document source cité', nature: 'Nature', categorie: 'Catégorie',
  obligatoire: 'Obligatoire', origine: 'Origine de l\'information', domaine_autorite: 'Domaine de l\'autorité', taux_min: 'Taux le plus bas',
  taux_max: 'Taux le plus haut', unite: 'Unité', taux_specifique: 'Taux spécifique', base_legale: 'Base légale', base: 'Base', version: 'Version',
  niveau_source: 'Niveau de la source', pays_du_tarif: 'Pays du tarif', lignes_lues: 'Lignes tarifaires lues', ligne_exacte_connue: 'Ligne exacte du produit connue',
  total: 'Total', devise: 'Devise', partiel: 'Total partiel', ligne_tarifaire: 'Ligne tarifaire', composantes: 'Composantes', nom: 'Nom', montant: 'Montant',
  connu: 'Connu', taux_pct: 'Taux', libelle_api: 'Libellé rendu par l\'API', etape: 'Étape', raison: 'Raison', code: 'Code', secondes: 'Durée (s)',
  chemin: 'Chemin d\'appel', route: 'Route', catalogue_ecartes: 'Textes du catalogue écartés', destination: 'Destination', code_provisoire_ecarte: 'Code provisoire écarté', error: 'Erreur',
  revoquee: 'Révoquée', revoked: 'Révoquée', revoquee_par: 'Révoquée par', modifiee_par: 'Modifiée par', date_fin: 'Date de fin de validité',
  expiree: 'Expirée', expired: 'Expirée', status: 'Statut', statut: 'Statut', juridiction: 'Juridiction', title: 'Intitulé', description: 'Description',
  date: 'Date', id: 'Identifiant', texte_disponible: 'Texte lu à la source officielle', intitule: 'Intitulé',
  complements: 'Compléments', citation_source: 'Passage retrouvé dans le texte officiel', autorite_complements: 'Compléments sur l\'autorité',
  code_etabli: 'Code établi', origine_pays: 'Pays d\'origine',
});
// Valeurs techniques connues, traduites ; une valeur inconnue reste telle que reçue.
const VALEURS = table({
  origine: table({ deduite_par_un_modele: 'déduite par un modèle', lue_par_l_api: 'lue par l\'API', catalogue_cleo: 'catalogue Cleo' }),
  categorie: table({ exigee_par_la_loi: 'exigée par la loi', attendue_par_contrat: 'attendue par contrat', catalogue: 'catalogue Cleo' }),
  chemin: table({ points_d_acces_separes: 'points d\'accès séparés de l\'API', compliance_check: 'contrôle complet de l\'API' }),
  niveau_source: table({ mirror: 'source miroir', official: 'source officielle' }),
  etape: table({ obligations: 'obligations', catalogue_reglementaire: 'catalogue réglementaire', droits: 'droits de douane', cout: 'coût à l\'arrivée', compliance_check: 'contrôle complet', classification: 'classification', normalisation: 'mise en forme' }),
});
const traduit = (k, v) => (typeof v === 'string' && VALEURS[k] && VALEURS[k][v.trim()]) || null;
// Libellé d'une clé : connu, il est en français ; inconnu, le nom du champ est montré tel quel, en caractères techniques.
const cleHtml = (k) => (CLES[k] ? esc(CLES[k]) : `<span class="mono">${esc(k)}</span>`);

// Texte à plat d'une valeur quelconque, ou '' si elle est vide. Jamais d'objet brut.
function plat(v, prof = 0) {
  if (vide(v)) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v !== 'object') return '';
  if (prof >= PROFONDEUR) return TROP_PROFOND;
  if (Array.isArray(v)) return v.map((x) => plat(x, prof + 1)).filter(Boolean).join(', ');
  return Object.entries(v).map(([k, x]) => [CLES[k] ? CLES[k].toLowerCase() : k.replace(/_/g, ' '), traduit(k, x) || plat(x, prof + 1)]).filter(([, x]) => x).map(([k, x]) => `${k} : ${x}`).join(' ; ');
}
const NR = '<span class="nr">Non renseigné</span>';
const t = (v) => { const s = plat(v); return s ? esc(s) : NR; };
const INCONNU = '<span class="etiq alerte">inconnu</span>';

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

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourMois = (a, m, j) => `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
const heure = (h, m) => `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')}`;
// Date lisible, en temps universel pour que le même dossier s'imprime pareil partout.
// Rend { ok, texte, brut } : une valeur qui n'est pas une date du calendrier n'est jamais reformulée en date.
function lireDate(v) {
  const non = { ok: false, texte: '', brut: plat(v) };
  if (vide(v)) return non;
  const universel = (d) => ({ ok: true, brut: non.brut, texte: `${jourMois(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())} à ${heure(d.getUTCHours(), d.getUTCMinutes())} (temps universel)` });
  if (typeof v === 'number') return Number.isInteger(v) && v >= 946684800000 && v <= 4102444800000 ? universel(new Date(v)) : non; // millisecondes, de 2000 à 2100
  if (typeof v !== 'string') return non;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(v.trim());
  if (!m) return non;
  const [a, mo, j] = [+m[1], +m[2], +m[3]];
  if (mo < 1 || mo > 12 || j < 1 || j > new Date(Date.UTC(a, mo, 0)).getUTCDate()) return non;
  if (m[4] === undefined) return { ok: true, brut: non.brut, texte: jourMois(a, mo, j) };
  if (+m[4] > 23 || +m[5] > 59 || (m[6] !== undefined && +m[6] > 59)) return non;
  if (!m[7]) return { ok: true, brut: non.brut, texte: `${jourMois(a, mo, j)} à ${heure(+m[4], +m[5])} (fuseau non précisé)` };
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? non : universel(d);
}
const dateHtml = (v) => { const x = lireDate(v); return x.ok ? esc(x.texte) : x.brut ? `<span class="nr">Valeur reçue, non reconnue comme une date :</span> « ${esc(x.brut)} »` : NR; };

function pays(code) {
  const s = plat(code);
  if (!/^[A-Za-z]{2}$/.test(s)) return s;
  try { const n = new Intl.DisplayNames(['fr'], { type: 'region' }).of(s.toUpperCase()); return n && n !== s.toUpperCase() ? `${n} (${s.toUpperCase()})` : s.toUpperCase(); } catch { return s.toUpperCase(); }
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
  if (!c.brut) return 'aucun code établi';
  if (!c.ok) return 'non établi : la valeur reçue n\'est pas un code';
  const n = c.chiffres.length, sys = plat(d.system);
  if (n < 4) return `${n} chiffres seulement : niveau du chapitre, position non établie`;
  if (n < 6) return `${n} chiffres seulement : niveau de la position, sous-position à six chiffres non établie`;
  if (n === 6) return 'six chiffres seulement, code national non établi';
  if (!sys) return `${n} chiffres, nomenclature non renseignée : le niveau national n'est pas établi`;
  if (/^hs6?$/i.test(sys)) return `${n} chiffres reçus alors que la nomenclature annoncée s'arrête à six chiffres : niveau non établi`;
  return `${n} chiffres, dans la nomenclature que l'API nomme « ${sys} »`;
}

const STATUTS = table({
  classified: 'proposition à faire valider', needs_review: 'proposition à faire relire', needs_information: 'informations nécessaires',
  ambiguous: 'plusieurs codes restent plausibles', unsupported_jurisdiction: 'aucun candidat retenu pour cette destination', stale_dataset: 'nomenclature à rafraîchir',
});
// Statuts où l'API présente bien un code comme sa proposition.
const PROPOSITIONS = ['classified', 'needs_review'];
const statut = (s) => { const k = plat(s); return k ? (STATUTS[k] ? `${esc(STATUTS[k])} <span class="brut">(${esc(k)})</span>` : esc(k)) : NR; };
const VERDICTS = table({ applicable: 'applicable', non_applicable: 'non applicable', partiellement: 'partiellement applicable', non_verifiable: 'non vérifiable' });

const FAITS = table({
  material: 'Matière', sole_material: 'Matière de la semelle', upper_material: 'Matière de la tige', composition: 'Composition', function: 'Fonction', use: 'Usage',
  process: 'Procédé', dimensions: 'Dimensions', thickness_mm: 'Épaisseur (mm)', weight_g: 'Poids (g)', power_w: 'Puissance (W)', engine_displacement_cc: 'Cylindrée (cm³)',
  voltage_v: 'Tension (V)', presentation: 'Présentation', audience: 'Public',
});
const nomFait = (k) => FAITS[k] || String(k).replace(/_/g, ' ');
const PIECES = table({ description: 'description', fiche_technique: 'fiche technique ou étiquette' });
// Noms sous lesquels une pièce peut être désignée : clé technique, ou libellé français écrit par l'app (SRC_FR dans index.html).
const sansAccent = (s) => plat(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const ALIAS = table({
  description: 'description', 'description du catalogue': 'description', 'description technique': 'description',
  fiche_technique: 'fiche_technique', 'fiche technique': 'fiche_technique', 'fiche technique ou etiquette': 'fiche_technique', etiquette: 'fiche_technique',
  'etiquette lue sur la photo': 'fiche_technique', 'etiquette photographiee': 'fiche_technique', 'transcription de l\'etiquette': 'fiche_technique',
});
// D'où vient un passage : une pièce, un fait confirmé, une réponse sans pièce, ou une source non reconnue.
function origine(source) {
  const s = plat(source), n = sansAccent(source);
  if (!s) return { type: 'aucune' };
  if (ALIAS[n]) return { type: 'piece', cle: ALIAS[n] };
  const m = /^caract[ée]ristique\s*:\s*(.+)$/i.exec(s) || /^caract[ée]ristique\s*«\s*(.+?)\s*»$/i.exec(s);
  if (m) {
    const v = m[1].replace(/^caract[ée]ristique\s*:\s*/i, '');
    return { type: 'fait', cle: Object.keys(FAITS).find((k) => FAITS[k] === v) || v };
  }
  if (/sans piece/.test(n)) return { type: 'sans_piece' };
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
      if (!o) return { cle: `fait n° ${i + 1}`, f: { valeur: x } };
      const or = origine(o.source);
      return { cle: plat(o.fact) || plat(o.cle) || `fait n° ${i + 1}`, f: { valeur: 'value' in o ? o.value : o.valeur, provenance: o.provenance ?? (or.type === 'piece' ? PIECES[or.cle] : o.source), detail: o.detail, passages: o.quotes ?? o.passages, source: o.source } };
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
const citation = (q, classe = '') => `<blockquote${classe ? ` class="${classe}"` : ''}>« ${esc(q)} »</blockquote>`;
// Une cellule de code ne refuse le retour à la ligne que si elle est courte.
const nb = (s) => (plat(s).length <= 16 ? ' class="nb"' : '');
// Un score (confiance, similarité) n'est recopié que si c'est un nombre ; jamais un texte, un pourcentage ou un booléen.
function score(v) {
  if (nombre(v)) return esc(String(v));
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return esc(v.trim());
  return null;
}
const SCORE_ILLISIBLE = '<span class="nr">valeur reçue non numérique, non affichée</span>';
const MOTS_VIDES = /^(null|undefined|nan|true|false|none|oui|non|n\/a|\[object object\])$/i;

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
    introuvable: 'Un passage annoncé ne se retrouve pas mot pour mot dans la pièce citée : il n\'est pas affiché.',
    barre: 'Un passage annoncé se trouve dans une portion des pièces qu\'une personne a déclarée fausse : il n\'est pas affiché comme appui.',
    court: 'Un passage annoncé est trop court pour prouver quoi que ce soit : il n\'est pas affiché.',
    sans_piece: 'Le texte joint vient d\'une réponse donnée sans pièce : il n\'est pas affiché comme citation des pièces.',
  });
  const refus = (r) => `<p class="d">${MOTIFS[r.motif]}</p>`;
  // Un fait cité comme appui n'est pas une pièce : on dit ce qui l'appuie lui-même.
  const appuiFait = (cle) => (etatFaits.get(cle) > 0 ? 'Ce fait est appuyé par des passages des pièces, cités en section 4.' : 'Ce fait n\'est appuyé par aucun passage vérifié des pièces : ce n\'est pas une preuve tirée des pièces du produit.');

  // Validation : seul un nom écrit vaut validation. Un booléen, un nombre, un objet ou un mot technique n'en est pas un.
  const quiBrut = d.validated_by;
  const qui = typeof quiBrut === 'string' ? quiBrut.trim() : '';
  const valide = Boolean(qui) && /\p{L}/u.test(qui) && !MOTS_VIDES.test(qui);
  const nomIllisible = !valide && !vide(quiBrut);
  const quand = lireDate(d.validated_at);
  const phraseStatut = valide ? `Proposition validée par ${esc(qui)}${quand.ok ? ` le ${esc(quand.texte)}` : quand.brut ? ', date reçue illisible' : ', date non renseignée'}` : 'Proposition non validée';
  const dateDossier = quand.ok ? esc(quand.texte) : vide(d.validated_at) ? dateHtml(d.date) : dateHtml(d.validated_at);

  // 1. En-tête
  const exemple = !(vide(d.exemple) || d.exemple === false || d.exemple === 0 || /^(false|0|non)$/i.test(plat(d.exemple)));
  const entete = `<header>
<p class="sur">Dossier de classification douanière</p>
<h1>${t(d.sku)}</h1>
<div class="statut ${valide ? 'oui' : 'non'}">${phraseStatut}</div>
<dl class="fiche">
<dt>Référence produit</dt><dd>${t(d.sku)}</dd>
<dt>Destination</dt><dd>${t(pays(d.destination))}</dd>
<dt>Date</dt><dd>${dateDossier}</dd>
<dt>Statut rendu par l'API</dt><dd>${statut(d.status_api)}</dd>
<dt>Identifiant de requête</dt><dd>${plat(d.request_id) ? `<span class="mono">${esc(plat(d.request_id))}</span>` : NR}</dd>
</dl></header>`;

  // 2. Conclusion
  const c = lireCode(d.code);
  const niv = niveau(d, c);
  const g = objet(d.graphe);
  const res = g ? objet(g.resultat) || {} : {};
  const codeArbre = lireCode(res.code);
  const ecartArbre = plat(res.statut) === 'code' && divergent(c, codeArbre)
    ? `Le code auquel aboutit l'arbre d'interprétation (${esc(code(res.code))}) n'est pas le code ${esc(code(d.code))} rendu par l'API. Les deux ne peuvent pas être justes à la fois : l'écart est à lever avant tout usage.` : '';
  const st = plat(d.status_api);
  const ferme = PROPOSITIONS.includes(st);
  const reserve = !c.ok ? '' : ferme ? '' : st
    ? `Statut rendu par l'API : ${statut(d.status_api)}. L'API ne présente pas ce code comme une proposition arrêtée.`
    : 'Le statut rendu par l\'API n\'est pas renseigné : rien n\'indique que ce code soit une proposition retenue.';
  const blocCode = !c.brut ? '<div class="d">Code proposé</div><div class="code"><span class="nr">Aucun code proposé</span></div>'
    : !c.ok ? `<div class="d">Code proposé</div><div class="code faible"><span class="nr">Aucun code lisible</span></div><p class="d">Valeur reçue à la place du code : « ${esc(c.brut)} »</p>`
      : `<div class="d">${ferme ? 'Code proposé' : 'Code reçu, non retenu comme proposition'}</div><div class="code${ferme ? '' : ' faible'}">${esc(code(d.code))}</div>`;
  const conclusion = section(2, 'Conclusion', `<div class="conclusion">
${blocCode}
<div class="lib">${plat(d.libelle) ? esc(plat(d.libelle)) : '<span class="nr">Libellé de la position non renseigné</span>'}</div>
${reserve ? `<div class="alerte-bloc">${reserve}</div>` : ''}${ecartArbre ? `<div class="alerte-bloc">${ecartArbre}</div>` : ''}
<dl class="fiche">
<dt>Statut rendu par l'API</dt><dd>${statut(d.status_api)}</dd>
<dt>Validation</dt><dd>${phraseStatut}</dd>
<dt>Niveau atteint</dt><dd><strong>${esc(niv.charAt(0).toUpperCase() + niv.slice(1))}</strong>${plat(d.niveau_hint) ? `<div class="d">Précision de l'API : ${esc(plat(d.niveau_hint))}</div>` : ''}</dd>
<dt>Nomenclature</dt><dd>${t(d.system)}</dd>
<dt>Version de la nomenclature</dt><dd>${t(d.version_nomenclature)}</dd>
</dl></div>`);

  // 3. Description technique et pièces
  const photo = objet(d.photo);
  const nonLu = photo ? tableau(photo.non_lu) : [];
  const blocPiece = (nom) => (lues[nom].illisible ? '<p><span class="etiq alerte">pièce illisible</span> Cette pièce a été reçue sous une forme qui n\'est pas un texte : elle n\'est pas affichée, et aucun passage ne peut y être vérifié.</p>'
    : textes[nom].trim() ? `<div class="piece">${barrer(nom)}</div>` : `<p>${NR}</p>`);
  const fauxVus = faux.filter((p) => p.ou.length);
  const sPieces = section(3, 'Description technique et pièces', `
<h3>Description</h3>${blocPiece('description')}
<h3>Fiche technique ou transcription de l'étiquette</h3>${blocPiece('fiche_technique')}
<h3>Photo</h3>${photo
    ? `<p>Fichier : ${plat(photo.fichier) ? `<span class="mono">${esc(plat(photo.fichier))}</span>` : NR}</p>${nonLu.length ? `<p>Ce qui n'a pas pu être lu sur la photo :</p><ul>${nonLu.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : '<p class="d">Aucune partie illisible signalée.</p>'}`
    : '<p class="d">Aucune photo jointe à ce dossier.</p>'}
${faux.length ? `<h3>Passages déclarés faux par une personne</h3>${fauxVus.length ? `<p class="d">Ces passages figurent dans les pièces mais une personne les a déclarés faux. Ils sont barrés à chaque endroit où ils apparaissent et n'ont pas servi au classement.</p><ul>${fauxVus.map((p) => `<li><del>« ${esc(p.q)} »</del> <span class="d">(${[plat(p.sujet) && `sujet : ${esc(plat(p.sujet))}`, `pièce : ${esc(p.ou.map((x) => PIECES[x]).join(', '))}`].filter(Boolean).join(' ; ')})</span></li>`).join('')}</ul>` : ''}${faux.length > fauxVus.length ? `<p class="d">${faux.length - fauxVus.length} ${pl(faux.length - fauxVus.length, 'passage déclaré faux ne figure pas', 'passages déclarés faux ne figurent pas')} dans les pièces de ce dossier : ${pl(faux.length - fauxVus.length, 'il n\'est pas affiché', 'ils ne sont pas affichés')}.</p>` : ''}` : ''}`);

  // 4. Faits confirmés
  const sFaits = section(4, 'Faits confirmés', faits.length ? faits.map(({ cle, f }) => {
    const annonces = tableau(f.passages);
    const verifies = annonces.map((q) => passage(q, f.source));
    const cites = verifies.filter((r) => r.type === 'piece');
    etatFaits.set(cle, cites.length);
    const sansPiece = !cites.length && (/sans pi[èe]ce/i.test(plat(f.provenance)) || !plat(f.provenance));
    const sansPassage = !cites.length && !sansPiece;
    return `<div class="bloc"><h3>${esc(nomFait(cle))} : ${t(f.valeur)} ${sansPiece ? '<span class="etiq alerte">sans pièce</span>' : sansPassage ? '<span class="etiq alerte">sans passage vérifié</span>' : ''}</h3>
<p><span class="d">Provenance :</span> ${t(f.provenance)}${plat(f.detail) ? `<br><span class="d">${esc(plat(f.detail))}</span>` : ''}</p>
${cites.map((r) => citation(r.texte)).join('')}${[...new Set(verifies.filter((r) => r.motif).map((r) => r.motif))].map((m) => refus({ motif: m })).join('')}
${sansPiece ? '<p class="d">Fait saisi à la main : aucune pièce du dossier ne l\'appuie.</p>' : sansPassage ? '<p class="d">La provenance annoncée n\'est appuyée par aucun passage vérifié dans les pièces de ce dossier.</p>' : ''}</div>`;
  }).join('') : `<p>${NR}</p>`);

  // Un texte présenté comme officiel doit porter une référence ou une adresse ; sinon il est retiré et compté.
  const officiel = (x, cleTexte) => {
    const corps = plat(x[cleTexte]);
    if (corps && !plat(x.ref) && !estUrl(plat(x.url))) { retraits.sans_source++; return null; }
    return corps;
  };

  // 5. Raisonnement
  let raisonnement;
  if (!g) raisonnement = '<p>Aucun arbre d\'interprétation n\'a été parcouru pour ce dossier. Le code proposé repose sur les preuves et les tours d\'évaluation décrits plus bas.</p>';
  else {
    const rs = plat(res.statut);
    const issue = rs === 'code' ? (codeArbre.brut ? `L'arbre aboutit au code <strong>${esc(code(res.code))}</strong>.` : 'L\'arbre annonce un code mais n\'en rend aucun.')
      : rs === 'information_manquante' ? 'L\'arbre s\'arrête avant d\'atteindre un code : une information manque.'
        : rs === 'hors_perimetre' ? 'Le produit sort du périmètre couvert par l\'arbre.'
          : rs ? `Issue rendue par l'arbre : ${esc(rs)}${plat(res.code) ? `, code ${esc(code(res.code))}` : ''}.` : 'Issue de l\'arbre non renseignée.';
    const etapes = liste(g.chemin).map((e, i) => {
      e = objet(e) || {};
      const officiels = tableau(e.textes).map((x) => (objet(x) ? x : { texte: x }));
      const or = origine(e.source);
      const r = plat(e.citation) ? passage(e.citation, e.source) : null;
      const appui = !r ? (or.type === 'sans_piece' ? '<p class="d">Réponse donnée par une personne : aucune pièce du produit ne l\'établit.</p>' : '<p class="d">Passage des pièces du produit : non renseigné pour cette étape.</p>')
        : r.type === 'piece' ? `<p class="d">Ce qui l'établit dans les pièces du produit (${esc(PIECES[r.ou])}) :</p>${citation(r.texte)}`
          : r.type === 'fait' ? `<p class="d">Ce qui l'établit n'est pas un passage des pièces mais le fait confirmé « ${esc(nomFait(r.cle))} », de valeur « ${esc(r.texte)} ». ${appuiFait(r.cle)}</p>`
            : (r.motif === 'sans_piece' ? '<p class="d">Réponse donnée par une personne : aucune pièce du produit ne l\'établit.</p>' : '') + refus(r);
      return `<div class="bloc"><h3>Étape ${i + 1}. ${t(e.question)}</h3>
<p><span class="d">Réponse :</span> <strong>${t(e.reponse)}</strong></p>
${officiels.length ? officiels.map((x) => { const corps = officiel(x, 'texte'); return corps === null ? '<p class="d">Un texte reçu sans référence ni adresse n\'est pas affiché comme texte officiel.</p>' : `<p class="d">Texte officiel : ${t(x.ref)}</p>${corps ? citation(corps, 'officiel') : ''}${plat(x.url) ? `<p>${lien(x.url)}</p>` : ''}`; }).join('') : '<p class="d">Texte officiel : non renseigné pour cette étape.</p>'}
${appui}</div>`;
    }).join('');
    const b = objet(g.blocage);
    const options = b ? (objet(b.options) ? Object.entries(b.options).map(([k, v]) => `<li>Si la réponse est « ${esc(k)} » : ${t(Array.isArray(v) ? v.map(code) : v)}</li>`) : tableau(b.options).map((o) => `<li>${t(o)}</li>`)) : [];
    raisonnement = `<p class="note">Arbre d'interprétation, version ${t(g.version)}. Statut de cette version, recopié tel que l'application l'a écrit : ${plat(g.statut_version) ? `« ${esc(plat(g.statut_version))} »` : NR}. ${issue}</p>
${ecartArbre ? `<div class="alerte-bloc" style="margin:0 0 14px">${ecartArbre}</div>` : ''}
${etapes || '<p class="d">Aucune étape parcourue.</p>'}
${b ? `<div class="bloc arret"><h3>Point d'arrêt</h3><p>Le parcours s'arrête sur cette question, à laquelle les pièces ne répondent pas : <strong>${t(b.question)}</strong></p>${options.length ? `<p class="d">Ce que la réponse départage :</p><ul>${options.join('')}</ul>` : ''}</div>` : ''}`;
  }
  const sRaison = section(5, 'Raisonnement', raisonnement);

  // 6. Alternatives écartées
  const alts = tableau(d.alternatives).map((a) => (objet(a) ? a : { raison: a }));
  const sAlt = section(6, 'Alternatives écartées', alts.length
    ? `<table><thead><tr><th class="w17">Code</th><th class="w33">Libellé</th><th>Raison de l'écart</th></tr></thead><tbody>${alts.map((a) => `<tr><td${nb(code(a.code))}><strong>${t(code(a.code))}</strong></td><td>${t(a.libelle)}</td><td>${t(a.raison)}</td></tr>`).join('')}</tbody></table>`
    : `<p>${NR}</p>`);

  // 7. Preuves
  const preuves = tableau(d.preuves).map((p) => (objet(p) ? p : { extrait: p }));
  const preuvesHtml = preuves.map((p) => {
    const corps = officiel(p, 'extrait');
    if (corps === null) return '';
    return `<div class="bloc"><h3>${t(p.ref)}${estUrl(plat(p.url)) ? '' : ' <span class="etiq alerte">sans adresse</span>'}</h3>${corps ? citation(corps, 'officiel') : `<p>Extrait : ${NR}</p>`}<p><span class="d">Version :</span> ${t(p.version)}</p><p>${lien(p.url) || `<span class="d">Adresse :</span> ${NR}`}</p></div>`;
  }).filter(Boolean);
  const preuvesRetirees = preuves.length - preuvesHtml.length;
  const sPreuves = section(7, 'Preuves', preuves.length
    ? `${preuvesHtml.length ? '<p class="note">Les extraits ci-dessous sont ceux que l\'API a rendus avec leur référence. Ce document ne les compare pas au texte officiel : ils sont à relire à l\'adresse indiquée.</p>' : ''}${preuvesHtml.join('')}${preuvesRetirees ? `<p class="d">${preuvesRetirees} ${pl(preuvesRetirees, 'extrait reçu sans référence ni adresse n\'est pas affiché', 'extraits reçus sans référence ni adresse ne sont pas affichés')} : rien ne permet de ${pl(preuvesRetirees, 'le', 'les')} présenter comme texte officiel.</p>` : ''}`
    : `<p>${NR}</p>`);

  // 8. Décisions officielles proches
  const CHAMPS_DECISION = ['ruling_id', 'source', 'official_code', 'ruling_date', 'url', 'similarity', 'applicabilite'];
  const decisions = tableau(d.decisions_officielles_proches).map((x) => (objet(x) ? x : { ruling_id: x }));
  const cit = (o) => plat(objet(o) ? o.citation : o);
  // Côté produit d'une comparaison : passage vérifié dans la pièce nommée, fait confirmé, ou rien.
  const coteProduit = (p, absent) => {
    if (!cit(p)) return absent;
    const r = passage(cit(p), objet(p) ? p.source : '');
    return r.type === 'piece' ? `« ${esc(r.texte)} » <span class="d">(${esc(PIECES[r.ou])})</span>`
      : r.type === 'fait' ? `Fait confirmé « ${esc(nomFait(r.cle))} » : « ${esc(r.texte)} »${etatFaits.get(r.cle) > 0 ? '' : ' <span class="etiq alerte">sans passage vérifié</span>'}`
        : `<span class="nr">${esc(MOTIFS[r.motif])}</span>`;
  };
  const sDecisions = section(8, 'Décisions officielles proches', decisions.length
    ? `<p class="note"><strong>Une décision proche n'est pas une preuve.</strong> Elle porte sur un autre produit, parfois dans une autre juridiction ou à une autre date. Elle éclaire le raisonnement, elle ne l'établit pas.</p>${decisions.map((x) => {
      const a = objet(x.applicabilite), ad = (a && objet(a.decision)) || {};
      const communs = a ? liste(a.points_communs).map((p) => objet(p) || {}) : [];
      const diffs = a ? liste(a.differences).map((p) => objet(p) || {}) : [];
      // Révocation, expiration, modification : lues sur un booléen ou une liste, jamais devinées dans un texte.
      const revoquee = [x.revoquee, x.revoked, x.is_revoked, ad.revoquee].includes(true) || /^(revoked|r[ée]voqu[ée]e)$/i.test(plat(x.status)) || liste(ad.revoquee_par).length > 0 || liste(x.revoquee_par).length > 0;
      const expiree = [x.expiree, x.expired, x.is_expired, ad.expiree].includes(true);
      const modifiee = liste(ad.modifiee_par).length > 0 || liste(x.modifiee_par).length > 0;
      const reserves = [revoquee && 'révoquée', expiree && 'expirée', modifiee && 'modifiée depuis'].filter(Boolean);
      const autres = sans(x, CHAMPS_DECISION);
      const autresAd = sans(ad, ['id', 'source', 'date', 'url', 'code', 'revoquee', 'revoquee_par', 'modifiee_par', 'date_fin', 'expiree', 'texte_disponible', 'juridiction']);
      const sim = score(x.similarity);
      const v = a ? plat(a.verdict) : '';
      return `<div class="bloc${a ? ' long' : ''}"><h3>${t(x.ruling_id)} <span class="etiq">${t(x.source)}</span>${reserves.map((r) => ` <span class="etiq alerte">${r}</span>`).join('')}</h3>
${revoquee ? '<p><strong>Cette décision est signalée comme révoquée : elle ne peut plus être invoquée.</strong></p>' : ''}${expiree ? '<p><strong>Cette décision a dépassé sa date de fin de validité.</strong></p>' : ''}${modifiee ? '<p><strong>Cette décision a été modifiée par une décision postérieure, à lire avant tout usage.</strong></p>' : ''}
<dl class="kv"><dt>Code de la décision</dt><dd>${t(code(x.official_code))}</dd><dt>Date de la décision</dt><dd>${dateHtml(x.ruling_date)}</dd>${vide(x.similarity) ? '' : `<dt>Similarité rendue par l'API</dt><dd>${sim === null ? SCORE_ILLISIBLE : sim}</dd>`}<dt>Adresse</dt><dd>${lien(x.url) || NR}</dd></dl>
${Object.keys(autres).some((k) => !vide(autres[k])) ? `<p class="d">Autres champs rendus pour cette décision :</p>${rendu(autres)}` : ''}
${a ? `<h3>Contrôle d'applicabilité</h3>
<dl class="kv"><dt>Verdict</dt><dd><strong>${v ? esc(VERDICTS[v] || v) : NR}</strong></dd><dt>Motif</dt><dd>${t(a.motif)}</dd><dt>Même juridiction que la destination</dt><dd>${typeof a.meme_juridiction === 'boolean' ? (a.meme_juridiction ? 'oui' : 'non') : t(a.meme_juridiction)}</dd>
${objet(a.decision) ? `<dt>Texte lu à la source officielle</dt><dd>${ad.texte_disponible === true ? 'oui' : ad.texte_disponible === false ? 'non' : NR}</dd>
<dt>Révocation</dt><dd>${ad.revoquee === true ? '<strong>révoquée</strong>' : ad.revoquee === false ? 'non révoquée, selon la source' : 'inconnue : la source ne permet pas de le savoir'}${liste(ad.revoquee_par).length ? `, par ${t(ad.revoquee_par)}` : ''}</dd>
${liste(ad.modifiee_par).length ? `<dt>Modifiée par</dt><dd>${t(ad.modifiee_par)}</dd>` : ''}
<dt>Date de fin de validité</dt><dd>${dateHtml(ad.date_fin)}</dd>
<dt>Expirée</dt><dd>${ad.expiree === true ? '<strong>oui</strong>' : ad.expiree === false ? 'non' : 'inconnu'}</dd>` : ''}
${nombre(a.rejetes) && a.rejetes > 0 ? `<dt>Éléments rejetés</dt><dd>${a.rejetes} ${pl(a.rejetes, 'élément de comparaison rejeté : sa citation', 'éléments de comparaison rejetés : leur citation')} ne se retrouvait pas mot pour mot dans les pièces ou dans la décision.</dd>` : ''}
${nombre(a.hors_criteres) && a.hors_criteres > 0 ? `<dt>Éléments hors critères</dt><dd>${a.hors_criteres} ${pl(a.hors_criteres, 'élément écarté : il ne portait', 'éléments écartés : ils ne portaient')} pas sur un critère qui décide du classement.</dd>` : ''}</dl>
${Object.keys(autresAd).some((k) => !vide(autresAd[k])) ? rendu(autresAd) : ''}
${communs.length ? `<table><thead><tr><th class="w22">Point commun</th><th>Dans les pièces du produit</th><th>Dans la décision</th></tr></thead><tbody>${communs.map((p) => `<tr><td>${t(p.aspect)}</td><td>${coteProduit(p.produit, NR)}</td><td>${cit(p.decision) ? `« ${esc(cit(p.decision))} »` : NR}</td></tr>`).join('')}</tbody></table>` : '<p class="d">Points communs : non renseignés.</p>'}
${diffs.length ? `<table><thead><tr><th class="w17">Différence</th><th>Dans les pièces du produit</th><th>Dans la décision</th><th>Pourquoi cela compte</th></tr></thead><tbody>${diffs.map((p) => `<tr><td>${t(p.aspect)}${p.decisive === true ? '<br><span class="etiq alerte">décisive</span>' : ''}</td><td>${coteProduit(p.produit, '<span class="nr">Les pièces n\'en disent rien</span>')}</td><td>${cit(p.decision) ? `« ${esc(cit(p.decision))} »` : NR}</td><td>${t(p.pourquoi_ca_compte)}</td></tr>`).join('')}</tbody></table>` : '<p class="d">Différences : non renseignées.</p>'}
<p class="d">Les citations de la décision sont à relire à l'adresse indiquée : le texte de la décision n'est pas joint à ce dossier.</p>`
        : '<p class="d">Contrôle d\'applicabilité : non réalisé pour cette décision.</p>'}</div>`;
    }).join('')}`
    : '<p>Aucune décision officielle proche n\'est jointe à ce dossier.</p>');

  // 9. Obligations et droits
  let sOblig = '';
  if (!vide(d.obligations)) {
    const ob = objet(d.obligations) || (Array.isArray(d.obligations) ? { obligations: d.obligations } : null);
    if (!ob) sOblig = section(9, 'Obligations et droits', `<p><span class="etiq alerte">forme inattendue</span> Le contenu reçu pour cette section n'a pas la forme prévue.</p>${typeof d.obligations === 'string' ? `<p>Texte reçu : « ${esc(d.obligations.trim())} »</p>` : '<p class="d">La valeur reçue ne se lit ni comme une liste d\'obligations ni comme un droit : elle n\'est pas affichée.</p>'}`);
    else {
      const items = tableau(ob.obligations), manquants = tableau(ob.manquants);
      const echecs = tableau(ob.etapes_en_echec).map((e) => (objet(e) ? e : { raison: e }));
      const erreur = plat(ob.error) || plat(ob.erreur);
      const enEchec = (noms) => Boolean(erreur) || echecs.some((e) => !plat(e.etape) || noms.includes(plat(e.etape)));
      const TITRES = ['intitule', 'titre', 'title', 'nom', 'obligation', 'label'];
      // Une valeur seule (nombre, booléen) ne dit ni un taux ni son absence : elle n'est pas présentée comme telle.
      const seule = (v, quoi) => (typeof v === 'boolean' ? `<p>${INCONNU} La valeur reçue est un booléen : elle ne dit ni ${quoi} ni son absence.</p>`
        : typeof v === 'number' ? `<p>${INCONNU} La valeur reçue est un nombre seul (${esc(fr(v))}), sans unité ni source : elle ne se lit pas comme ${quoi}.</p>`
          : typeof v === 'string' ? `<div class="bloc"><p>${t(v)}</p><p class="d">Texte reçu tel quel, sans base ni source.</p></div>` : null);
      const droitsHtml = (v) => {
        if (vide(v)) return `<p>${INCONNU} ${enEchec(['droits', 'compliance_check', 'classification']) ? 'Les droits n\'ont pas pu être lus (voir les appels en échec ci-dessous).' : 'Aucun droit rendu pour ce dossier.'}</p>`;
        const s = seule(v, 'un taux de droit');
        if (s) return s;
        const o = objet(v);
        if (!o) return `<div class="bloc">${rendu(v)}</div>`;
        const u = plat(o.unite), avec = (x) => (u === '%' ? `${fr(x)} %` : u ? `${fr(x)} ${u}` : `${fr(x)} (unité non précisée)`);
        const taux = nombre(o.taux) ? esc(avec(o.taux)) : plat(o.taux) ? esc(plat(o.taux))
          : nombre(o.taux_min) && nombre(o.taux_max) ? (o.taux_min === o.taux_max ? esc(avec(o.taux_min)) : `${esc(`de ${avec(o.taux_min)} à ${avec(o.taux_max)}`)} selon la ligne nationale : le taux applicable au produit n'est pas connu`) : '';
        const reste = sans(o, ['taux', 'taux_min', 'taux_max', 'unite']);
        return `<div class="bloc"><dl class="kv"><dt>Taux de base</dt><dd>${taux ? `<strong>${taux}</strong>` : `${INCONNU} aucun taux lisible`}</dd>${paires(reste)}</dl></div>`;
      };
      const coutHtml = (v) => {
        if (vide(v)) return `<p>${INCONNU} ${enEchec(['cout', 'compliance_check', 'classification']) ? 'Le coût n\'a pas pu être calculé (voir les appels en échec ci-dessous).' : 'Aucun coût rendu pour ce dossier.'}</p>`;
        const s = seule(v, 'un coût');
        if (s) return s;
        const o = objet(v);
        if (!o) return `<div class="bloc">${rendu(v)}</div>`;
        const dev = plat(o.devise), argent = (x) => esc(`${fr(x)}${dev ? ` ${dev}` : ' (devise non précisée)'}`);
        const comp = tableau(o.composantes).map((x) => objet(x) || { nom: x });
        const reste = sans(o, ['total', 'devise', 'partiel', 'composantes']);
        return `<div class="bloc"><dl class="kv"><dt>Total</dt><dd>${nombre(o.total) ? `<strong>${argent(o.total)}</strong>` : `${INCONNU} aucun total rendu`}${o.partiel === true ? ' <span class="etiq alerte">total partiel</span><div class="d">Ce total ne contient pas les composantes inconnues : ce n\'est pas le coût complet.</div>' : ''}</dd>${paires(reste)}</dl>
${comp.length ? `<table><thead><tr><th>Composante</th><th class="w22">Montant</th><th class="w15">Taux</th><th class="w33">Source</th></tr></thead><tbody>${comp.map((x) => `<tr><td>${t(x.nom)}</td><td>${x.connu !== false && nombre(x.montant) ? argent(x.montant) : INCONNU}</td><td>${nombre(x.taux_pct) ? esc(`${fr(x.taux_pct)} %`) : ''}</td><td>${lien(x.source_url)}</td></tr>`).join('')}</tbody></table>` : ''}</div>`;
      };
      const route = objet(ob.route);
      const contexte = sans(ob, [...(route ? ['route'] : []), 'obligations', 'textes_catalogue', 'droits', 'cout', 'manquants', 'etapes_en_echec', 'rejetes', 'catalogue_ecartes', 'ecartes', 'error', 'erreur', 'brut']);
      const catalogue = tableau(ob.textes_catalogue);
      const obligationHtml = (o) => {
        if (!objet(o)) return `<div class="bloc"><p>${t(o)}</p></div>`;
        const k = TITRES.find((x) => plat(o[x]));
        const reste = sans(o, [k]);
        const alertes = [o.sourcee === false && 'sans document source', plat(o.origine) === 'deduite_par_un_modele' && 'déduite par un modèle, à vérifier'].filter(Boolean);
        return `<div class="bloc">${k ? `<h3>${esc(plat(o[k]))}${alertes.map((x) => ` <span class="etiq alerte">${x}</span>`).join('')}</h3>` : alertes.map((x) => `<span class="etiq alerte">${x}</span> `).join('')}${Object.keys(reste).some((x) => !vide(reste[x])) ? rendu(reste) : ''}</div>`;
      };
      sOblig = section(9, 'Obligations et droits', `
<h3>Obligations</h3>${items.length ? items.map(obligationHtml).join('') : `<p>${enEchec(['obligations', 'catalogue_reglementaire', 'compliance_check', 'classification']) ? `${INCONNU} Les obligations n'ont pas pu être lues (voir les appels en échec ci-dessous). Leur absence n'est pas établie.` : 'Aucune obligation n\'est rendue pour ce dossier.'}</p>`}
${catalogue.length ? `<h3>Textes du catalogue réglementaire</h3><p class="d">Ces textes sont listés pour ce type de produit. Leur application à ce produit n'est pas établie.</p>${catalogue.map(obligationHtml).join('')}` : ''}
<h3>Droits de douane</h3>${droitsHtml(ob.droits)}
<h3>Coût</h3>${coutHtml(ob.cout)}
${manquants.length ? `<h3>Ce qui manque ou reste inconnu</h3><ul>${manquants.map((m) => `<li>${INCONNU} ${t(m)}</li>`).join('')}</ul>` : ''}
${echecs.length || erreur ? `<h3>Appels en échec</h3><ul>${echecs.map((e) => `<li><span class="etiq alerte">échec</span> ${plat(e.etape) ? `${esc(traduit('etape', e.etape) || plat(e.etape))} : ` : ''}${t(e.raison)}</li>`).join('')}${erreur ? `<li><span class="etiq alerte">échec</span> Erreur rendue : ${esc(erreur)}</li>` : ''}</ul>` : ''}
${nombre(ob.rejetes) && ob.rejetes > 0 ? `<p>${ob.rejetes} ${pl(ob.rejetes, 'obligation écartée : son intitulé ne se retrouvait', 'obligations écartées : leur intitulé ne se retrouvait')} pas mot pour mot dans la réponse de l'API.</p>` : ''}
${nombre(ob.catalogue_ecartes) && ob.catalogue_ecartes > 0 ? `<p>${ob.catalogue_ecartes} ${pl(ob.catalogue_ecartes, 'texte du catalogue écarté : entrée vide ou intitulé illisible', 'textes du catalogue écartés : entrée vide ou intitulé illisible')}.</p>` : ''}
${nombre(ob.ecartes) && ob.ecartes > 0 ? `<p>${ob.ecartes} ${pl(ob.ecartes, 'élément calculé sur un code provisoire a été écarté', 'éléments calculés sur un code provisoire ont été écartés')}.</p>` : ''}
${route || Object.keys(contexte).some((k) => !vide(contexte[k])) ? `<h3>Conditions de la lecture</h3><dl class="kv">${route ? `<dt>Pays d'origine</dt><dd>${t(pays(route.origine))}</dd><dt>Pays de destination</dt><dd>${t(pays(route.destination))}</dd>${paires(sans(route, ['origine', 'destination']))}` : ''}${paires(contexte)}</dl>` : ''}
${vide(ob.brut) ? '' : '<p class="d">Les réponses brutes de l\'API sont conservées dans le dossier ; elles ne sont pas reproduites dans ce document.</p>'}`);
    }
  }

  // 10. Questions restantes
  const questions = tableau(d.questions_restantes).map((q) => (objet(q) ? q : { question: q }));
  const sQuestions = section(10, 'Questions restantes', questions.length
    ? `<ol>${questions.map((q) => `<li><strong>${t(q.question)}</strong>${plat(q.pourquoi) ? `<br><span class="d">Pourquoi elle compte : ${esc(plat(q.pourquoi))}</span>` : ''}</li>`).join('')}</ol>`
    : '<p>Aucune question restante n\'est inscrite dans ce dossier.</p>');

  // 11. Historique
  const tours = tableau(d.tours).map((x) => objet(x) || {});
  const epreuves = tableau(d.epreuves).map((x) => objet(x) || {});
  const autres = tableau(d.autres_destinations).map((x) => objet(x) || {});
  const sHisto = section(11, 'Historique', `
<h3>Tours d'évaluation</h3>${tours.length ? `<table><thead><tr><th class="w5">N°</th><th>Cause</th><th class="w21">Statut</th><th class="w13">Code retenu</th><th class="w15">Confiance rendue par l'API</th><th class="w9">Durée</th></tr></thead><tbody>${tours.map((x, i) => `<tr><td>${i + 1}</td><td>${t(x.cause)}<div class="d">Requête : ${plat(x.request_id) ? `<span class="mono">${esc(plat(x.request_id))}</span>` : NR}</div></td><td>${statut(x.statut)}</td><td${nb(code(x.code_retenu))}>${plat(x.code_retenu) ? esc(code(x.code_retenu)) : '<span class="nr">aucun</span>'}</td><td>${vide(x.confiance) ? '<span class="nr">non fournie</span>' : score(x.confiance) ?? SCORE_ILLISIBLE}</td><td>${vide(x.secondes) ? NR : nombre(x.secondes) ? `${esc(fr(x.secondes))} s` : esc(plat(x.secondes))}</td></tr>`).join('')}</tbody></table><p class="d">La confiance rendue par l'API est un score interne au moteur, recopié tel quel. Elle sert à comparer les tours entre eux et ne mesure pas la justesse du code.</p>` : `<p>${NR}</p>`}
<h3>Épreuves de robustesse</h3>${epreuves.length ? `<table><thead><tr><th class="w15">Épreuve</th><th>Ce qui a été rejoué</th><th class="w20">Avant</th><th class="w20">Après</th><th class="w20">Verdict</th></tr></thead><tbody>${epreuves.map((x) => `<tr><td>${t(x.type)}</td><td>${t(x.input)}</td><td>${t(x.before)}</td><td>${t(x.after)}</td><td><strong>${t(x.verdict)}</strong></td></tr>`).join('')}</tbody></table>` : '<p>Aucune épreuve de robustesse n\'a été rejouée pour ce dossier.</p>'}
${autres.length ? `<h3>Autres destinations évaluées</h3><table><thead><tr><th class="w22">Pays</th><th>Statut</th><th class="w15">Code</th><th class="w20">Nomenclature</th></tr></thead><tbody>${autres.map((x) => `<tr><td>${t(pays(x.pays))}</td><td>${plat(x.erreur) ? `Erreur : ${esc(plat(x.erreur))}` : statut(x.statut)}</td><td${nb(code(x.code))}>${plat(x.code) ? esc(code(x.code)) : '<span class="nr">aucun</span>'}</td><td>${t(x.nomenclature)}</td></tr>`).join('')}</tbody></table>` : ''}`);

  // 12. Validation
  const sValidation = section(12, 'Validation', `
<div class="statut ${valide ? 'oui' : 'non'}" style="margin:0 0 12px">${phraseStatut}</div>
${valide ? `<dl class="fiche" style="margin:0 0 14px"><dt>Personne</dt><dd>${esc(qui)}</dd><dt>Date</dt><dd>${dateHtml(d.validated_at)}</dd></dl>` : `<p>Aucune personne habilitée n'a encore approuvé cette proposition. Elle ne doit pas servir à une déclaration en l'état.</p>${nomIllisible ? '<p class="d">La valeur reçue à la place du nom de la personne n\'est pas un nom : elle ne vaut pas validation et n\'est pas affichée.</p>' : ''}`}
<h3>Avertissement de l'API</h3><div class="avert">${plat(d.avertissement) ? esc(plat(d.avertissement)) : NR}</div>`);

  // Le compte de ce qui a été retiré ne se connaît qu'une fois tout le document rendu.
  const corps = sPieces + sFaits + sRaison + sAlt + sPreuves + sDecisions + sOblig + sQuestions + sHisto + sValidation;
  const illisibles = Object.keys(lues).filter((k) => lues[k].illisible).length;
  const n = retraits;
  const lignes = [
    n.introuvable && `${n.introuvable} ${pl(n.introuvable, 'passage attribué aux pièces du produit ne se retrouve', 'passages attribués aux pièces du produit ne se retrouvent')} pas mot pour mot dans ces pièces.`,
    n.barre && `${n.barre} ${pl(n.barre, 'passage cité à l\'appui se trouve', 'passages cités à l\'appui se trouvent')} dans une portion des pièces qu'une personne a déclarée fausse.`,
    n.court && `${n.court} ${pl(n.court, 'passage est trop court', 'passages sont trop courts')} pour prouver quoi que ce soit.`,
    n.sans_piece && `${n.sans_piece} ${pl(n.sans_piece, 'texte joint à une réponse donnée sans pièce n\'est pas une citation', 'textes joints à des réponses données sans pièce ne sont pas des citations')} des pièces.`,
    n.faux_absent && `${n.faux_absent} ${pl(n.faux_absent, 'passage déclaré faux ne figure', 'passages déclarés faux ne figurent')} pas dans les pièces.`,
    n.sans_source && `${n.sans_source} ${pl(n.sans_source, 'texte présenté comme officiel est arrivé', 'textes présentés comme officiels sont arrivés')} sans référence ni adresse.`,
    illisibles && `${illisibles} ${pl(illisibles, 'pièce reçue n\'est pas un texte lisible', 'pièces reçues ne sont pas des textes lisibles')} : aucun passage ne peut y être vérifié.`,
  ].filter(Boolean);
  const total = n.introuvable + n.barre + n.court + n.sans_piece + n.faux_absent + n.sans_source;
  const compte = lignes.length ? `<div class="note"><strong>${total ? `${total} ${pl(total, 'élément a été retiré', 'éléments ont été retirés')} de ce document, faute de pouvoir être ${pl(total, 'vérifié', 'vérifiés')}.` : 'Vérification des pièces impossible.'}</strong><ul>${lignes.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : '';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Dossier de classification ${t(d.sku).replace(/<[^>]+>/g, '')}</title>
<style>${CSS}</style>
</head>
<body>
<main class="page">
${exemple ? `<p class="exemple"><strong>Dossier d'exemple.</strong> Il montre la mise en page et contient des valeurs inventées. Ce document n'a aucune valeur de classement.${plat(d.note_exemple) ? ` ${esc(plat(d.note_exemple))}` : ''}</p>` : ''}
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
