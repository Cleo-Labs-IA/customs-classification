// Obligations, droits et coût à l'arrivée pour une route (origine → destination).
//
// Chemin retenu d'après la mesure du 4 octobre 2026 (essais/modules/obligations-mesure.md) :
// - avec un code SH6 déjà connu : les points d'accès séparés de la Cleo Legal API
//   (GET /v2/customs/obligations, GET /v2/customs/duties, POST /v2/customs/landed-cost,
//   GET /v2/catalog/regulations-by-hs) ;
// - sans code : POST /v2/compliance/check ; tant que l'API ne dit pas la classification
//   « classified » et non provisoire, tout ce qu'elle calcule est écarté et compté.
//
// Ce que le module garantit, et ce qu'il ne garantit pas :
// - Chaque texte rendu est la copie d'un champ de la réponse de l'API, après contrôle de
//   forme (type, longueur, absence de balisage). Ce contrôle ne dit PAS que le texte est
//   juste : un intitulé d'obligation faux mais bien formé passe. C'est pourquoi une
//   obligation n'est jamais « sourcée » sur la seule parole de l'API.
// - sourcee:true veut dire une seule chose : le document officiel donné en adresse a été
//   téléchargé et la référence de l'obligation y a été retrouvée mot pour mot avec
//   locate(). Le passage retrouvé est rendu dans citation_source. Dans tous les autres
//   cas, sourcee vaut false et la raison est comptée dans manquants.
// - Une valeur absente reste inconnue (null), jamais « faux » ni zéro.
// - Les textes du catalogue Cleo ne sont pas des obligations : ils sortent à part
//   (textes_catalogue), seulement si l'API rattache le code à un type de produit précis.
// - Aucun score de confiance n'est rendu. Le taux de base n'est jamais un coût complet.
// - Les phrases de manquants ne reprennent une valeur de l'API ou de l'appelant qu'après
//   validation stricte (chiffres, date, jeton) ; l'écran doit malgré tout les afficher
//   comme du texte, pas comme du HTML.
import crypto from 'node:crypto';
import { KEY, API, locate } from '../app.mjs';

const BUDGET_MS = 95_000; // sous les 100 s demandés, marge pour la normalisation
const UE = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '));

// --- contrôles de forme -----------------------------------------------------

