// Projets de déclaration de conformité, un par marché. Le document reprend ce que le dossier a
// établi (identité confirmée, code retenu, approbation, textes officiels vérifiés mot pour mot)
// et laisse EN BLANC ce que seul le fabricant peut attester : adresse, normes appliquées,
// rapports d'essai, organisme notifié, signataire. Rien n'y affirme que le produit est conforme.

const MARCHES = { EU: 'European Union', GB: 'United Kingdom', CH: 'Switzerland', US: 'United States', CA: 'Canada', MX: 'Mexico', JP: 'Japan', KR: 'South Korea', AU: 'Australia', NZ: 'New Zealand', TW: 'Taiwan' };
const ORDRE = Object.keys(MARCHES);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const texte = (v) => (v == null ? '' : String(v).trim());
const lien = (u) => (/^https:\/\//.test(texte(u)) ? esc(u) : '');
const fmtCode = (c) => texte(c).replace(/^(\d{4})(\d{2})(.*)$/, (_, a, b, r) => `${a}.${b}${r ? '.' + r : ''}`);
const DECL = /declaration of conformity/i;

// La famille de produit des exigences vérifiées : celle du produit de la boutique, sinon celle
// d'un produit de la boutique dont la règle donne le même code à six chiffres.
export function familleDuDossier(D, dec, M) {
  if (!M || !M.produits) return null;
  const sku = texte(D && D.produit && D.produit.sku);
  if (sku && Object.hasOwn(M.produits, sku)) return { famille: M.produits[sku].famille, memeProduit: true };
  const code = texte(dec && dec.code).slice(0, 6);
  const proche = code ? Object.values(M.produits).find((p) => texte(p.code_regle).slice(0, 6) === code) : null;
  return proche ? { famille: proche.famille, memeProduit: false } : null;
}

// Une déclaration par marché qui a au moins une exigence vérifiée pour cette famille.
export function declarations(D, dec, M) {
  if (!D || !D.produit || !dec || !dec.code) return [];
  const f = familleDuDossier(D, dec, M);
  if (!f) return [];
  const exig = (M.reglementation || []).filter((e) => e.verifie === true && (e.produits || []).includes(f.famille));
  return ORDRE.map((m) => {
    const liste = exig.filter((e) => e.marche === m);
    // le texte officiel qui demande lui-même une déclaration de conformité, s'il y en a un
    const demande = liste.filter((e) => DECL.test(texte(e.citation)));
    return { marche: m, nom: MARCHES[m], exigences: liste, demande, memeProduit: f.memeProduit };
  }).filter((d) => d.exigences.length);
}

const vide = (quoi) => `<span class="blanc" title="To be completed by the manufacturer">${esc(quoi)}</span>`;
const ligne = (nom, valeur) => `<tr><th>${esc(nom)}</th><td>${valeur}</td></tr>`;
const dit = (v, quoi) => (texte(v) ? esc(texte(v)) : vide(quoi));

function page(d, D, dec, cree) {
  const p = D.produit, i = D.identite || {}, v = D.valide, six = /^\d{6}$/.test(texte(dec.code));
  const titre = d.marche === 'EU' ? 'EU declaration of conformity' : `Declaration of conformity, ${d.nom}`;
  const base = d.demande.length
    ? `<p class="base">The official text asks for this declaration: ${d.demande.map((e) => `${esc(e.acte)}, ${esc(e.article)}`).join(' · ')}.</p>`
    : `<p class="base attention">None of the verified requirements recorded for ${esc(d.nom)} asks for a declaration of conformity by that name. This page gathers what the verified texts require; check with the authority which form the declaration takes in this market.</p>`;
  const textes = d.exigences.map((e, n) => `<li><div class="acte"><b>${n + 1}. ${esc(e.acte)}</b><span>${esc(e.article)}</span></div>
      <p>${esc(e.exigence)}</p><blockquote>${esc(e.citation)}</blockquote>
      <p class="petit">${lien(e.url) ? `<a href="${lien(e.url)}">${lien(e.url)}</a> · ` : ''}quote checked word for word against the official text on ${esc(e.verifie_le || 'date not recorded')}${e.en_vigueur ? ` · in force since ${esc(e.en_vigueur)}` : ''}${e.marque ? ` · mark: ${esc(e.marque)}${d.memeProduit ? (e.vu_sur_etiquette === true ? ', seen on the photographed label' : e.vu_sur_etiquette === false ? ', NOT seen on the photographed label' : '') : ''}` : ''}</p></li>`).join('');
  return `<section class="page">
    <div class="projet">DRAFT · prepared from the classification file · to be completed and signed by the manufacturer</div>
    <h1>${esc(titre)}</h1>${base}
    <h2>1. Product</h2><table>
      ${ligne('Model', dit(i.modele, 'model'))}${ligne('Configuration', dit(i.configuration, 'configuration'))}
      ${ligne('SKU', dit(p.sku, 'SKU'))}${texte(p.gtin) ? ligne('GTIN', esc(p.gtin)) : ''}
      ${ligne('Description', esc(texte(p.desc)))}
      ${ligne('Identity', i.confirmee ? 'confirmed in the file' : '<b class="attention">not confirmed in the file</b>')}</table>
    <h2>2. Manufacturer</h2><table>
      ${ligne('Name', dit(i.fabricant, 'name of the manufacturer'))}${ligne('Address', vide('postal address of the manufacturer'))}
      ${ligne('Authorised representative', vide('name and address, if one is appointed'))}</table>
    <p class="serment">This declaration is issued under the sole responsibility of the manufacturer.</p>
    <h2>3. Customs classification kept in the file</h2><table>
      ${ligne('Code', `<b class="code">${esc(fmtCode(dec.code))}</b>${six ? ' · six-digit pre-classification, not a declaration code' : ''}`)}
      ${ligne('Approval', v ? `approved by ${esc(texte(v.validated_by))} on ${esc(texte(v.validated_at).slice(0, 10))}` : '<b class="attention">not approved by a declarant yet</b>')}</table>
    <h2>4. Legislation this declaration refers to</h2>
    <p class="petit">${d.exigences.length} requirement${d.exigences.length === 1 ? '' : 's'} recorded for this product family in ${esc(d.nom)}, each quoted from the official text.${d.memeProduit ? '' : ' They were recorded for a product of the same six-digit code, not for this exact product: check that each one applies.'}</p>
    <ol class="textes">${textes}</ol>
    <h2>5. To complete before signing</h2><table>
      ${ligne('Standards or technical specifications applied', vide('references and dates of the standards'))}
      ${ligne('Test reports', vide('laboratory, report numbers, dates'))}
      ${ligne('Notified or approved body', vide('name and number, if the procedure involves one'))}
      ${ligne('Technical documentation kept by', vide('name and address'))}</table>
    <h2>6. Signature</h2><table>
      ${ligne('Signed for and on behalf of', vide('manufacturer'))}${ligne('Place and date of issue', vide('place, date'))}
      ${ligne('Name and function', vide('name, function'))}${ligne('Signature', vide('signature'))}</table>
    <p class="pied">Prepared on ${esc(cree)} from classification file ${esc(texte(p.sku))}. The fields in dashed boxes are not known to the file. This draft does not state that the product complies: only the signed declaration of the manufacturer does.</p>
  </section>`;
}

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#F1EFEA;color:#131312;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.barre{position:sticky;top:0;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 24px;background:#131312;color:#fff;font-size:13px}
.barre button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:8px 16px;background:#fff;color:#131312;cursor:pointer}
.page{background:#fff;max-width:820px;margin:24px auto;padding:44px 52px;border-radius:10px;box-shadow:0 0 0 1px #E3E0D8;page-break-after:always}
.projet{font:600 11px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8A5A00;background:#FBF1DC;border-radius:6px;padding:7px 10px;margin-bottom:18px}
h1{font-size:28px;letter-spacing:-.02em;margin:0 0 8px}h2{font-size:15px;margin:26px 0 8px;padding-top:14px;border-top:1px solid #E3E0D8}
table{width:100%;border-collapse:collapse}th{text-align:left;font-weight:500;color:#6B6860;width:240px;vertical-align:top;padding:6px 12px 6px 0}td{padding:6px 0;vertical-align:top}
.blanc{display:inline-block;min-width:260px;border:1px dashed #B9B5AA;border-radius:5px;padding:2px 8px;color:#9A968C;font-size:12.5px}
.code{font-family:ui-monospace,Menlo,monospace;font-size:15px}.base{color:#4A4842;margin:0}.attention{color:#8A5A00}
.serment{font-weight:600;margin:12px 0 0}.petit{font-size:12.5px;color:#6B6860;margin:6px 0}.petit a{color:inherit;word-break:break-all}
.textes{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:14px}.textes li{break-inside:avoid}
.acte{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.acte span{font-size:12.5px;color:#6B6860;text-align:right}
.textes p{margin:4px 0}blockquote{margin:6px 0;padding:8px 12px;border-left:3px solid #D8D4CA;background:#FAF9F6;font-size:13px;color:#33312D}
.pied{margin-top:28px;padding-top:12px;border-top:1px solid #E3E0D8;font-size:12px;color:#6B6860}
@media print{body{background:#fff}.barre{display:none}.page{box-shadow:none;margin:0;max-width:none;padding:0 0 24px;border-radius:0}}
`;

// Le document complet, une page par marché. cree : date du jour au format AAAA-MM-JJ.
export function declarationsHtml(D, dec, M, cree = new Date().toISOString().slice(0, 10)) {
  const liste = declarations(D, dec, M);
  if (!liste.length) return null;
  const sku = esc(texte(D.produit.sku));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Declarations of conformity, draft · ${sku}</title><style>${CSS}</style></head><body>
  <div class="barre"><span>${liste.length} draft declaration${liste.length === 1 ? '' : 's'} of conformity · ${sku} · ${liste.map((d) => esc(d.nom)).join(', ')}</span><button onclick="print()">Print or save as PDF</button></div>
  ${liste.map((d) => page(d, D, dec, cree)).join('')}</body></html>`;
}
