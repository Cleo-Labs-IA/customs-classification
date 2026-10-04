// Petits outils d'affichage partagés : échappement, formats, icônes, noms de pays.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const urlSure = (u) => (/^https:\/\//.test(String(u || '')) ? esc(u) : '#');
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nombre = (n) => nf.format(n || 0);
export const argent = (n, devise = 'EUR', precis = false) => (precis ? nf2 : nf).format(n || 0) + ' ' + (devise === 'EUR' ? '€' : devise === 'USD' ? '$' : devise);
export const pluriel = (n, un, plusieurs) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
export function ilYA(iso, maintenant = Date.now()) {
  const s = Math.max(0, Math.round((maintenant - Date.parse(iso)) / 1000));
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
const jourFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const heureFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const jour = (iso) => jourFmt.format(new Date(iso));
export const dateHeure = (iso) => heureFmt.format(new Date(iso));
export function rebours(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}

export const NIVEAU = {
  pret: { court: 'Prête', long: 'Prêtes à partir', ic: 'check' },
  a_verifier: { court: 'À vérifier', long: 'À vérifier', ic: 'alerte' },
  bloque: { court: 'Bloquée', long: 'Bloquées', ic: 'stop' },
  en_attente: { court: 'En cours', long: 'Classification en cours', ic: 'agent' },
};
export const etat = (n, texte) => `<span class="etat ${n}">${esc(texte || NIVEAU[n].court)}</span>`;

export const PAYS = {
  FR: 'France', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', BE: 'Belgique', GB: 'Royaume-Uni', US: 'États-Unis', CA: 'Canada', JP: 'Japon', AU: 'Australie', CH: 'Suisse', KR: 'Corée du Sud',
  CN: 'Chine', VN: 'Vietnam', IN: 'Inde', MX: 'Mexique', BR: 'Brésil', IE: 'Irlande', PT: 'Portugal', AT: 'Autriche', SE: 'Suède', DK: 'Danemark', NO: 'Norvège', FI: 'Finlande', PL: 'Pologne', NZ: 'Nouvelle-Zélande',
  SG: 'Singapour', AE: 'Émirats arabes unis', LU: 'Luxembourg', GR: 'Grèce',
};
export const nomPays = (c) => PAYS[c] || c;
// Drapeaux : icônes du paquet flag-icons (MIT), copiées dans public/data/drapeaux.
const DRAPEAUX = new Set('FR DE ES IT NL BE GB US CA JP AU CH KR CN VN IN MX BR IE PT AT SE DK NO FI PL NZ SG AE LU GR'.split(' '));
export const drapeau = (c, cls = '') => (DRAPEAUX.has(c) ? `<img class="drapeau ${cls}" src="/data/drapeaux/${c.toLowerCase()}.svg" alt="" width="20" height="15" loading="lazy" decoding="async">` : `<span class="iso ${cls}">${esc(c)}</span>`);
export const pays = (c) => `<span class="pays">${drapeau(c)}${esc(nomPays(c))}</span>`;
// Vignette d'un produit : son image si le catalogue en a une, sinon ses initiales.
export const vignette = (p, cls = '') => `<div class="vignette v-${esc(p.teinte || 'gris')} ${cls}">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async">` : esc(String(p.sku || '').slice(0, 3))}</div>`;
export const zones = (z) => z.map((x) => (x === 'UE' ? 'Union européenne' : x === '*' ? 'Toutes destinations' : nomPays(x))).join(', ');

// Icônes au trait (24 × 24, trait 1,6), dessinées pour cette app.
const P = {
  accueil: '<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>',
  commandes: '<path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4z"/><path d="m4 7.5 8 4 8-4M12 11.5v9"/>',
  produits: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9.5h17M9.5 9.5v11"/>',
  questions: '<path d="M4 13.5V6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v7.5"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18z"/>',
  veille: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 18 6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  carte: '<path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  arbre: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7.5v9M6 12h4a4 4 0 0 0 4-4V8m0 4h2"/>',
  dossier: '<path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h5"/>',
  balance: '<path d="M12 3.5v17M7 20.5h10M5 7.5h14"/><path d="m5 7.5-2.5 6a3 3 0 0 0 5 0zM19 7.5l-2.5 6a3 3 0 0 0 5 0z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  droite: '<path d="m9 6 6 6-6 6"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  recherche: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  cloche: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  panneau: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
  immeuble: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h1.5M13.5 7.5H15M9 11h1.5M13.5 11H15M9 14.5h1.5M13.5 14.5H15M10.5 20.5v-2.5h3v2.5"/>',
  import: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15.5v2a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alerte: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  stop: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  agent: '<path d="M12 3.5 13.8 9l5.7 1.5-5.7 1.5L12 17.5 10.2 12 4.5 10.5 10.2 9z"/><path d="M18.5 16.5 19.3 19l2.2.8-2.2.7-.8 2.5-.8-2.5-2.2-.7 2.2-.8z"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lien: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V9.5A2.5 2.5 0 0 1 6 7h4"/>',
  camion: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  filtre: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  tri: '<path d="M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5"/>',
  eclair: '<path d="M13 3 5 13.5h6l-1 7.5 8-10.5h-6z"/>',
  bouclier: '<path d="M12 3.5 5 6v6c0 4 3 7.2 7 8.5 4-1.3 7-4.5 7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
  lecture: '<path d="M8 5.5v13l10-6.5z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  fichier: '<path d="M13.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5z"/><path d="M13.5 3.5v6h6"/>',
  euro: '<path d="M17.5 6.5A6.5 6.5 0 1 0 17.5 17.5M4.5 10.5h9M4.5 13.5h9"/>',
  annuler: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
};
export const ic = (nom, cls = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${P[nom] || ''}</svg>`;

// Notifications éphémères.
export function toast({ titre, texte = '', niveau = '', icone = 'info', duree = 5200 }) {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="ic ${niveau}">${ic(icone)}</div><div><b>${esc(titre)}</b><span>${esc(texte)}</span></div>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('sort'); setTimeout(() => el.remove(), 320); }, duree);
}
