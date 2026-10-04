// Étape 2 du dossier : l'identité. L'utilisateur confirme de quel produit PHYSIQUE parle le
// dossier (fabricant, modèle, configuration). Un SKU ou un GTIN identique n'est qu'une
// suggestion : deux variantes peuvent se classer différemment. Les classifications déjà
// enregistrées pour ce SKU sur le compte sont montrées pour comparaison, jamais reprises seules.
import { esc, ic, etat, jour } from '../../ui.js';

const texte = (v) => (v == null ? '' : String(v).trim());
// Une date illisible est rendue telle quelle plutôt que « Invalid Date ».
const date = (iso) => { const s = texte(iso); if (!s) return ''; return Number.isNaN(Date.parse(s)) ? s : jour(s); };
const lisible = (s) => texte(s).replace(/_/g, ' ');
const court = (id) => (id.length > 12 ? id.slice(0, 8) + '...' : id);
const TON_REVUE = { approved: 'pret', rejected: 'bloque' };

function reperes(p) {
  const sku = texte(p.sku), gtin = texte(p.gtin);
  return `<dl class="kv" style="margin-top:14px"><dt>SKU</dt><dd><span class="mono">${sku ? esc(sku) : '<span class="faint">not provided</span>'}</span></dd>
    <dt>GTIN</dt><dd><span class="mono">${gtin ? esc(gtin) : '<span class="faint">not provided</span>'}</span></dd></dl>`;
}

function formulaire(i, p) {
  return `<form data-form="identite">
    <div class="champs2">
      <div class="champ"><label for="identite-fabricant">Manufacturer</label><input class="saisie" id="identite-fabricant" name="fabricant" type="text" maxlength="120" autocomplete="off" value="${esc(texte(i.fabricant))}"></div>
      <div class="champ"><label for="identite-modele">Model</label><input class="saisie" id="identite-modele" name="modele" type="text" maxlength="120" autocomplete="off" required value="${esc(texte(i.modele))}"></div>
    </div>
    <div class="champ"><label for="identite-configuration">Configuration</label><input class="saisie" id="identite-configuration" name="configuration" type="text" maxlength="200" autocomplete="off" placeholder="e.g. 70 W, white, EU plug" value="${esc(texte(i.configuration))}"></div>
    ${reperes(p)}
    <p class="faint" style="font-size:12.5px;margin-top:10px">The SKU and GTIN come from the product record (step 1). A matching SKU or GTIN is only a suggestion.</p>
    <div style="margin-top:14px"><button class="btn noir" type="submit">${ic('check')}Confirm this product</button></div>
  </form>`;
}

function lecture(i, p, approuve) {
  const ligne = (nom, v) => `<dt>${nom}</dt><dd>${texte(v) ? esc(texte(v)) : '<span class="faint">not provided</span>'}</dd>`;
  const le = date(i.le);
  const tete = i.confirmee
    ? `<p>${etat('pret', 'Identity confirmed')}${le ? ` <span class="faint" style="font-size:12.5px">on ${esc(le)}</span>` : ''}</p>`
    : `<p>${etat('a_verifier', 'Identity not confirmed')}</p>`;
  return `${tete}
    <dl class="kv" style="margin-top:14px">${ligne('Manufacturer', i.fabricant)}${ligne('Model', i.modele)}${ligne('Configuration', i.configuration)}</dl>
    ${reperes(p)}
    ${approuve ? '<p class="faint" style="font-size:12.5px;margin-top:10px">The file is approved: the identity can no longer be edited.</p>' : '<div style="margin-top:14px"><button class="btn blanc petit" type="button" data-identite-modifier>Edit the identity</button></div>'}`;
}

function ligneHistorique(h) {
  const x = h && typeof h === 'object' ? h : {};
  const id = texte(x.classification_id), code = texte(x.approved_code) || texte(x.retained_code), quand = date(x.created_at);
  const statut = lisible(x.status), revue = lisible(x.review_status), pays = texte(x.country), systeme = texte(x.system);
  const version = x.review_version == null ? '' : texte(x.review_version);
  const meta = [quand, pays, systeme, statut && 'Status: ' + statut, version && 'Review version ' + version].filter(Boolean);
  return `<div class="precedent"><div><span class="code">${code ? esc(code) : 'No code'}</span>${texte(x.approved_code) ? ' <span class="faint">approved code</span>' : code ? ' <span class="faint">retained code, not approved</span>' : ''}
    ${meta.length ? `<br><span class="faint">${esc(meta.join(' · '))}</span>` : ''}
    ${id ? `<br><span class="faint mono" title="${esc(id)}">ID ${esc(court(id))}</span>` : ''}</div>
    <div>${etat(TON_REVUE[texte(x.review_status)] || 'a_verifier', revue ? 'Review: ' + revue : 'Not reviewed')}</div></div>`;
}

function historique(D) {
  const sku = texte(D.produit && D.produit.sku);
  const bouton = (libelle) => `<button class="btn blanc petit" type="button" data-action-dossier="historique">${libelle}</button>`;
  let corps;
  if (D.historiqueErreur) corps = `<p class="note-l erreur">${ic('alerte')}<span>The shared history could not be loaded: ${esc(D.historiqueErreur)}</span></p><div style="margin-top:10px">${bouton('Load the shared history')}</div>`;
  else if (!Array.isArray(D.historique)) corps = `<p class="muted" style="font-size:13px">The shared history is not loaded.</p><div style="margin-top:10px">${bouton('Load the shared history')}</div>`;
  else if (!D.historique.length) corps = `<p class="muted" style="font-size:13px">No classification is saved for ${sku ? 'SKU <span class="mono">' + esc(sku) + '</span>' : 'this SKU'} on this account.</p>`;
  else corps = `<p class="muted" style="font-size:13px">${D.historique.length === 1 ? 'One classification is' : esc(D.historique.length) + ' classifications are'} saved for ${sku ? 'SKU <span class="mono">' + esc(sku) + '</span>' : 'this SKU'} on this account. These are suggestions to compare. They are not reused automatically: a variant of the same product can classify differently.</p>
    <div class="precedents">${D.historique.map(ligneHistorique).join('')}</div>`;
  return `<h4 class="sous-titre">Already classified on this account</h4>${corps}`;
}

export function identiteCarte(D) {
  const p = D.produit || {}, i = D.identite || {}, approuve = D.valide != null;
  return `<div class="carte"><div class="carte-tete"><h3>Identity</h3><span class="eyebrow">Step 2</span></div><div class="carte-corps">
    <p class="muted" style="font-size:13px">Confirm which physical product this file is about: two variants of the same product can classify differently.</p>${i.source === 'label' && !i.confirmee ? '<p class="faint" style="font-size:12.5px">Prefilled from the label. Check it, correct it if needed, then confirm.</p>' : ''}
    ${i.confirmee || approuve ? lecture(i, p, approuve) : formulaire(i, p)}
    ${historique(D)}</div></div>`;
}
