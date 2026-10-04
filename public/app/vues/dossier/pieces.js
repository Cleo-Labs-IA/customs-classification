// Premier temps du dossier : les pièces. Une zone de dépôt (photo, étiquette,
// pictogramme), l'adresse d'une fiche produit, ou un texte ; puis la fiche à relire.
import { esc, ic, PAYS, drapeau, pluriel } from '../../ui.js';

const DS_DOCK = 'Ports: 2 x USB-A 3.2 Gen 1 (5 Gbps data), 1 x USB-C data, 1 x HDMI 2.0 (4K 60 Hz video output), 1 x RJ45 Gigabit Ethernet. Power delivery pass-through up to 100 W to the host laptop. Aluminium housing. Net weight 310 g. Input 20 V.';
export const EXEMPLES = [
  { libelle: 'Station USB-C, description seule', sku: 'DOCK-PRO', desc: 'USB-C docking station for laptop', dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'Station USB-C avec fiche technique', sku: 'DOCK-PRO-DS', desc: 'USB-C docking station for laptop', ds: DS_DOCK, dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'Catalogue et fiche qui se contredisent', sku: 'DOCK-STAND', desc: 'USB-C charging stand for laptop, power only, no data ports, no network, no video output', ds: DS_DOCK, dest: 'FR', origin: 'CN', image: '/data/produits/dock-pro.svg' },
  { libelle: 'Chien robot', sku: 'ROBO-DOG', desc: 'Interactive robot dog toy, battery powered, barks and moves on motorized base', dest: 'US', origin: 'CN', image: '/data/produits/robo-dog.svg' },
  { libelle: 'Horloge à construire', sku: 'CLOCK-BRICK', desc: 'Buildable wall clock for kids, battery powered', dest: 'US', origin: 'CN', kg: '0.4', image: '/data/produits/clock-brick.svg' },
  { libelle: 'Jouet parlant', sku: 'TOY-FARM-01', desc: "Fisher-Price See 'n Say The Farmer Says talking animal sounds toy", dest: 'US', origin: 'CN' },
];
const PAYS_FICHE = ['FR', 'DE', 'ES', 'IT', 'NL', 'GB', 'US', 'CA', 'JP', 'AU', 'CH', 'KR', 'CN', 'VN', 'IN', 'MX'];

const choix = (id, valeur) => `<label class="choix-pays">${drapeau(valeur)}<select class="saisie" id="${id}" data-champ="${id === 'f-dest' ? 'dest' : 'origin'}">${PAYS_FICHE.map((c) => `<option value="${c}" ${c === valeur ? 'selected' : ''}>${esc(PAYS[c])}</option>`).join('')}</select></label>`;