const arr = (x) => (Array.isArray(x) ? x : []);
const objet = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : null);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const montant = (x) => (num(x) !== null && x >= 0 ? x : null); // un montant négatif n'est pas un montant
const taux = (x) => (num(x) !== null && x >= 0 && x <= 1000 ? x : null); // en pourcentage
const entier = (x) => (Number.isInteger(x) && x >= 0 ? x : null);
const fr = (x) => String(x); // nombre rendu avec un point décimal
const pct = (x) => fr(x) + '%';
const pays = (x) => (typeof x === 'string' && /^[A-Za-z]{2}$/.test(x.trim()) ? x.trim().toUpperCase() : null);
// Identifiant sans espace ni ponctuation libre (statut, nom de source, clé).
const jeton = (x) => (typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(x) ? x : null);
const chiffres = (x) => (typeof x === 'string' && /^\d{2,12}$/.test(x) ? x : null);
function jour(x) {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
  const d = new Date(x + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x ? x : null;
}
// Texte libre copié d'un champ : une chaîne, d'une longueur plausible, sans balisage ni
// caractère de contrôle. Rend la chaîne telle quelle (espaces de bord retirés) ou null.
function texte(x, { min = 1, max = 300 } = {}) {
  if (typeof x !== 'string') return null;
  const s = x.trim();
  return s.length >= min && s.length <= max && !/[<>\u0000-\u001f\u007f]/.test(s) ? s : null;
}
// Segments d'un texte de l'API de part et d'autre d'un tiret cadratin : chaque segment
// est une copie mot pour mot, et le tiret lui-même n'est pas rendu.
const segments = (s) => (s ? s.split('—').map((p) => p.trim()).filter(Boolean) : []);
const sansCadratin = (s) => (s && !s.includes('—') ? s : null);
// Adresse https bien formée, sans identifiants, vers un nom de domaine (pas une adresse IP).
function adresse(x) {
  if (typeof x !== 'string') return null;
  const s = x.trim();
  if (!s || s.length > 500 || /[\s<>"'`\\\u0000-\u001f]/.test(s)) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)) return null;
  return s;
}
// Domaines tenus pour officiels par ce module : institutions de l'UE, État français,
// État britannique, administrations fédérales des États-Unis. Liste volontairement courte.
function officielle(url) {
  try { return /(^|\.)(europa\.eu|gouv\.fr|gov\.uk|gov)$/i.test(new URL(url).hostname); } catch { return false; }
}

const FORME = 'the API responded without the expected content';

// Raison pour laquelle un appel n'est pas lisible, ou null.
function raisonEchec(rec) {
  if (!rec) return 'the call was not made';
  if (typeof rec.echec === 'string') return rec.echec;
  if (rec.http === 200) {
    const b = objet(rec.body);
    if (!b) return 'the API responded without readable content';
    if (b.error !== undefined && b.data === undefined && b.regulations === undefined) {
      const code = jeton(b.error) || jeton(objet(b.error)?.code);
      return `the API responded with an error${code ? ` ("${code}")` : ''}`;
    }
    return null;
  }
  if (rec.http == null) {
    return /timeout|abort/i.test(String(rec.error || ''))
      ? `timed out after ${num(rec.seconds) ?? '?'} s`
      : 'the API did not respond (network error or unreadable response)';
  }
  return `the API responded with ${entier(rec.http) ? `HTTP ${rec.http}` : 'an unexpected status code'}`;
}
const nonRenseigne = (body) => Array.isArray(body?.data) && body.coverage_status === 'not_seeded';

// --- obligations ------------------------------------------------------------

// Adresses de documents officiels données par l'API pour ses obligations : ce sont les
// seules que le module télécharge pour y chercher la référence de l'obligation.
export function adressesSources(body) {
  const d = objet(objet(body)?.data) || {}, out = new Set();
  for (const o of [...arr(d.legally_required), ...arr(d.contractually_expected)]) {
    const u = adresse(objet(o)?.url);
    if (u && officielle(u)) out.add(u);
  }
  return [...out].slice(0, 6);
}

// recObligations : réponse de GET /v2/customs/obligations ; recCatalogue : réponse de
// GET /v2/catalog/regulations-by-hs (optionnelle). textes : { adresse: texte officiel
// téléchargé }. codeEtabli : true si l'API connaît ce code (obligation ou tarif).
export function normaliserObligations(recObligations, recCatalogue, { hs6 = null, destination = null, codeEtabli = null, textes = {} } = {}) {
  const obligations = [], textes_catalogue = [], manquants = [], etapes_en_echec = [];
  let rejetes = 0, adressesEcartees = 0, catalogue_ecartes = 0;
  let etabli = codeEtabli;

  const e1 = raisonEchec(recObligations);
  const d = e1 ? null : objet(recObligations.body.data);
  if (e1) {
    etapes_en_echec.push({ etape: 'obligations', raison: e1 });
    manquants.push(`The obligations could not be read: ${e1}.`);
  } else if (nonRenseigne(recObligations.body)) {
    if (etabli === null) etabli = false;
    manquants.push('No obligation is recorded in the API for this code and this country.');
  } else if (!d || (!Array.isArray(d.legally_required) && !Array.isArray(d.contractually_expected))) {
    etapes_en_echec.push({ etape: 'obligations', raison: FORME });
    manquants.push(`The obligations could not be read: ${FORME}.`);
  } else {
    if (etabli === null) etabli = true;
    const listes = [['exigee_par_la_loi', arr(d.legally_required)], ['attendue_par_contrat', arr(d.contractually_expected)]];
    if (!listes[0][1].length && !listes[1][1].length) manquants.push('The API returns no obligation for this code and this country (empty lists): this does not establish that there is none.');
    for (const [categorie, liste] of listes) {
      for (const brut of liste) {
        const o = objet(brut);
        const [titre, ...complements] = segments(texte(o?.title, { min: 4, max: 200 }));
        if (!titre || titre.length < 4) { rejetes++; continue; }
        const reference = sansCadratin(texte(o.regulation, { min: 4, max: 200 }));
        const source_url = adresse(o.url);
        if (o.url != null && !source_url) adressesEcartees++;
        // Seul contrôle qui ne tourne pas en rond : la référence (à défaut l'intitulé) doit se
        // retrouver mot pour mot dans le texte officiel téléchargé à l'adresse donnée.
        const cherche = reference || titre;
        const citation_source = source_url && officielle(source_url) && cherche.length >= 6 ? locate(textes[source_url], cherche) : null;
        const origine = o.inferred === true ? 'deduite_par_un_modele' : o.inferred === false ? 'lue_par_l_api' : 'non_precisee';
        obligations.push({
          titre,
          complements,
          // L'API ne nomme pas d'autorité pour ces obligations (son champ "source" est une
          // catégorie comme "national", pas un organisme) : on ne la devine pas.
          autorite: null,
          source_url,
          document_id: jeton(o.regulation_doc_id),
          sourcee: Boolean(citation_source) && origine === 'lue_par_l_api',
          citation_source,
          nature: jeton(o.type) || 'not specified',
          reference,
          categorie,
          obligatoire: typeof o.mandatory === 'boolean' ? o.mandatory : null, // null : l'API ne le dit pas
          origine,
        });
      }
    }
  }

  const e2 = raisonEchec(recCatalogue);
  const cat = recCatalogue && !e2 ? recCatalogue.body : null;
  if (recCatalogue && (e2 || !Array.isArray(cat.regulations))) {
    etapes_en_echec.push({ etape: 'catalogue_reglementaire', raison: e2 || FORME });
    manquants.push(`The regulatory catalogue could not be read: ${e2 || FORME}.`);
  } else if (cat && !cat.regulations.length) {
    manquants.push('The Cleo catalogue holds no text for this code and this country.');
  } else if (cat) {
    // Le catalogue rattache un code à une famille de produits, puis rend tous les textes de
    // la famille. Sans type de produit précis, ou si l'API ne connaît pas le code, ces
    // textes n'ont pas de lien établi avec le produit : ils sont écartés et comptés.
    const n = cat.regulations.length;
    const motif = etabli !== true ? 'the API has neither an obligation nor a readable tariff for this code, so its existence is not established'
      : (hs6 && cat.hs6 !== hs6) || (destination && cat.market !== destination) ? 'the catalogue response covers a different code or country from the ones requested'
        : !jeton(cat.sous_type) ? 'the catalogue links this code only to a broad product family, not to a specific product type'
          : null;
    if (motif) {
      catalogue_ecartes = n;
      manquants.push(`${n} Cleo catalogue text(s) set aside: ${motif}.`);
    } else {
      for (const brut of cat.regulations) {
        const r = objet(brut);
        const [titre, ...complements] = segments(texte(r?.full_name, { min: 4, max: 400 }) || texte(r?.name, { min: 4, max: 400 }));
        if (!titre || titre.length < 4) { catalogue_ecartes++; continue; }
        const [autorite = null, ...autorite_complements] = segments(texte(r.authority, { min: 2, max: 200 }));
        textes_catalogue.push({
          titre, complements, autorite, autorite_complements,
          domaine_autorite: typeof r.authority_domain === 'string' && /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(r.authority_domain) ? r.authority_domain : null,
          type_de_produit: cat.sous_type,
          // Le catalogue donne le domaine de l'autorité, pas l'adresse du texte, et ne dit pas
          // si le texte s'applique à ce produit.
          source_url: null, sourcee: false, applicabilite_etablie: false,
        });
      }
      if (catalogue_ecartes) manquants.push(`${catalogue_ecartes} Cleo catalogue text(s) set aside: empty entry or unreadable title.`);
      if (textes_catalogue.length) manquants.push(`${textes_catalogue.length} Cleo catalogue text(s) are listed separately for this product type: whether they apply to this product is not established, and no link to the official text is provided.`);
    }
  }

  const sans = obligations.filter((o) => !o.sourcee);
  if (sans.length) {
    const deduites = sans.filter((o) => o.origine === 'deduite_par_un_modele').length, floues = sans.filter((o) => o.origine === 'non_precisee').length;
    const detail = [deduites ? `${deduites} inferred by a model according to the API` : null, floues ? `${floues} for which the API does not say how they were established` : null].filter(Boolean).join(', ');
    manquants.push(`${sans.length} of ${obligations.length} obligation(s) have no official source text checked${detail ? ` (${detail})` : ''}: they remain to be verified against the official text.`);
  }
  const indecises = obligations.filter((o) => o.obligatoire === null).length;
  if (indecises) manquants.push(`For ${indecises} obligation(s), the API does not say whether they are mandatory.`);
  if (adressesEcartees) manquants.push(`${adressesEcartees} source URL(s) set aside: they are not readable https URLs.`);
  if (rejetes) manquants.push(`${rejetes} obligation(s) set aside: empty entry, or title missing, too short or containing markup.`);
  return { obligations, textes_catalogue, manquants, etapes_en_echec, rejetes, catalogue_ecartes, code_etabli: etabli };
}

// --- droits -----------------------------------------------------------------

// rec : réponse de GET /v2/customs/duties (ou le bloc decision.duties enrobé).
// aujourdhui : date de référence au format AAAA-MM-JJ quand aucune date n'est demandée.
export function normaliserDroits(rec, { code = null, destination = null, date = null, aujourdhui = new Date().toISOString().slice(0, 10) } = {}) {
  const manquants = [], etapes_en_echec = [];
  const rien = (phrase) => { if (phrase) manquants.push(phrase); return { droits: null, manquants, etapes_en_echec }; };
  const echec = (raison) => { etapes_en_echec.push({ etape: 'droits', raison }); return rien(`The duty rate could not be read: ${raison}.`); };
  const e = raisonEchec(rec);
  if (e) return echec(e);
  const hs = chiffres(code), dest = pays(destination);
  const cible = `${hs ? `code ${hs}` : 'this code'} to ${dest || 'this country'}`;
  if (nonRenseigne(rec.body)) return rien(`No duty rate is recorded in the API for ${cible}.`);
  const d = objet(rec.body.data);
  if (!d) return echec(FORME);
  if (d.status === 'not_seeded') return rien(`No duty rate is recorded in the API for ${cible}.`);

  const r = objet(d.resolution) || {};
  // La ligne rendue doit relever du code demandé et du tarif de la destination.
  const ligne = chiffres(d.code), demande = chiffres(r.queried_code);
  if (hs && (!ligne || !ligne.startsWith(hs.slice(0, 6)) || (r.queried_code != null && demande !== hs))) {
    return rien('The tariff line returned by the API does not fall under the requested code: its rate is set aside.');
  }
  const tarif = pays(r.resolved_country) || pays(d.country);
  if (dest && (tarif !== dest && !(tarif === 'EU' && UE.has(dest)) || (r.queried_country != null && pays(r.queried_country) !== dest))) {
    return rien('The tariff returned by the API is not that of the requested destination country: its rate is set aside.');
  }
  // Validité dans le temps, à la date demandée ou à défaut aujourd'hui.
  const voulue = jour(date), ref = voulue || jour(aujourdhui);
  const debut = jour(d.effective_from), fin = jour(d.effective_to);
  if (d.effective_to != null && !fin) return rien('The end-of-validity date of the rate returned by the API is unreadable: the rate is set aside.');
  if (fin && ref && fin < ref) return rien(`The rate recorded in the API ceased to be in force on ${fin}: it is not returned.`);
  if (debut && ref && debut > ref) return rien(`The rate recorded in the API only enters into force on ${debut}: it is not returned for ${ref}.`);

  const plage = r.matched === 'hs6_range';
  const min = taux(plage ? r.duty_pct_min : d.duty_pct), max = taux(plage ? r.duty_pct_max : d.duty_pct);
  const specifique = sansCadratin(texte(d.duty_specific, { max: 120 }));
  const lisible = min !== null && max !== null && min <= max;
  if (!lisible && !specifique) return rien(`The API has a tariff line for ${cible} but no readable rate (rate missing, negative or inconsistent).`);
  const unique = lisible && min === max ? min : null;
  const lignes = plage ? entier(r.line_count) : 1;
  const combien = lignes > 1 ? `${lignes} national lines` : 'several national lines (count not readable)';
  const sous = hs ? `code ${hs}` : 'this code';

  if (plage && lisible && lignes !== 1) {
    manquants.push(unique !== null
      ? `The base rate is the same (${pct(unique)}) across ${combien} under ${sous}; the exact tariff line for the product is not determined.`
      : `The base rate ranges from ${pct(min)} to ${pct(max)} depending on the national line (${combien} under ${sous}); without the exact tariff line for the product, the applicable rate is not known.`);
  }
  const source = jeton(d.source), source_url = adresse(d.source_url), niveau_source = jeton(d.source_tier);
  if (niveau_source === 'mirror') manquants.push(`The base rate comes from a mirror source (${source || 'unnamed'}), not directly from the official source of the destination country.`);
  if (!source_url) manquants.push('The base rate is returned without a readable source URL.');
  if (d.anti_dumping_pct == null && d.special_duty_basis == null) manquants.push('Additional duties (anti-dumping, countervailing, safeguard, measures targeting a country of origin) are not provided by the API for this line: their absence is not established.');
  if (date != null && !voulue) manquants.push('The date provided is not readable (YYYY-MM-DD format expected): it is ignored.');
  if (voulue) manquants.push(`Lookup by code does not offer a rate at a given date: the rate returned is the one recorded today${debut ? `, in force since ${debut}` : ', with no readable start date'}; it is not established that it applied on ${voulue}.`);

  return {
    droits: {
      taux: unique, // en pourcentage ; null si le taux diffère selon la ligne nationale
      taux_min: lisible ? min : null, taux_max: lisible ? max : null, unite: '%',
      taux_specifique: specifique,
      nature: 'base rate, excluding VAT, taxes and additional duties: this is not a full cost',
      base_legale: source,
      source_url,
      version: [source, debut ? `in force since ${debut}` : null].filter(Boolean).join(', ') || null,
      niveau_source,
      pays_du_tarif: tarif,
      lignes_lues: lignes,
      // Une plage réduite à une seule ligne nationale désigne cette ligne.
      ligne_exacte_connue: !plage || lignes === 1,
    },
    manquants, etapes_en_echec,
  };
}

// --- coût -------------------------------------------------------------------

const LIBELLES = {
  duty: 'customs duty', duty_schedule_not_seeded: 'customs duty', duty_not_determinable_at_hs6: 'customs duty',
  vat: 'VAT', import_taxes: 'import taxes', import_taxes_unpriced: 'import taxes',
  excise: 'excise duties', anti_dumping: 'anti-dumping duties', preferential_rate: 'preferential rate',
  cvd: 'countervailing duties', safeguard: 'safeguard measures', clearance_fee: 'customs clearance fees',
};
const POURQUOI = {
  duty_schedule_not_seeded: 'no tariff is recorded in the API for this code',
  duty_not_determinable_at_hs6: 'the rate differs by national line and the exact tariff line for the product is unknown',
  preferential_rate: 'the API has not checked whether a preferential agreement applies',
};
const TAXES = { VAT: 'VAT' };
// Montants que l'API additionne dans son total sans les lister parmi les taxes.
const AUTRES = {
  excise_usd: 'excise duties', anti_dumping_usd: 'anti-dumping duties', cvd_usd: 'countervailing duties',
  safeguard_usd: 'safeguard measures', clearance_fee_usd: 'customs clearance fees', clearance_fee_fixed_usd: 'fixed customs clearance fees',
};

// rec : réponse de POST /v2/customs/landed-cost (ou le bloc decision.landed_cost enrobé).
export function normaliserCout(rec, { code = null, destination = null } = {}) {
  const manquants = [], etapes_en_echec = [];
  const rien = (phrase) => { manquants.push(phrase); return { cout: null, manquants, etapes_en_echec }; };
  const echec = (raison) => { etapes_en_echec.push({ etape: 'cout', raison }); return rien(`The landed cost could not be calculated: ${raison}.`); };
  const e = raisonEchec(rec);
  if (e) return echec(e);
  const hs = chiffres(code), dest = pays(destination);
  const cible = `${hs ? `code ${hs}` : 'this code'} to ${dest || 'this country'}`;
  if (nonRenseigne(rec.body)) return rien(`The API has neither a tariff nor taxes recorded for ${cible}: no cost is calculated.`);
  const d = objet(rec.body.data), b = objet(d?.breakdown);
  if (!b) return echec(FORME);
  const r = objet(d.resolution) || {};
  if (r.matched === 'none') return rien(`The API has no tariff line for ${cible}: no cost is calculated.`);
  const ligne = chiffres(d.code);
  if ((hs && (!ligne || !ligne.startsWith(hs.slice(0, 6)))) || (dest && pays(d.destination) !== dest)) {
    return rien('The cost returned by the API covers a different code or destination from the ones requested: it is set aside.');
  }

  const inp = objet(d.input) || {};
  const fob = montant(inp.fob_usd), transport = (montant(inp.freight_usd) || 0) + (montant(inp.insurance_usd) || 0);
  const absents = [...new Set([...arr(objet(d.data_completeness)?.components_missing), ...arr(d.total_excludes)].filter((c) => typeof c === 'string'))];
  const composantes = [], liees_au_droit = [];
  let illisibles = 0;
  const inconnue = (nom, pourquoi) => {
    if (!composantes.some((c) => c.nom === nom)) composantes.push({ nom, montant: null, connu: false });
    manquants.push(`Unknown component: ${nom} (${pourquoi}).`);
  };

  composantes.push({ nom: 'goods value', montant: fob, connu: fob !== null });

  // Fret et assurance : la fonction ne les reçoit pas ; l'API compte alors 0, ce qui n'est pas une valeur connue.
  if (transport > 0) composantes.push({ nom: 'freight and insurance', montant: transport, connu: true });
  else inconnue('freight and insurance', 'not provided: the calculation starts from the goods value alone');

  // Droit de douane : connu seulement si l'API ne le range pas dans ce qui manque. Quand
  // elle le dit indéterminé, le montant qu'elle additionne quand même n'est pas repris.
  const cleDroit = absents.map((c) => c.split(':')[0]).find((c) => LIBELLES[c] === 'customs duty');
  const droit = montant(b.duty_usd), droitConnu = !cleDroit && droit !== null;
  if (droitConnu) composantes.push({ nom: 'customs duty', montant: droit, connu: true, taux_pct: taux(b.applied_duty_pct) });
  else inconnue('customs duty', POURQUOI[cleDroit] || (num(b.duty_usd) !== null ? 'negative amount returned by the API, set aside' : 'not provided in the API for this code and this country'));

  // Taxes à l'importation : une ligne par taxe rendue par l'API, avec sa source. Une taxe
  // dont la base inclut un droit inconnu est elle-même inconnue.
  for (const brut of arr(d.taxes)) {
    const t = objet(brut);
    const libelle = sansCadratin(texte(t?.label, { max: 120 })), codeTaxe = jeton(t?.tax_code), nom = TAXES[codeTaxe] || libelle || codeTaxe;
    if (!nom) { illisibles++; continue; }
    const m = num(t.amount_usd), base = jeton(t.basis);
    const surDroit = !droitConnu && !(base && !/duty/i.test(base));
    const connu = m !== null && m >= 0 && !surDroit;
    composantes.push({ nom, libelle_api: libelle, montant: connu ? m : null, connu, taux_pct: taux(t.rate_pct), source_url: adresse(t.source_url) });
    if (connu) continue;
    if (surDroit) liees_au_droit.push(nom);
    manquants.push(`Unknown component: ${nom} (${m !== null && m < 0 ? 'negative amount returned by the API, set aside'
      : surDroit ? 'it is calculated on a base that includes the customs duty, itself unknown'
        : 'the API gives a rate but no amount'}).`);
  }

  for (const c of absents) {
    const cle = c.split(':')[0], nom = LIBELLES[cle] || (jeton(cle) ? `"${cle}" (name returned by the API)` : null);
    if (!nom) { illisibles++; continue; }
    if (nom === 'customs duty') continue;
    if (cle === 'import_taxes_unpriced') continue; // déjà visible taxe par taxe ci-dessus
    if (composantes.some((x) => x.nom === nom)) continue;
    inconnue(nom, POURQUOI[cle] || 'not provided in the API for this code and this country');
  }
  for (const [cle, nom] of Object.entries(AUTRES)) {
    const v = montant(b[cle]);
    if (v > 0 && !composantes.some((x) => x.nom === nom)) composantes.push({ nom, montant: v, connu: true });
  }
  if (illisibles) manquants.push(`${illisibles} tax or component line(s) set aside: empty entry or unreadable name.`);
  if (typeof r.vat_unverified === 'string') manquants.push('The API reports that the VAT recorded for this line is not reliable (rate read from a conditional measure): it is excluded from the calculation.');
  const lignes = entier(r.line_count);
  if (r.matched === 'hs6_range' && lignes !== 1) manquants.push(`The cost is calculated on one national line taken from ${lignes > 1 ? lignes : 'several'} under ${hs ? `code ${hs}` : 'this code'}; the exact tariff line for the product is not determined.`);

  // Total : repris seulement s'il est égal à la somme des composantes connues rendues
  // ci-dessus. Sinon il contient autre chose que ce qui est montré, et il est écarté.
  const totalApi = num(d.total_landed_usd);
  const inconnues = composantes.filter((c) => !c.connu).map((c) => c.nom);
  const somme = fob === null ? null : composantes.filter((c) => c.connu).reduce((s, c) => s + c.montant, 0);
  let total = null, fourchette = null;
  if (totalApi === null) {
    manquants.push('No total is returned: a component is missing without which the API refuses to add up.');
  } else if (!droitConnu) {
    // L'API additionne ici un droit qu'elle dit ne pas pouvoir déterminer : son total n'est
    // pas un total. Elle donne à côté les deux bornes, selon la ligne nationale.
    const dr = objet(d.duty_range) || {}, bas = montant(dr.total_landed_usd_min), haut = montant(dr.total_landed_usd_max);
    const tmin = taux(dr.duty_pct_min), tmax = taux(dr.duty_pct_max);
    if (bas !== null && haut !== null && bas <= haut && fob !== null && bas >= fob) {
      fourchette = { min: bas, max: haut };
      const hors = inconnues.filter((n) => n !== 'customs duty' && !liees_au_droit.includes(n));
      manquants.push(`No single total is returned: the customs duty depends on the national line${tmin !== null && tmax !== null ? ` (from ${pct(tmin)} to ${pct(tmax)})` : ''}. The API gives a range of ${fr(bas)} to ${fr(haut)} USD${hors.length ? `, which does not include: ${hors.join(', ')}` : ''}.`);
    } else {
      manquants.push('No total is returned: the API adds up a customs duty it says it does not know, with no readable range.');
    }
  } else if (totalApi < 0 || somme === null || Math.abs(totalApi - somme) > 0.02) {
    manquants.push('No total is returned: the API total does not match the sum of the known components, it is set aside.');
  } else {
    total = totalApi;
  }
  const partiel = total === null || inconnues.length > 0 || d.total_is_partial !== false;
  if (total !== null && partiel) manquants.push(`The total returned (${fr(total)} USD) is a partial total: it is the sum of the known components${inconnues.length ? `, it does not include ${inconnues.join(', ')}` : ''}.`);

  return { cout: { total, fourchette, devise: 'USD', composantes, partiel, ligne_tarifaire: ligne }, manquants, etapes_en_echec };
}

// --- assemblage -------------------------------------------------------------

const vide = (route, manquants, etapes_en_echec = [], brut = null, secondes = 0) =>
  ({ route, obligations: [], textes_catalogue: [], droits: null, cout: null, manquants, etapes_en_echec, rejetes: 0, catalogue_ecartes: 0, ecartes: 0, chemin: null, brut, secondes });

// Une section qui casse ne doit pas emporter les autres.
function section(etape, quoi, repli, fn) {
  try { return fn(); } catch {
    return { ...repli, manquants: [`${quoi}: the API response could not be interpreted, nothing is returned for this part.`], etapes_en_echec: [{ etape, raison: 'response could not be interpreted' }] };
  }
}

// Assemble les réponses des points d'accès séparés (chemin « code connu »).
// sansCout : raison pour laquelle le coût n'a pas été demandé, quand appels.cout est absent.
export function normaliser({ route, hs6 = null, date = null, appels = {}, textes = {}, sansCout = 'the goods value was not provided', aujourdhui, secondes = 0 }) {
  const dest = pays(route?.destination);
  const d = section('droits', 'Duties', { droits: null }, () => normaliserDroits(appels.droits, { code: hs6, destination: dest, date, ...(aujourdhui ? { aujourdhui } : {}) }));
  const o = section('obligations', 'Obligations', { obligations: [], textes_catalogue: [], rejetes: 0, catalogue_ecartes: 0 },
    () => normaliserObligations(appels.obligations, appels.catalogue, { hs6: chiffres(hs6)?.slice(0, 6) || null, destination: dest, codeEtabli: d.droits ? true : null, textes }));
  const c = appels.cout === undefined
    ? { cout: null, manquants: [`The landed cost is not calculated: ${sansCout}.`], etapes_en_echec: [] }
    : section('cout', 'Cost', { cout: null }, () => normaliserCout(appels.cout, { code: hs6, destination: dest }));
  return {
    route,
    obligations: o.obligations,
    textes_catalogue: o.textes_catalogue,
    droits: d.droits,
    cout: c.cout,
    manquants: [...new Set([...o.manquants, ...d.manquants, ...c.manquants])],
    etapes_en_echec: [...o.etapes_en_echec, ...d.etapes_en_echec, ...c.etapes_en_echec],
    rejetes: o.rejetes,
    catalogue_ecartes: o.catalogue_ecartes,
    ecartes: 0,
    chemin: 'points_d_acces_separes',
    code: chiffres(hs6),
    brut: Object.fromEntries(Object.entries(appels).map(([k, v]) => [k, v ? v.body ?? null : null])),
    secondes,
  };
}

const EXPIRE = ['timeout', 'timed_out'];

// Normalise une réponse de POST /v2/compliance/check (chemin « sans code »).
// La classification n'est tenue pour établie que si tout le dit : étape « ok », statut
// « classified » (le mot que l'API oppose elle-même à « needs_information »), provisional
// à false, aucun code provisoire, et un code à chiffres. Un champ absent ne vaut pas accord.
export function normaliserCheck({ route, rec, textes = {}, secondes = 0 }) {
  const e = raisonEchec(rec);
  const data = e ? null : objet(rec.body.data), dec = objet(data?.decision);
  if (e || !dec) {
    const raison = e || FORME;
    return { ...vide(route, [`The full check did not complete: ${raison}. Nothing is returned.`], [{ etape: 'compliance_check', raison }], rec?.body ?? null, secondes), chemin: 'compliance_check' };
  }
  const steps = objet(dec.steps) || {}, pc = objet(data.product_classification) || {};
  const expirees = arr(data.timed_out_steps).filter((s) => typeof s === 'string');
  const etat = (x) => (expirees.includes(x) || EXPIRE.includes(steps[x]) ? 'expiree' : steps[x] === 'ok' ? 'ok' : jeton(steps[x]) || 'unknown');
  const code = chiffres(objet(pc.primary_code)?.code);
  const abouti = etat('classification') === 'ok';
  const classeOk = abouti && pc.provisional === false && pc.code_source === 'classification' && pc.status === 'classified'
    && dec.provisional_code == null && dec.readiness !== 'blocked' && dec.readiness !== 'needs_information' && code !== null && code.length >= 6;
  if (!classeOk) {
    const ob = objet(dec.obligations) || {};
    const ecartes = arr(ob.legally_required).length + arr(ob.contractually_expected).length + (dec.duties ? 1 : 0) + (dec.landed_cost ? 1 : 0);
    const provisoire = pc.provisional === true;
    return {
      ...vide(route, [
        abouti
          ? `The classification returned by the API is not established (status "${jeton(pc.status) || 'not specified'}"${provisoire ? ', provisional code' : ''}): without an established tariff code, neither the obligations, nor the duties, nor the cost can be returned.`
          : `The classification did not complete on the API side (${etat('classification') === 'expiree' ? 'timed out' : `step "${etat('classification')}"`}): without an established tariff code, neither the obligations, nor the duties, nor the cost can be returned.`,
        ...(ecartes ? [`${ecartes} item(s) calculated by the API on a code that is not established${code ? ` (${code})` : ''} were set aside.`] : []),
        'To get a result, provide a six-digit HS code that is already established.',
      ], [{ etape: 'classification', raison: etat('classification') === 'expiree' ? 'timed out on the API side' : !abouti ? `step ${etat('classification')}` : provisoire ? 'provisional classification' : 'classification not established' }], rec.body, secondes),
      ecartes, chemin: 'compliance_check', code: null, code_provisoire_ecarte: code,
    };
  }
  // Une étape expirée, en échec ou absente de la réponse est un échec de lecture, pas une
  // absence de données dans l'API.
  const bloc = (nom, valeur) => {
    const s = etat(nom);
    if (s === 'expiree') return { echec: 'timed out on the API side' };
    if (s !== 'ok') return { echec: `step "${s}" on the API side` };
    if (!objet(valeur)) return { echec: 'step reported "ok" but missing from the API response' };
    return { http: 200, body: { data: valeur } };
  };
  const sansValeur = steps.landed_cost === 'not_requested' || steps.landed_cost === 'skipped';
  const out = normaliser({
    route, hs6: code, date: null, secondes, textes,
    sansCout: 'the API did not calculate it, for lack of a goods value or a country of origin sent',
    appels: { obligations: bloc('obligations', dec.obligations), droits: bloc('duties', dec.duties), ...(sansValeur && !dec.landed_cost ? {} : { cout: bloc('landed_cost', dec.landed_cost) }) },
  });
  for (const nom of new Set([...Object.keys(steps), ...expirees])) {
    if (['classification', 'obligations', 'duties', 'landed_cost'].includes(nom) || !jeton(nom)) continue;
    const s = etat(nom);
    if (s !== 'ok' && s !== 'not_requested') out.etapes_en_echec.push({ etape: nom, raison: s === 'expiree' ? 'timed out on the API side' : `step ${s} on the API side` });
  }
  return { ...out, chemin: 'compliance_check', brut: rec.body };
}

// --- appels -----------------------------------------------------------------

async function appel(fetchImpl, key, method, chemin, body, fin, extra = {}) {
  const t0 = Date.now();
  const sec = () => Math.round((Date.now() - t0) / 100) / 10;
  try {
    const reste = fin - t0;
    if (reste < 500) return { http: null, error: 'TimeoutError: budget exhausted', body: null, seconds: 0 };
    const r = await fetchImpl(API + chemin, {
      method, signal: AbortSignal.timeout(reste), body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra },
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* corps illisible : traité comme un échec */ }
    return { http: json ? r.status : null, error: json ? undefined : `unreadable response (${r.status})`, body: json, seconds: sec() };
  } catch (err) {
    return { http: null, error: `${err?.name || 'Error'}: ${err?.message || err}`, body: null, seconds: sec() };
  }
}

// Télécharge les textes officiels donnés en source, sans jamais envoyer la clé de l'API.
// Un téléchargement raté laisse simplement l'obligation non sourcée.
export async function telechargerSources(urls, { fetchSource = fetch, fin = Date.now() + 15_000 } = {}) {
  const textes = {};
  await Promise.all(arr(urls).filter((u) => adresse(u) && officielle(u)).slice(0, 6).map(async (u) => {
    try {
      const reste = Math.min(fin - Date.now(), 15_000);
      if (reste < 500) return;
      const r = await fetchSource(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(reste), headers: { Accept: 'text/html, text/plain' } });
      if (!r.ok || (r.url && !officielle(r.url)) || !/text\/|xml/i.test(String(r.headers?.get?.('content-type') || 'text/html'))) return;
      const brut = (await r.text()).slice(0, 3_000_000);
      textes[u] = brut.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    } catch { /* pas de texte : pas de source */ }
  }));
  return textes;
}

function valeurPositive(x) {
  const n = typeof x === 'string' && /^\s*\d+([.,]\d+)?\s*$/.test(x) ? Number(x.trim().replace(',', '.')) : x;
  return num(n) !== null && n > 0 ? n : null;
}

// Ne lève jamais : un délai dépassé ou une erreur réseau devient une entrée de
// "manquants" et de "etapes_en_echec". Ne demande aucune écriture (persist: false).
export async function obligationsEtDroits({ description, sku, hs6, origine, destination, valeur_usd, date } = {}, { fetchImpl = fetch, fetchSource = fetchImpl, key = KEY } = {}) {
  const t0 = Date.now(), fin = t0 + BUDGET_MS;
  const sec = () => Math.round((Date.now() - t0) / 100) / 10;
  const route = { origine: pays(origine), destination: pays(destination) };
  try {
    if (!key) return vide(route, ['The Cleo Legal API key is missing: no call was made.']);
    if (!route.destination) return vide(route, ['The destination country is missing or unreadable (two-letter ISO code expected).']);
    const saisi = Number.isInteger(hs6) && hs6 >= 0 ? String(hs6) : hs6;
    const code = typeof saisi === 'string' ? saisi.replace(/[.\s]/g, '') : '';
    const valeur = valeurPositive(valeur_usd);
    const quand = jour(date);
    const avis = [];
    if (date != null && date !== '' && !quand) avis.push('The date provided is not readable (YYYY-MM-DD format expected): it is ignored.');
    const sansCout = valeur_usd == null || valeur_usd === '' ? 'the goods value was not provided'
      : !valeur ? 'the value provided is not a readable positive amount'
        : !route.origine ? 'the country of origin is missing or unreadable' : null;

    if (/^\d{6}$/.test(code)) {
      const q = `code=${code}&country=${route.destination}`;
      const [obligations, catalogue, droits, cout] = await Promise.all([
        appel(fetchImpl, key, 'GET', `/v2/customs/obligations?${q}`, null, fin),
        appel(fetchImpl, key, 'GET', `/v2/catalog/regulations-by-hs?hs6=${code}&market=${route.destination}`, null, fin),
        appel(fetchImpl, key, 'GET', `/v2/customs/duties?${q}`, null, fin),
        sansCout ? undefined : appel(fetchImpl, key, 'POST', '/v2/customs/landed-cost', { code, origin: route.origine, destination: route.destination, fob_usd: valeur }, fin),
      ]);
      const textes = await telechargerSources(adressesSources(obligations.body), { fetchSource, fin });
      const out = normaliser({ route, hs6: code, date: quand, appels: { obligations, catalogue, droits, cout }, textes, sansCout: sansCout || undefined, secondes: sec() });
      out.manquants = [...new Set([...out.manquants, ...avis])];
      out.secondes = sec();
      return out;
    }

    if (hs6 != null && hs6 !== '') return vide(route, ['The code provided is not a six-digit HS code: no call was made.']);
    if (typeof description !== 'string' || description.trim().length < 2) return vide(route, ['Neither a six-digit HS code nor a product description: nothing to query.']);

    const ref = typeof sku === 'number' && Number.isFinite(sku) ? String(sku) : texte(sku, { max: 128 });
    if (sku != null && sku !== '' && !ref) avis.push('The product reference provided is not readable: it was not sent.');
    const body = {
      product: { description: description.trim().slice(0, 2000), ...(ref ? { item_id: ref } : {}) },
      ...(route.origine ? { origin_country: route.origine } : {}),
      destination_country: route.destination,
      ...(quand ? { as_of: quand } : {}),
      ...(valeur && route.origine ? { transaction: { fob_usd: valeur } } : {}),
      options: { persist: false },
    };
    const rec = await appel(fetchImpl, key, 'POST', '/v2/compliance/check', body, fin, { 'Idempotency-Key': crypto.randomUUID() });
    const textes = await telechargerSources(adressesSources({ data: objet(objet(rec.body)?.data)?.decision?.obligations }), { fetchSource, fin });
    const out = normaliserCheck({ route, rec, textes, secondes: sec() });
    out.manquants = [...new Set([...out.manquants, ...avis])];
    return out;
  } catch {
    return vide(route, ['An internal error interrupted the reading of obligations and duties: nothing is returned.'], [{ etape: 'normalisation', raison: 'internal error' }], null, sec());
  }
}
