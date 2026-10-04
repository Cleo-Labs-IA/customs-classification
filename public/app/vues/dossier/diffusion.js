// Étape 6, diffusion : ce qui se passe une fois le code approuvé. Quatre cartes :
// l'approbation (où elle est conservée), les exports (des fichiers à importer ailleurs,
// rien n'est publié depuis ici), la vérification du code à la demande (aucune veille
// automatique n'est branchée) et le renvoi vers la vue monde.
import { esc, ic, etat, nomPays, drapeau } from '../../ui.js';
import { fmtCode } from '../../conformite.js';

const ENTETE = 'sku,origin,destination,code,system,level,approved_by,approved_at,classification_id,review_version';
const texte = (v) => (v === null || v === undefined ? '' : String(v));
const dit = (v) => (texte(v).trim() ? esc(v) : 'not provided');
const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : 'not provided');
const quand = (iso) => { const d = new Date(texte(iso)); return iso && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'not provided'; };
const champCsv = (v) => { const s = texte(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const carte = (titre, cote, corps) => `<div class="carte"><div class="carte-tete"><h3>${titre}</h3>${cote ? `<span class="muted">${cote}</span>` : ''}</div><div class="carte-corps">${corps}</div></div>`;
const bouton = (action, libelle, icone, cls = 'blanc', actif = true) => `<button type="button" class="btn ${cls} petit" data-action-dossier="${action}"${actif ? '' : ' disabled'}>${ic(icone)}${esc(libelle)}</button>`;
const note = (t) => `<p class="faint" style="font-size:12.5px;margin-top:12px">${t}</p>`;
// L'accusé de l'API : seulement quand la revue dit explicitement qu'elle n'est pas locale.
const parApi = (D) => !!(D.valide && D.revue && D.revue.locale === false);

// Le fichier à importer ailleurs. Un code à six chiffres reste une pré-classification,
// quel que soit le niveau demandé : il n'est jamais présenté comme un code de déclaration.
export function csvImport(D, dec) {
  if (!D || !D.valide || !dec || !dec.code) return null;
  const p = D.produit || {}, api = parApi(D), code = texte(dec.code), six = /^\d{6}$/.test(code);
  const ligne = [p.sku, p.origin, p.dest, code, six ? 'hs6' : '', six || D.niveau === 'hs6' ? 'six-digit pre-classification' : 'national',
    D.valide.validated_by, D.valide.validated_at, api ? (D.revue.classification_id || D.classificationId) : '', api ? D.revue.version : ''];
  return ENTETE + '\n' + ligne.map(champCsv).join(',') + '\n';
}

function approbation(D) {
  if (!D.valide) return carte('Approval', '', `<p>${etat('en_attente', 'Not approved')}</p><p class="muted" style="font-size:13px;margin-top:10px">This file is not approved. Distribution starts after the review (step 5).</p>`);
  const v = D.valide;
  if (parApi(D)) {
    const r = D.revue, id = texte(r.classification_id || D.classificationId);
    return carte('Approval', '', `<p>${etat('pret', 'Saved in the Cleo Legal API')}</p>
      <dl class="kv" style="margin-top:12px"><dt>Reviewer</dt><dd>${dit(r.reviewer || v.validated_by)}</dd>
      <dt>Date</dt><dd>${quand(r.created_at || v.validated_at)}</dd>
      <dt>Review version</dt><dd>${dit(r.version)}</dd>
      <dt>Classification ID</dt><dd>${id ? `<span class="code" title="${esc(id)}">${esc(id.slice(0, 8))}</span>` : 'not provided'}</dd>
      ${texte(r.approved_code) ? `<dt>Approved code</dt><dd><span class="code">${esc(fmtCode(r.approved_code))}</span></dd>` : ''}</dl>`);
  }
  return carte('Approval', '', `<p>${etat('a_verifier', 'This browser only')}</p>
    <p class="muted" style="font-size:13px;margin-top:10px">The approval is kept in this browser only, because the classification was not saved by the API. It is not visible from another device or to another user.</p>
    <dl class="kv" style="margin-top:12px"><dt>Approved by</dt><dd>${dit(v.validated_by)}</dd><dt>Date</dt><dd>${quand(v.validated_at)}</dd></dl>`);
}

function exportsCarte(D, dec) {
  const csv = csvImport(D, dec) !== null, b = [bouton('imprimer', 'Readable file', 'fichier')];
  if (D.valide) b.push(bouton('telecharger', 'File as JSON', 'import'));
  if (D.classificationId) b.push(bouton('dossier-api-pdf', 'Dossier from the API, PDF', 'dossier'), bouton('dossier-api-json', 'Dossier from the API, JSON', 'dossier'));
  b.push(bouton('csv', 'Export for import (CSV)', 'import', csv ? 'noir' : 'blanc', csv));
  const raison = csv ? '' : `<p class="muted" style="font-size:12.5px;margin-top:10px">The CSV export is not available: ${!D.valide ? 'the file is not approved yet.' : 'no code is retained.'}</p>`;
  const six = csv && /^\d{6}$/.test(texte(dec.code));
  return carte('Exports', csv ? 'Exported for import' : '', `<div style="display:flex;flex-wrap:wrap;gap:8px">${b.join('')}</div>${raison}
    ${note(`An export is a file to import elsewhere. Nothing is sent to another system from here.${six ? ' The six-digit code is a pre-classification, not a declaration code.' : ''}`)}`);
}

function verification(D, dec) {
  const v = D.codeVerifie, code = dec && dec.code, dest = (D.produit && D.produit.dest) || '';
  let corps = '<p class="muted" style="font-size:13px">No check has been run on this file yet.</p>';
  if (v === 'encours') corps = `<p>${etat('en_attente', 'Checking the code')}</p>`;
  else if (v && v.erreur) corps = `<p class="note-l erreur">${ic('alerte')}<span>The check did not complete: ${esc(v.erreur)}</span></p>`;
  else if (v && typeof v === 'object') {
    const ou = texte(v.country || dest), e = v.exists === true ? etat('pret', 'Code exists') : v.exists === false ? etat('bloque', 'Code not found') : etat('a_verifier', 'Existence not returned');
    corps = `<p>${e}</p><dl class="kv" style="margin-top:12px"><dt>Code</dt><dd><span class="code">${esc(fmtCode(v.code || code))}</span>${texte(v.system) ? ` <span class="faint">${esc(v.system)}</span>` : ''}</dd>
      <dt>Destination</dt><dd>${ou ? `${drapeau(ou)} ${esc(nomPays(ou))}` : 'not provided'}</dd>
      <dt>Status</dt><dd>${dit(v.status)}</dd>
      ${typeof v.dataset_version === 'string' && v.dataset_version ? `<dt>Dataset</dt><dd>${esc(v.dataset_version)}</dd>` : v.dataset_version && typeof v.dataset_version === 'object' && (v.dataset_version.source_version || v.dataset_version.version) ? `<dt>Dataset</dt><dd>${esc(v.dataset_version.source_version || v.dataset_version.version)}</dd>` : ''}
      <dt>Checked on</dt><dd>${quand(v.le || v.checkedAt)}</dd></dl>
      ${texte(v.hint) ? `<p class="faint" style="font-size:12.5px;margin-top:10px">${esc(v.hint)}</p>` : ''}`;
  }
  return carte('Code check', '', `${corps}<div style="margin-top:12px">${bouton('verifier-code', 'Check this code today', 'horloge', 'blanc', !!code && v !== 'encours')}</div>
    ${code ? '' : '<p class="muted" style="font-size:12.5px;margin-top:10px">No code is retained, so there is nothing to check.</p>'}
    ${note('The check runs on demand. No automatic monitoring is connected.')}`);
}

function monde(D, M) {
  const sku = texte(D.produit && D.produit.sku);
  const connu = M && M.produits && sku && Object.hasOwn(M.produits, sku) ? M.produits[sku] : null;
  if (!M) return carte('World', '', '<p class="muted" style="font-size:13px">Loading the world data.</p>');
  if (!connu) return carte('World', '', `<p class="muted" style="font-size:13px">The world data is recorded only for the products of the store. This product is not one of them.</p>
    <div style="margin-top:12px"><a class="btn noir petit" href="/#/monde">${ic('globe')}Open the world view</a></div>`);
  const b = connu.bilan || {};
  return carte('World', texte(M.fixe_le) ? `recorded on ${esc(M.fixe_le)}` : '', `<dl class="kv" style="grid-template-columns:minmax(0,1fr) auto">
      <dt>Countries looked up</dt><dd>${num(b.consultes)}</dd>
      <dt>National lines proposed</dt><dd>${num(b.lignes_nationales)}</dd>
      <dt>Countries where the engine alone proposes another code</dt><dd>${num(b.desaccord)}</dd>
      <dt>Verified requirements</dt><dd>${num(b.exigences)} in ${num(b.marches_exigences)} markets</dd></dl>
    <div style="margin-top:12px"><a class="btn noir petit" href="/#/monde?sku=${esc(encodeURIComponent(sku))}">${ic('globe')}Open the world view</a></div>`);
}

export function diffusionCarte(D, dec, M) {
  return approbation(D) + exportsCarte(D, dec) + verification(D, dec) + monde(D, M);
}