function zoneDepot(D, ia) {
  const lit = D.lit === 'photo' ? 'Lecture de la photo : transcription ligne par ligne de ce qui est imprimé' : D.lit === 'url' ? 'Lecture de la page : données produit, caractéristiques, texte visible' : '';
  return `<div class="carte depot-produit" id="depot-produit">
    <div class="depot-cible" data-choisir>
      <div class="depot-icones"><span>${ic('fichier')}</span><span>${ic('bouclier')}</span><span>${ic('lien')}</span></div>
      <h3>Déposez une photo du produit, de son étiquette ou d'un pictogramme</h3>
      <p>JPEG, PNG ou HEIC. ${ia ? 'Le texte imprimé est transcrit ; ce qui ne se lit pas avec certitude est signalé.' : 'Lecture par IA indisponible sur ce serveur : la photo est jointe, la description se saisit à la main.'}</p>
      <button class="btn blanc" type="button">${ic('import')}Choisir une image</button>
      <input type="file" id="f-photo" accept="image/*,.heic,.heif" class="sr">
    </div>
    <div class="depot-ou"><span>ou</span></div>
    <form class="depot-url" data-form="url"><label for="f-url" class="eyebrow">Adresse d'une fiche produit</label>
      <div class="url-ligne">${ic('lien')}<input id="f-url" type="url" required placeholder="https://boutique.exemple.com/produit/…" autocomplete="off" value="${esc(D.pieces.page ? D.pieces.page.adresse : '')}"><button class="btn noir petit" type="submit" ${D.lit ? 'disabled' : ''}>Lire la page</button></div>
      <p class="faint">Les données produit déclarées par la page (schema.org, Open Graph, tableaux de caractéristiques) sont recopiées telles quelles.</p></form>
    ${lit ? `<div class="agent" style="margin:0 22px 18px"><span class="rond"></span><span class="txt">${esc(lit)}</span></div>` : ''}
    ${D.erreurPieces ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreurPieces)}</span></div>` : ''}
  </div>
  <div class="exemples"><span class="eyebrow">Exemples</span>${EXEMPLES.map((x, i) => `<button class="chip" data-exemple="${i}">${x.image ? `<img src="${x.image}" alt="">` : ''}${esc(x.libelle)}</button>`).join('')}</div>`;
}

function piecesJointes(p) {
  const photo = p.photo ? `<div class="piece"><img class="piece-img" src="${esc(p.photo.apercu)}" alt="Photo jointe"><div><span class="eyebrow">Photo · ${esc(p.photo.nom)}</span>
      ${p.photo.lue ? `<b>${pluriel(p.photo.lignes.length, 'ligne lue', 'lignes lues')}</b>, recopiées dans la fiche technique. Relisez et corrigez avant de classer.${p.photo.illisible.length ? `<ul>${p.photo.illisible.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` : '<span class="muted">Jointe au dossier, non transcrite.</span>'}</div></div>` : '';
  const page = p.page ? `<div class="piece">${p.page.image ? `<img class="piece-img" src="${esc(p.page.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : `<span class="piece-img vide-img">${ic('lien')}</span>`}<div><span class="eyebrow">Page · ${esc(p.page.domaine)}</span><b>${esc(p.page.titre)}</b>
      <span class="muted">${p.page.schema_produit ? 'Données produit structurées trouvées' : 'Pas de données produit structurées : titre et description des balises de la page'} · ${pluriel(p.page.caracteristiques.length, 'caractéristique', 'caractéristiques')}${p.page.marque ? ' · ' + esc(p.page.marque) : ''}</span>
      <a href="${esc(p.page.adresse)}" target="_blank" rel="noopener noreferrer">Ouvrir la page ${ic('lien')}</a></div></div>` : '';
  return photo || page ? `${photo}${page}` : `<div class="piece vide-piece">${ic('dossier')}<span>Aucune pièce jointe. Une description seule suffit pour une première évaluation ; une fiche technique permet de citer chaque caractéristique.</span></div>`;
}

export function piecesHtml(D, ia) {
  const p = D.pieces;
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Classer un produit</h1><p>Une photo, une étiquette, un pictogramme, l'adresse d'une fiche produit ou quelques lignes. Chaque caractéristique retenue citera le passage d'où elle vient ; ce qui se contredit est tranché par une personne.</p></div></div>
    ${zoneDepot(D, ia)}
    <div class="grille-fiche">
      <form class="carte fiche-produit" data-form="fiche" autocomplete="off">
        <div class="carte-tete"><h2>Fiche produit</h2><span class="muted">à relire avant de classer</span></div>
        <div class="carte-corps">
          <div class="champs2"><div class="champ"><label for="f-sku">SKU</label><input class="saisie mono" id="f-sku" data-champ="sku" maxlength="48" value="${esc(p.sku)}" placeholder="ex. DOCK-PRO"></div>
            <div class="champ"><label for="f-gtin">GTIN <span class="faint">facultatif</span></label><input class="saisie mono" id="f-gtin" data-champ="gtin" maxlength="20" value="${esc(p.gtin)}"></div></div>
          <div class="champ"><label for="f-desc">Description pour la douane</label><textarea class="saisie" id="f-desc" data-champ="desc" required maxlength="1800" placeholder="ex. USB-C docking station for laptop">${esc(p.desc)}</textarea></div>
          <div class="champ"><label for="f-ds">Fiche technique ou étiquette <span class="faint">facultatif</span></label><textarea class="saisie" id="f-ds" data-champ="ds" maxlength="12000" rows="5" placeholder="Connectique, fonctions, alimentation, matière…">${esc(p.ds)}</textarea></div>
          <div class="champs2"><div class="champ"><label for="f-dest">Destination</label>${choix('f-dest', p.dest)}</div><div class="champ"><label for="f-origin">Pays d'origine</label>${choix('f-origin', p.origin)}</div></div>
          <details class="plus"><summary>Dimensions et poids <span class="faint">facultatif</span></summary><div class="champs4">${[['l', 'L cm'], ['w', 'l cm'], ['h', 'H cm'], ['kg', 'kg']].map(([k, ph]) => `<input class="saisie" type="number" min="0" step="any" data-champ="${k}" placeholder="${ph}" value="${esc(p[k])}">`).join('')}</div></details>
          <p class="faint" style="font-size:12.5px;margin-top:12px">L'origine reste sur la fiche : la classification ne l'utilise pas, les droits et les règles par pays oui.</p>
          <div style="margin-top:18px"><button class="btn noir" type="submit" style="height:42px;padding:0 22px" ${D.lit ? 'disabled' : ''}>${ic('agent')}Classer ce produit</button></div>
        </div>
      </form>
      <div class="carte"><div class="carte-tete"><h2>Pièces jointes</h2></div><div class="carte-corps pieces-jointes">${piecesJointes(p)}</div></div>
    </div>
  </div>`;
}
