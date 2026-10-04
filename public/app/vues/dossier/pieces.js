// Premier temps du dossier : les pièces. Une zone de dépôt (photo, étiquette,
// pictogramme), l'adresse d'une fiche produit, ou un texte ; puis la fiche à relire.
import { esc, ic, PAYS, drapeau, pluriel } from '../../ui.js';

const DS_DOCK = 'Ports: 2 x USB-A 3.2 Gen 1 (5 Gbps data), 1 x USB-C data, 1 x HDMI 2.0 (4K 60 Hz video output), 1 x RJ45 Gigabit Ethernet. Power delivery pass-through up to 100 W to the host laptop. Aluminium housing. Net weight 310 g. Input 20 V.';
export const EXEMPLES = [
  { libelle: 'USB-C dock, description only', sku: 'DOCK-PRO', desc: 'USB-C docking station for laptop', dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'USB-C dock with datasheet', sku: 'DOCK-PRO-DS', desc: 'USB-C docking station for laptop', ds: DS_DOCK, dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'Catalogue and datasheet that contradict each other', sku: 'DOCK-STAND', desc: 'USB-C charging stand for laptop, power only, no data ports, no network, no video output', ds: DS_DOCK, dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'Robot dog', sku: 'ROBO-DOG', desc: 'Interactive robot dog toy, battery powered, barks and moves on motorized base', dest: 'US', origin: 'CN', image: '/data/produits/robo-dog.svg' },
  { libelle: 'Buildable clock', sku: 'CLOCK-BRICK', desc: 'Buildable wall clock for kids, battery powered', dest: 'US', origin: 'CN', kg: '0.4', image: '/data/produits/clock-brick.svg' },
  { libelle: 'Talking toy', sku: 'TOY-FARM-01', desc: "Fisher-Price See 'n Say The Farmer Says talking animal sounds toy", dest: 'US', origin: 'CN' },
];
const PAYS_FICHE = ['FR', 'DE', 'ES', 'IT', 'NL', 'GB', 'US', 'CA', 'JP', 'AU', 'CH', 'KR', 'CN', 'VN', 'IN', 'MX'];

const choix = (id, valeur) => `<label class="choix-pays">${drapeau(valeur)}<select class="saisie" id="${id}" data-champ="${id === 'f-dest' ? 'dest' : 'origin'}">${PAYS_FICHE.map((c) => `<option value="${c}" ${c === valeur ? 'selected' : ''}>${esc(PAYS[c])}</option>`).join('')}</select></label>`;

function zoneDepot(D, ia) {
  const lit = D.lit === 'photo' ? 'Reading the photo: line-by-line transcription of what is printed' : D.lit === 'url' ? 'Reading the page: product data, characteristics, visible text' : '';
  return `<div class="carte depot-produit" id="depot-produit">
    <div class="depot-cible" data-choisir>
      <div class="depot-icones"><span>${ic('fichier')}</span><span>${ic('bouclier')}</span><span>${ic('lien')}</span></div>
      <h3>Drop a photo of the product, its label or a pictogram</h3>
      <p>JPEG, PNG or HEIC. ${ia ? 'Printed text is transcribed; anything that cannot be read with certainty is flagged.' : 'AI reading is unavailable on this server: the photo is attached, the description is entered by hand.'}</p>
      <button class="btn blanc" type="button">${ic('import')}Choose an image</button>
      <input type="file" id="f-photo" accept="image/*,.heic,.heif" class="sr">
    </div>
    <div class="depot-ou"><span>or</span></div>
    <form class="depot-url" data-form="url"><label for="f-url" class="eyebrow">Product page URL</label>
      <div class="url-ligne">${ic('lien')}<input id="f-url" type="url" required placeholder="https://shop.example.com/product/…" autocomplete="off" value="${esc(D.pieces.page ? D.pieces.page.adresse : '')}"><button class="btn noir petit" type="submit" ${D.lit ? 'disabled' : ''}>Read the page</button></div>
      <p class="faint">Product data declared by the page (schema.org, Open Graph, specification tables) is copied as is.</p></form>
    ${lit ? `<div class="agent" style="margin:0 22px 18px"><span class="rond"></span><span class="txt">${esc(lit)}</span></div>` : ''}
    ${D.erreurPieces ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreurPieces)}</span></div>` : ''}
  </div>
  <div class="exemples"><span class="eyebrow">Examples</span>${EXEMPLES.map((x, i) => `<button class="chip" data-exemple="${i}">${x.image ? `<img src="${x.image}" alt="">` : ''}${esc(x.libelle)}</button>`).join('')}</div>`;
}

function piecesJointes(p) {
  const photo = p.photo ? `<div class="piece"><img class="piece-img" src="${esc(p.photo.apercu)}" alt="Attached photo"><div><span class="eyebrow">Photo · ${esc(p.photo.nom)}</span>
      ${p.photo.lue ? `<b>${pluriel(p.photo.lignes.length, 'line read', 'lines read')}</b>, copied into the datasheet. Check and correct them before classifying.${p.photo.illisible.length ? `<ul>${p.photo.illisible.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` : '<span class="muted">Attached to the file, not transcribed.</span>'}</div></div>` : '';
  const page = p.page ? `<div class="piece">${p.page.image ? `<img class="piece-img" src="${esc(p.page.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : `<span class="piece-img vide-img">${ic('lien')}</span>`}<div><span class="eyebrow">Page · ${esc(p.page.domaine)}</span><b>${esc(p.page.titre)}</b>
      <span class="muted">${p.page.schema_produit ? 'Structured product data found' : 'No structured product data: title and description from the page tags'} · ${pluriel(p.page.caracteristiques.length, 'characteristic', 'characteristics')}${p.page.marque ? ' · ' + esc(p.page.marque) : ''}</span>
      <a href="${esc(p.page.adresse)}" target="_blank" rel="noopener noreferrer">Open the page ${ic('lien')}</a></div></div>` : '';
  return photo || page ? `${photo}${page}` : `<div class="piece vide-piece">${ic('dossier')}<span>No document attached. A description alone is enough for a first assessment; a datasheet lets each characteristic be cited.</span></div>`;
}

export function piecesHtml(D, ia) {
  const p = D.pieces;
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Classify a product</h1><p>A photo, a label, a pictogram, a product page URL or a few lines. Each characteristic kept cites the passage it comes from; a person settles any contradiction.</p></div></div>
    ${zoneDepot(D, ia)}
    <div class="grille-fiche">
      <form class="carte fiche-produit" data-form="fiche" autocomplete="off">
        <div class="carte-tete"><h2>Product record</h2><span class="muted">to check before classifying</span></div>
        <div class="carte-corps">
          <div class="champs2"><div class="champ"><label for="f-sku">SKU</label><input class="saisie mono" id="f-sku" data-champ="sku" maxlength="48" value="${esc(p.sku)}" placeholder="e.g. DOCK-PRO"></div>
            <div class="champ"><label for="f-gtin">GTIN <span class="faint">optional</span></label><input class="saisie mono" id="f-gtin" data-champ="gtin" maxlength="20" value="${esc(p.gtin)}"></div></div>
          <div class="champ"><label for="f-desc">Customs description</label><textarea class="saisie" id="f-desc" data-champ="desc" required maxlength="1800" placeholder="e.g. USB-C docking station for laptop">${esc(p.desc)}</textarea></div>
          <div class="champ"><label for="f-ds">Datasheet or label <span class="faint">optional</span></label><textarea class="saisie" id="f-ds" data-champ="ds" maxlength="12000" rows="5" placeholder="Connectors, functions, power supply, material…">${esc(p.ds)}</textarea></div>
          <div class="champs2"><div class="champ"><label for="f-dest">Destination</label>${choix('f-dest', p.dest)}</div><div class="champ"><label for="f-origin">Country of origin</label>${choix('f-origin', p.origin)}</div></div>
          <details class="plus"><summary>Dimensions and weight <span class="faint">optional</span></summary><div class="champs4">${[['l', 'L cm'], ['w', 'W cm'], ['h', 'H cm'], ['kg', 'kg']].map(([k, ph]) => `<input class="saisie" type="number" min="0" step="any" data-champ="${k}" placeholder="${ph}" value="${esc(p[k])}">`).join('')}</div></details>
          <p class="faint" style="font-size:12.5px;margin-top:12px">The origin stays on the record: classification does not use it, duties and country rules do.</p>
          <div style="margin-top:18px"><button class="btn noir" type="submit" style="height:42px;padding:0 22px" ${D.lit ? 'disabled' : ''}>${ic('agent')}Classify this product</button></div>
        </div>
      </form>
      <div class="carte"><div class="carte-tete"><h2>Attached documents</h2></div><div class="carte-corps pieces-jointes">${piecesJointes(p)}</div></div>
    </div>
  </div>`;
}
