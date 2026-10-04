// Tests du module obligations et droits. Les attentes sont écrites à la main en
// lisant les réponses brutes enregistrées le 4 octobre 2026 dans
// essais/modules/obligations-raw/ (codes 850440, 853669, 999999 et 850760) :
// l'oracle ne vient pas du code testé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KEY } from '../app.mjs';
import { obligationsEtDroits, normaliser, normaliserCheck, normaliserObligations, normaliserDroits, normaliserCout, telechargerSources } from '../lib/obligations.mjs';

const brut = (nom) => JSON.parse(readFileSync(new URL(`../essais/modules/obligations-raw/${nom}.json`, import.meta.url), 'utf8'));
const FICHIERS = [['obligations', 'obligations'], ['catalogue', 'regulations-by-hs'], ['droits', 'duties'], ['cout', 'landed-cost']];
const JOUR = '2026-10-04';
// prefixe : « cn-fr », « cn-us-850760 »...
const jeu = (prefixe, hs6, destination) => normaliser({
  route: { origine: 'CN', destination }, hs6, aujourdhui: JOUR,
  appels: Object.fromEntries(FICHIERS.map(([k, f]) => [k, brut(`${prefixe}-${f}`)])),
});
const route = (d) => jeu(`cn-${d.toLowerCase()}`, '850440', d);
const comp = (r, nom) => r.cout.composantes.find((c) => c.nom === nom);
// Tout ce qui peut atteindre l'écran : la sortie sans les réponses brutes.
const visible = (r) => JSON.stringify({ ...r, brut: null });
// Faux serveur : rend les quatre réponses enregistrées pour CN→FR, après retouche éventuelle.
const serveur = (retouches = {}, journal = []) => async (url, init) => {
  const u = String(url);
  const nom = u.includes('/customs/obligations') ? 'obligations' : u.includes('regulations-by-hs') ? 'regulations-by-hs' : u.includes('/customs/duties') ? 'duties' : u.includes('landed-cost') ? 'landed-cost' : 'compliance-check';
  journal.push({ url: u, init });
  const body = brut(`cn-fr-${nom}`).body;
  retouches[nom]?.(body);
  return { status: 200, ok: true, url: u, text: async () => JSON.stringify(body), headers: { get: () => 'application/json' } };
};
const page = (html) => async (url) => ({ status: 200, ok: true, url: String(url), text: async () => html, headers: { get: () => 'text/html; charset=utf-8' } });

test('CN→FR : obligations toutes non sourcées, droit 0 %, total partiel avec TVA', () => {
  const r = route('FR');
  assert.deepEqual(r.route, { origine: 'CN', destination: 'FR' });
  assert.deepEqual(r.obligations.map((o) => o.titre), [
    'CE Marking - Low Voltage Directive', 'CE Marking - Electromagnetic Compatibility Directive',
    'Customs Declaration & Safety Data', 'Harmonised Standard - Power Electronic Converters']);
  assert.ok(r.obligations.every((o) => o.sourcee === false && o.source_url === null && o.autorite === null && o.origine === 'deduite_par_un_modele'));
  assert.equal(r.obligations[0].nature, 'certification');
  assert.equal(r.obligations[0].reference, 'Directive 2014/35/EU');
  assert.equal(r.obligations[0].obligatoire, true);
  assert.equal(r.obligations[3].obligatoire, false);
  assert.equal(r.droits.taux, 0);
  assert.equal(r.droits.base_legale, 'eu-taric-xi');
  assert.equal(r.droits.source_url, 'https://www.trade-tariff.service.gov.uk/xi/api/v2/commodities');
  assert.equal(r.droits.version, 'eu-taric-xi, en vigueur depuis le 2026-01-01');
  assert.equal(r.droits.pays_du_tarif, 'EU');
  assert.equal(r.droits.lignes_lues, 10);
  assert.equal(r.droits.ligne_exacte_connue, false);
  assert.match(r.droits.nature, /pas un coût complet/);
  assert.equal(r.cout.total, 1200);
  assert.equal(r.cout.fourchette, null);
  assert.equal(r.cout.devise, 'USD');
  assert.equal(r.cout.partiel, true);
  assert.deepEqual({ ...comp(r, 'TVA') }, { nom: 'TVA', libelle_api: 'Value Added Tax', montant: 200, connu: true, taux_pct: 20, source_url: 'https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_en.htm' });
  assert.equal(comp(r, 'droit de douane').montant, 0);
  assert.deepEqual(r.cout.composantes.filter((c) => !c.connu).map((c) => c.nom), ['fret et assurance', 'accises', 'droits antidumping']);
  assert.ok(r.manquants.includes("Le total rendu (1200 USD) est partiel : c'est la somme des composantes connues, il ne contient pas fret et assurance, accises, droits antidumping."));
  assert.ok(r.manquants.some((m) => m.includes('source miroir')));
  assert.ok(r.manquants.some((m) => m.startsWith('4 obligation(s) sur 4')));
  // Le catalogue réel est vide pour ce code en France : c'est dit, pas passé sous silence.
  assert.deepEqual(r.textes_catalogue, []);
  assert.ok(r.manquants.includes('Le catalogue Cleo ne contient aucun texte pour ce code et ce pays.'));
  assert.deepEqual(r.etapes_en_echec, []);
  assert.equal(r.brut.droits.data.code, '8504406010');
});

test('CN→US : textes du catalogue rendus à part, frais MPF et HMF, total 1034,83', () => {
  const r = route('US');
  assert.equal(r.obligations.length, 4); // les textes du catalogue ne sont pas des obligations
  assert.deepEqual(r.textes_catalogue.map((o) => [o.titre, o.autorite, o.sourcee, o.applicabilite_etablie, o.type_de_produit]),
    [['UL 2056', 'CPSC', false, false, 'power-banks-and-chargers'], ['UL 62368-1', 'CPSC', false, false, 'power-banks-and-chargers']]);
  assert.equal(r.obligations[0].titre, 'FCC Certification (EMC/EMI)');
  assert.equal(r.obligations[1].reference, '19 CFR § 134.1');
  assert.equal(r.droits.taux, 0);
  assert.equal(r.droits.source_url, 'https://hts.usitc.gov/reststop/exportList');
  assert.equal(r.droits.lignes_lues, 5);
  assert.equal(r.cout.total, 1034.83); // 1000 + 0 + 33,58 + 1,25, additionné à la main
  assert.equal(comp(r, 'Merchandise Processing Fee').montant, 33.58);
  assert.equal(comp(r, 'Harbor Maintenance Fee').montant, 1.25);
  assert.equal(comp(r, 'TVA').montant, 0);
  assert.equal(comp(r, 'taux préférentiel').connu, false);
  assert.equal(r.cout.partiel, true);
  assert.ok(!r.manquants.some((m) => m.includes('source miroir')));
});

test('témoin négatif réel, CN→GB : TVA inconnue, donc pas de total, partiel et manquants', () => {
  const r = route('GB');
  assert.equal(r.cout.total, null);
  assert.equal(r.cout.partiel, true);
  assert.deepEqual({ ...comp(r, 'TVA') }, { nom: 'TVA', montant: null, connu: false });
  assert.ok(r.manquants.some((m) => m.startsWith('Composante inconnue : TVA')));
  assert.ok(r.manquants.some((m) => m.includes("Aucun total n'est rendu")));
  assert.equal(r.droits.taux, 0); // le taux de base est connu, le coût ne l'est pas
  assert.equal(r.obligations.length, 5);
  assert.deepEqual(r.textes_catalogue, [{ titre: 'UK Electrical Equipment (Safety) Regulations 2016', complements: [], autorite: 'OPSS', autorite_complements: [],
    domaine_autorite: 'gov.uk', type_de_produit: 'power-banks-and-chargers', source_url: null, sourcee: false, applicabilite_etablie: false }]);
});

test('témoin négatif fabriqué : un droit retiré de la réponse devient inconnu, pas zéro', () => {
  const rec = brut('cn-fr-landed-cost');
  const avant = normaliserCout(rec).cout;
  assert.equal(avant.composantes.find((c) => c.nom === 'droit de douane').connu, true);
  rec.body.data.data_completeness.components_missing.push('duty_schedule_not_seeded');
  rec.body.data.breakdown.duty_usd = null; rec.body.data.total_landed_usd = null;
  const { cout, manquants } = normaliserCout(rec);
  assert.deepEqual({ ...cout.composantes.find((c) => c.nom === 'droit de douane') }, { nom: 'droit de douane', montant: null, connu: false });
  assert.equal(cout.partiel, true);
  assert.equal(cout.total, null);
  assert.ok(manquants.some((m) => m.startsWith('Composante inconnue : droit de douane')));
});

test('une réponse que l\'API dit complète reste partielle tant que le fret est inconnu', () => {
  const rec = brut('cn-fr-landed-cost');
  rec.body.data.total_is_partial = false; rec.body.data.data_completeness.components_missing = [];
  const { cout } = normaliserCout(rec);
  assert.deepEqual(cout.composantes.filter((c) => !c.connu).map((c) => c.nom), ['fret et assurance']);
  assert.equal(cout.partiel, true);
});

// --- défaut 1 : la vérification ne doit plus tourner en rond ---------------------

test('intitulé avec balisage, trop court, non textuel ou entrée vide : écarté et compté', () => {
  const rec = brut('cn-fr-obligations');
  const [a, b, c] = rec.body.data.legally_required;
  a.title = '<img src=x onerror=alert(1)>'; b.title = 'ce'; c.regulation = '<script>x</script>';
  rec.body.data.legally_required.push(null, 'une chaîne', { title: 42 });
  const r = normaliserObligations(rec, null);
  assert.deepEqual(r.obligations.map((o) => o.titre), ['Customs Declaration & Safety Data', 'Harmonised Standard - Power Electronic Converters']);
  assert.equal(r.rejetes, 5);
  assert.equal(r.obligations[0].reference, null); // la référence balisée n'est pas rendue
  assert.ok(r.manquants.some((m) => m.startsWith('5 obligation(s) écartée(s)')));
  assert.ok(!/[<>]/.test(JSON.stringify(r)));
});

test('un intitulé inventé mais bien formé ne peut pas être détecté : il sort, jamais sourcé, et c\'est dit', () => {
  const rec = brut('cn-fr-obligations');
  rec.body.data.legally_required[0].title = 'Totally invented obligation, never in any official text';
  const r = normaliserObligations(rec, null);
  assert.equal(r.obligations[0].titre, 'Totally invented obligation, never in any official text');
  assert.equal(r.obligations[0].sourcee, false);
  assert.equal(r.obligations[0].citation_source, null);
  assert.ok(r.manquants.some((m) => m.startsWith("4 obligation(s) sur 4 n'ont pas de texte officiel relu")));
});

test('sourcee : vrai seulement si la référence se retrouve dans le texte officiel téléchargé', () => {
  const URL_OK = 'https://eur-lex.europa.eu/eli/dir/2014/35/oj';
  const officiel = 'DIRECTIVE 2014/35/EU OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL of 26 February 2014';
  const prepare = (retouche) => { const rec = brut('cn-fr-obligations'); const o = rec.body.data.legally_required[0]; o.inferred = false; o.url = URL_OK; retouche?.(o); return rec; };
  const lire = (rec, textes) => normaliserObligations(rec, null, { textes }).obligations[0];

  const ok = lire(prepare(), { [URL_OK]: officiel });
  assert.equal(ok.sourcee, true);
  assert.equal(ok.citation_source, 'DIRECTIVE 2014/35/EU'); // la casse du texte officiel, pas celle de l'API
  assert.equal(ok.source_url, URL_OK);
  assert.equal(ok.origine, 'lue_par_l_api');

  // Témoins négatifs : chacun retire une seule condition.
  assert.equal(lire(prepare(), {}).sourcee, false); // texte non téléchargé
  assert.equal(lire(prepare(), { [URL_OK]: 'Directive 2014/30/EU on electromagnetic compatibility' }).sourcee, false); // autre texte
  assert.equal(lire(prepare((o) => { o.inferred = true; }), { [URL_OK]: officiel }).sourcee, false); // déduite par un modèle
  const flou = lire(prepare((o) => { delete o.inferred; }), { [URL_OK]: officiel });
  assert.deepEqual([flou.sourcee, flou.origine], [false, 'non_precisee']); // champ absent : pas « non déduite »
  const blog = lire(prepare((o) => { o.url = 'https://blog.exemple.com/ce'; }), { 'https://blog.exemple.com/ce': officiel });
  assert.deepEqual([blog.sourcee, blog.source_url], [false, 'https://blog.exemple.com/ce']); // domaine non officiel
  for (const mauvaise of ['n/a', 'javascript:alert(1)', 'http://eur-lex.europa.eu/x', 'https://user:pw@europa.eu/x', 'https://127.0.0.1/x']) {
    const rec = prepare((o) => { o.url = mauvaise; o.regulation_doc_id = 'doc-123'; });
    const r = normaliserObligations(rec, null, { textes: { [mauvaise]: officiel } });
    assert.deepEqual([r.obligations[0].source_url, r.obligations[0].sourcee, r.obligations[0].document_id], [null, false, 'doc-123'], mauvaise);
    assert.ok(r.manquants.some((m) => m.startsWith('1 adresse(s) de source écartée(s)')), mauvaise);
  }
});

test('bout en bout : le texte officiel est téléchargé sans la clé, et décide de sourcee', async () => {
  const retouche = { obligations: (b) => { const o = b.data.legally_required[0]; o.inferred = false; o.url = 'https://eur-lex.europa.eu/eli/dir/2014/35/oj'; } };
  const vus = [];
  const source = (html) => async (url, init) => { vus.push({ url: String(url), init }); return page(html)(url); };
  const args = { hs6: '850440', origine: 'CN', destination: 'FR', valeur_usd: 1000 };
  const oui = await obligationsEtDroits(args, { fetchImpl: serveur(retouche), fetchSource: source('<html><script>var a="<b>";</script><h1>DIRECTIVE&nbsp;2014/35/EU of the European Parliament</h1></html>'), key: 'cle-de-test' });
  assert.equal(oui.obligations[0].sourcee, true);
  assert.equal(oui.obligations[0].citation_source, 'DIRECTIVE 2014/35/EU');
  assert.deepEqual(oui.obligations.slice(1).map((o) => o.sourcee), [false, false, false]);
  assert.deepEqual(vus.map((v) => v.url), ['https://eur-lex.europa.eu/eli/dir/2014/35/oj']);
  assert.ok(!JSON.stringify(vus[0].init.headers).includes('cle-de-test') && !('Authorization' in vus[0].init.headers));
  const non = await obligationsEtDroits(args, { fetchImpl: serveur(retouche), fetchSource: source('<html><h1>Page not found</h1></html>'), key: 'cle-de-test' });
  assert.equal(non.obligations[0].sourcee, false);
  assert.deepEqual(await telechargerSources(['https://blog.exemple.com/x', 'javascript:alert(1)'], { fetchSource: async () => { throw new Error('ne doit pas être appelé'); } }), {});
});

// --- défaut 2 : catalogue hors sujet et tirets cadratins --------------------------

test('réponses réelles, code inexistant 999999 → FR : rien n\'est rendu, 11 textes du catalogue écartés', () => {
  const r = jeu('cn-fr-999999', '999999', 'FR');
  assert.equal(brut('cn-fr-999999-regulations-by-hs').body.regulations.length, 11); // l'API en rend bien 11
  assert.deepEqual(r.obligations, []);
  assert.deepEqual(r.textes_catalogue, []);
  assert.equal(r.catalogue_ecartes, 11);
  assert.equal(r.droits, null);
  assert.equal(r.cout, null);
  assert.ok(r.manquants.some((m) => m.startsWith('11 texte(s) du catalogue Cleo écarté(s)') && m.includes("l'existence n'est donc pas établie")));
  assert.ok(r.manquants.includes("L'API n'a aucune ligne tarifaire pour le code 999999 vers FR : aucun coût n'est calculé."));
  assert.ok(!visible(r).includes('—'));
});

test('réponses réelles, 853669 → FR : 5 obligations, 19 textes de famille large écartés, fourchette au lieu d\'un total', () => {
  const r = jeu('cn-fr-853669', '853669', 'FR');
  assert.deepEqual(r.obligations.map((o) => o.titre), ['CE Marking – Low Voltage Directive', 'CE Marking – Electromagnetic Compatibility Directive',
    'Declaration of Conformity (DoC)', 'RoHS Compliance – Restriction of Hazardous Substances', 'Harmonised Standard – Safety of plugs and sockets']);
  assert.deepEqual(r.textes_catalogue, []);
  assert.equal(r.catalogue_ecartes, 19);
  assert.ok(r.manquants.some((m) => m.startsWith('19 texte(s) du catalogue Cleo écarté(s)') && m.includes('famille large')));
  assert.ok(!visible(r).includes('—'));
  assert.ok(!/nucléaire|levage|quantique/.test(visible(r)));
  // Droit : de 0 % à 2,3 % selon la ligne, donc pas de taux unique.
  assert.deepEqual([r.droits.taux, r.droits.taux_min, r.droits.taux_max, r.droits.lignes_lues], [null, 0, 2.3, 8]);
  // Coût : l'API rend 1227,6 = 1000 + 23 de droit + 204,6 de TVA, tout en disant le droit
  // indéterminé. Ni le droit, ni la TVA calculée dessus, ni ce total ne sont rendus comme connus.
  assert.equal(r.brut.cout.data.total_landed_usd, 1227.6);
  assert.equal(r.cout.total, null);
  assert.deepEqual(r.cout.fourchette, { min: 1200, max: 1227.6 });
  assert.deepEqual({ ...comp(r, 'droit de douane') }, { nom: 'droit de douane', montant: null, connu: false });
  assert.deepEqual([comp(r, 'TVA').montant, comp(r, 'TVA').connu, comp(r, 'TVA').taux_pct], [null, false, 20]);
  assert.equal(r.cout.partiel, true);
  assert.ok(r.manquants.includes("Aucun total unique n'est rendu : le droit de douane dépend de la ligne nationale (de 0 % à 2,3 %). L'API donne une fourchette de 1200 à 1227,6 USD, qui ne contient pas : fret et assurance, accises, droits antidumping."));
  assert.ok(!r.manquants.some((m) => m.startsWith('Le total rendu')));
});

test('un tiret cadratin dans un texte de l\'API est coupé en segments copiés, jamais rendu', () => {
  const cat = brut('cn-us-regulations-by-hs');
  cat.body.regulations[0].full_name = 'UL 2056 — Standard for Safety of Power Banks';
  cat.body.regulations[0].authority = 'CPSC — Office of Compliance';
  const obl = brut('cn-us-obligations');
  obl.body.data.legally_required[0].title = 'FCC Certification — EMC/EMI';
  obl.body.data.legally_required[1].regulation = '19 CFR — 134.1';
  const r = normaliserObligations(obl, cat, { hs6: '850440', destination: 'US' });
  assert.deepEqual([r.textes_catalogue[0].titre, r.textes_catalogue[0].complements], ['UL 2056', ['Standard for Safety of Power Banks']]);
  assert.deepEqual([r.textes_catalogue[0].autorite, r.textes_catalogue[0].autorite_complements], ['CPSC', ['Office of Compliance']]);
  assert.deepEqual([r.obligations[0].titre, r.obligations[0].complements], ['FCC Certification', ['EMC/EMI']]);
  assert.equal(r.obligations[1].reference, null);
  assert.ok(!JSON.stringify(r).includes('—'));
});

test('aucun tiret cadratin dans toute la sortie visible, pour les six jeux de réponses réelles', () => {
  const jeux = [route('FR'), route('US'), route('GB'), jeu('cn-fr-853669', '853669', 'FR'), jeu('cn-fr-999999', '999999', 'FR'), jeu('cn-us-850760', '850760', 'US')];
  for (const r of jeux) assert.ok(!visible(r).includes('—'), r.code + ' ' + r.route.destination);
  // Le contrôle voit bien ce qu'il cherche : les réponses brutes du catalogue en contiennent.
  assert.ok(JSON.stringify(brut('cn-fr-853669-regulations-by-hs').body).includes('—'));
});

test('catalogue : écarté si la réponse porte sur un autre code, un autre pays, ou si le code n\'est pas établi', () => {
  const lire = (opts, retouche) => { const cat = brut('cn-us-regulations-by-hs'); retouche?.(cat.body); return normaliserObligations(brut('cn-us-obligations'), cat, opts); };
  assert.equal(lire({ hs6: '850440', destination: 'US' }).textes_catalogue.length, 2);
  assert.deepEqual([lire({ hs6: '850760', destination: 'US' }).textes_catalogue.length, lire({ hs6: '850760', destination: 'US' }).catalogue_ecartes], [0, 2]);
  assert.equal(lire({ hs6: '850440', destination: 'GB' }).textes_catalogue.length, 0);
  assert.equal(lire({ hs6: '850440', destination: 'US' }, (b) => { b.sous_type = null; }).textes_catalogue.length, 0);
  assert.equal(normaliserObligations({ http: null, error: 'TimeoutError', seconds: 3 }, brut('cn-us-regulations-by-hs'), { hs6: '850440', destination: 'US' }).textes_catalogue.length, 0);
});

// --- défauts 4 et 5 : l'inconnu reste inconnu --------------------------------------

test('champs inferred et mandatory absents : origine non précisée, obligatoire inconnu, et c\'est signalé', () => {
  const rec = brut('cn-fr-obligations');
  for (const o of [...rec.body.data.legally_required, ...rec.body.data.contractually_expected]) { delete o.inferred; delete o.mandatory; }
  const r = normaliserObligations(rec, null);
  assert.equal(r.obligations.length, 4);
  assert.ok(r.obligations.every((o) => o.sourcee === false && o.origine === 'non_precisee' && o.obligatoire === null));
  assert.ok(r.manquants.some((m) => m.startsWith("4 obligation(s) sur 4 n'ont pas de texte officiel relu") && m.includes("l'API ne dit pas comment")));
  assert.ok(r.manquants.includes("Pour 4 obligation(s), l'API ne dit pas si elles sont obligatoires."));
});

// --- droits ---------------------------------------------------------------------

test('taux qui varie selon la ligne : pas de taux unique, et la raison est dite', () => {
  const rec = brut('cn-fr-duties');
  Object.assign(rec.body.data.resolution, { duty_pct_min: 0, duty_pct_max: 2.3, duty_pct_spread: true });
  const { droits, manquants } = normaliserDroits(rec, { code: '850440', destination: 'FR', aujourdhui: JOUR });
  assert.equal(droits.taux, null);
  assert.deepEqual([droits.taux_min, droits.taux_max], [0, 2.3]);
  assert.ok(manquants.some((m) => m.includes('varie de 0 % à 2,3 %')));
});

test('droits : taux périmé, autre code, autre pays, taux négatif ou borne absente ne sont pas rendus', () => {
  const lire = (retouche, opts = {}) => { const rec = brut('cn-fr-duties'); retouche(rec.body.data); return normaliserDroits(rec, { code: '850440', destination: 'FR', aujourdhui: JOUR, ...opts }); };
  assert.equal(lire(() => {}).droits.taux, 0); // témoin : sans retouche, le taux sort

  const perime = lire((d) => { d.effective_to = '2020-12-31'; });
  assert.equal(perime.droits, null);
  assert.ok(perime.manquants.includes("Le taux enregistré dans l'API a cessé d'être en vigueur le 2020-12-31 : il n'est pas rendu."));
  assert.equal(lire((d) => { d.effective_to = '2027-12-31'; }).droits.taux, 0); // fin dans le futur : rendu
  assert.equal(lire((d) => { d.effective_to = 'bientôt'; }).droits, null);
  assert.equal(lire(() => {}, { date: '2025-06-01' }).droits, null); // demandé avant l'entrée en vigueur du 2026-01-01

  const autreCode = lire((d) => { d.code = '0101210000'; d.resolution.resolved_code = '0101210000'; d.resolution.queried_code = '010121'; });
  assert.equal(autreCode.droits, null);
  assert.ok(autreCode.manquants[0].includes('ne relève pas du code demandé'));
  const autrePays = lire((d) => { d.country = 'JP'; d.resolution.resolved_country = 'JP'; });
  assert.equal(autrePays.droits, null);
  assert.ok(autrePays.manquants[0].includes("n'est pas celui du pays de destination"));
  assert.equal(normaliserDroits(brut('cn-fr-duties'), { code: '850440', destination: 'US', aujourdhui: JOUR }).droits, null); // tarif de l'UE pour les États-Unis

  assert.equal(lire((d) => { d.resolution.duty_pct_min = -5; d.resolution.duty_pct_max = -5; }).droits, null);
  const sansBorne = lire((d) => { d.resolution.duty_pct_max = null; });
  assert.equal(sansBorne.droits, null);
  assert.ok(!sansBorne.manquants.join(' ').includes('null'));
});

test('réponses réelles, 850760 → US : une seule ligne nationale, donc ligne exacte connue, pas de « 1 lignes »', () => {
  const r = jeu('cn-us-850760', '850760', 'US');
  assert.deepEqual([r.droits.taux, r.droits.lignes_lues, r.droits.ligne_exacte_connue], [3.4, 1, true]);
  assert.ok(!r.manquants.some((m) => /lignes? nationales?/.test(m)));
  assert.equal(r.cout.total, 1068.83); // 1000 + 34 + 0 + 33,58 + 1,25
  assert.equal(comp(r, 'droit de douane').montant, 34);
  assert.equal(r.textes_catalogue.length, 5);
});

// --- défaut 11 : rien de l'API ni de l'appelant n'entre dans une phrase sans contrôle ----

test('balisage dans les champs de l\'API ou les paramètres : jamais dans la sortie visible', async () => {
  const rec = brut('cn-fr-duties');
  Object.assign(rec.body.data.resolution, { line_count: '<script>alert(1)</script>', queried_code: '850440' });
  rec.body.data.effective_from = '<b>x</b>'; rec.body.data.source_url = 'javascript:alert(1)';
  const d = normaliserDroits(rec, { code: '850440', destination: 'FR', date: '<img src=x onerror=alert(2)>', aujourdhui: JOUR });
  assert.equal(d.droits.version, 'eu-taric-xi');
  assert.equal(d.droits.source_url, null);
  assert.ok(d.manquants.some((m) => m.includes('plusieurs lignes nationales (nombre non lisible)')));
  assert.ok(d.manquants.includes("La date fournie n'est pas lisible (format AAAA-MM-JJ attendu) : elle est ignorée."));
  assert.ok(!/[<>]/.test(JSON.stringify(d)));

  const cout = brut('cn-us-landed-cost');
  cout.body.data.data_completeness.components_missing.push('section_301:<script>', '<b>gras</b>');
  cout.body.data.taxes[1].label = '<svg onload=alert(1)>';
  const c = normaliserCout(cout, { code: '850440', destination: 'US' });
  assert.equal(c.cout.composantes.find((x) => x.montant === 33.58).nom, 'MPF'); // libellé balisé écarté, code de taxe gardé
  assert.ok(c.cout.composantes.some((x) => x.nom === "« section_301 » (nom rendu par l'API)" && x.connu === false));
  assert.ok(c.manquants.some((m) => m.startsWith('1 ligne(s) de taxe ou de composante écartée(s)')));
  assert.ok(!/[<>]/.test(JSON.stringify(c)));

  const r = await obligationsEtDroits({ hs6: '<script>alert(1)</script>', destination: 'FR' }, { fetchImpl: async () => { throw new Error('ne doit pas être appelé'); }, key: 'cle-de-test' });
  assert.deepEqual(r.manquants, ["Le code fourni n'est pas un code SH à six chiffres : aucun appel n'a été fait."]);
});

// --- coût -----------------------------------------------------------------------

test('montants impossibles : une taxe ou un total négatif ne sont pas rendus comme connus', () => {
  const rec = brut('cn-us-landed-cost');
  rec.body.data.taxes[1].amount_usd = -999; rec.body.data.total_landed_usd = -1;
  const { cout, manquants } = normaliserCout(rec, { code: '850440', destination: 'US' });
  assert.deepEqual([comp({ cout }, 'Merchandise Processing Fee').montant, comp({ cout }, 'Merchandise Processing Fee').connu], [null, false]);
  assert.equal(cout.total, null);
  assert.ok(manquants.some((m) => m.includes('montant négatif')));
  assert.ok(!manquants.some((m) => m.startsWith('Le total rendu')));
});

test('un total qui ne correspond pas à la somme des composantes connues est écarté', () => {
  const rec = brut('cn-fr-landed-cost');
  rec.body.data.total_landed_usd = 1500; // 1000 + 0 + 200 font 1200
  const { cout, manquants } = normaliserCout(rec, { code: '850440', destination: 'FR' });
  assert.equal(cout.total, null);
  assert.ok(manquants.some((m) => m.includes('ne correspond pas à la somme des composantes connues')));
  assert.equal(normaliserCout(brut('cn-fr-landed-cost'), { code: '850760', destination: 'FR' }).cout, null); // coût d'un autre code
  assert.equal(normaliserCout(brut('cn-fr-landed-cost'), { code: '850440', destination: 'US' }).cout, null); // coût d'une autre destination
});

// --- défauts 8 et 9 : réponses 200 sans contenu, entrées vides ---------------------

test('une réponse 200 qui porte une erreur est un échec de lecture, pas une absence de données', () => {
  const err = (code) => ({ http: 200, body: { error: code } });
  const r = normaliser({ route: { origine: 'CN', destination: 'FR' }, hs6: '850440', appels: { obligations: err('rate_limited'), catalogue: err('x'), droits: err('rate_limited'), cout: err('x') } });
  assert.deepEqual(r.etapes_en_echec.map((e) => e.etape), ['obligations', 'catalogue_reglementaire', 'droits', 'cout']);
  assert.ok(r.manquants.includes("Le taux de droit n'a pas pu être lu : l'API a répondu par une erreur (« rate_limited »)."));
  assert.ok(!r.manquants.some((m) => /n'est enregistré|ni tarif ni taxes/.test(m)));
  // 200 avec un objet sans le contenu attendu
  const creux = normaliser({ route: { origine: 'CN', destination: 'FR' }, hs6: '850440', appels: { obligations: { http: 200, body: {} }, catalogue: { http: 200, body: {} }, droits: { http: 200, body: { data: 'x' } }, cout: { http: 200, body: { data: {} } } } });
  assert.deepEqual(creux.etapes_en_echec.map((e) => e.etape), ['obligations', 'catalogue_reglementaire', 'droits', 'cout']);
  // Listes vides : dit, pas passé sous silence.
  const vides = normaliserObligations({ http: 200, body: { data: { legally_required: [], contractually_expected: [] } } }, { http: 200, body: { regulations: [] } });
  assert.deepEqual(vides.manquants, ["L'API ne rend aucune obligation pour ce code et ce pays (listes vides) : cela n'établit pas qu'il n'y en a aucune.", 'Le catalogue Cleo ne contient aucun texte pour ce code et ce pays.']);
  assert.deepEqual(vides.etapes_en_echec, []);
});

test('une entrée null dans une liste de l\'API ne fait perdre ni les autres entrées ni les autres sections', async () => {
  const fetchImpl = serveur({ obligations: (b) => b.data.legally_required.push(null), 'landed-cost': (b) => b.data.taxes.push(null) });
  const r = await obligationsEtDroits({ hs6: '850440', origine: 'CN', destination: 'FR', valeur_usd: 1000 }, { fetchImpl, key: 'cle-de-test' });
  assert.equal(r.obligations.length, 4);
  assert.equal(r.rejetes, 1);
  assert.equal(r.droits.taux, 0);
  assert.equal(r.cout.total, 1200);
  assert.ok(!r.manquants.some((m) => /Cannot read|TypeError|properties of/.test(m)));
  const rec = brut('cn-fr-landed-cost'); rec.body.data.taxes.push(null, 7);
  assert.doesNotThrow(() => normaliserCout(rec));
  // Une section qui casse malgré tout n'emporte pas les autres.
  const piege = { http: 200, body: { get data() { throw new Error('piège'); } } };
  const isole = normaliser({ route: { origine: 'CN', destination: 'FR' }, hs6: '850440', aujourdhui: JOUR, appels: { obligations: piege, droits: brut('cn-fr-duties'), cout: brut('cn-fr-landed-cost') } });
  assert.equal(isole.droits.taux, 0);
  assert.equal(isole.cout.total, 1200);
  assert.deepEqual(isole.etapes_en_echec, [{ etape: 'obligations', raison: 'réponse impossible à interpréter' }]);
});

// --- compliance/check -------------------------------------------------------------

test('compliance/check réel du 4 octobre : classification expirée, tout est écarté et compté', () => {
  const r = normaliserCheck({ route: { origine: 'CN', destination: 'FR' }, rec: brut('cn-fr-compliance-check') });
  assert.deepEqual(r.obligations, []);
  assert.equal(r.droits, null);
  assert.equal(r.cout, null);
  assert.equal(r.ecartes, 7); // 4 + 1 obligations, 1 droit, 1 coût, calculés sur le code provisoire 853669
  assert.equal(r.code_provisoire_ecarte, '853669');
  assert.deepEqual(r.etapes_en_echec, [{ etape: 'classification', raison: 'délai dépassé côté API' }]);
  assert.ok(r.manquants[0].startsWith("La classification n'a pas abouti"));
  const gb = normaliserCheck({ route: { origine: 'CN', destination: 'GB' }, rec: brut('cn-gb-compliance-check') });
  assert.equal(gb.ecartes, 0);
  assert.equal(gb.manquants.length, 2);
});

test('compliance/check réel, second essai : étape « ok » mais classification provisoire, donc écarté', () => {
  const rec = brut('cn-us-compliance-check-essai-2');
  assert.equal(rec.body.data.decision.steps.classification, 'ok'); // l'étape a abouti...
  assert.equal(rec.body.data.product_classification.provisional, true); // ...sur un code que l'API dit provisoire
  const r = normaliserCheck({ route: { origine: 'CN', destination: 'US' }, rec });
  assert.deepEqual(r.obligations, []);
  assert.equal(r.droits, null);
  assert.equal(r.cout, null);
  assert.equal(r.ecartes, 6); // 4 obligations, 1 droit, 1 coût
  assert.equal(r.code_provisoire_ecarte, '8504407007');
  assert.deepEqual(r.etapes_en_echec, [{ etape: 'classification', raison: 'classification provisoire' }]);
  assert.ok(r.manquants[0].includes('needs_information'));
});

// Retouche à la main de l'essai 2 pour figurer une classification établie. « classified »
// est le mot que l'API oppose à « needs_information » dans decision.provisional_code.reason.
function etablie(retouche) {
  const rec = brut('cn-us-compliance-check-essai-2'), data = rec.body.data;
  assert.match(data.decision.provisional_code.reason, /returned needs_information, not classified/);
  Object.assign(data.product_classification, { provisional: false, status: 'classified' });
  Object.assign(data.decision, { readiness: 'needs_review', provisional_code: null });
  retouche?.(data);
  return normaliserCheck({ route: { origine: 'CN', destination: 'US' }, rec });
}

test('compliance/check avec une classification établie : les sections sont rendues (réponse retouchée à la main)', () => {
  const r = etablie();
  assert.equal(r.code, '8504407007');
  assert.equal(r.obligations.length, 4);
  assert.ok(r.obligations.every((o) => !o.sourcee));
  assert.equal(r.droits, null); // l'API n'a aucun taux pour cette ligne nationale
  assert.equal(r.cout, null); // ni aucune ligne tarifaire pour le coût (resolution.matched : none)
  assert.ok(r.manquants.includes("Aucun taux de droit n'est enregistré dans l'API pour le code 8504407007 vers US."));
  assert.ok(r.manquants.includes("L'API n'a aucune ligne tarifaire pour le code 8504407007 vers US : aucun coût n'est calculé."));
  assert.deepEqual(r.etapes_en_echec, []);
});

test('compliance/check : un champ absent ne vaut pas classification établie', () => {
  const refuse = (retouche) => { const r = etablie(retouche); assert.deepEqual([r.obligations.length, r.droits, r.cout, r.code], [0, null, null, null]); return r; };
  // Le défaut reproduit : provisional supprimé, statut resté « needs_information ».
  const rec = brut('cn-us-compliance-check-essai-2'); delete rec.body.data.product_classification.provisional;
  const r = normaliserCheck({ route: { origine: 'CN', destination: 'US' }, rec });
  assert.deepEqual([r.obligations.length, r.code, r.ecartes], [0, null, 6]);
  assert.deepEqual(r.etapes_en_echec, [{ etape: 'classification', raison: 'classification non établie' }]);
  refuse((d) => { delete d.product_classification.provisional; });
  refuse((d) => { d.product_classification.status = 'needs_information'; });
  refuse((d) => { delete d.product_classification.status; });
  refuse((d) => { d.product_classification.primary_code = null; d.decision.readiness = 'blocked'; });
  refuse((d) => { d.decision.readiness = 'blocked'; });
  refuse((d) => { d.decision.provisional_code = { code: '8504407007' }; });
  refuse((d) => { d.product_classification.code_source = 'lookup_fallback'; });
  refuse((d) => { d.timed_out_steps = ['classification']; });
});

test('compliance/check : une étape expirée ou absente est un échec, pas « rien dans l\'API »', () => {
  const r = etablie((d) => {
    d.timed_out_steps = ['obligations', 'duties', 'dual_use'];
    Object.assign(d.decision.steps, { obligations: 'timeout', duties: 'timed_out' });
    delete d.decision.obligations; delete d.decision.duties;
  });
  assert.deepEqual(r.obligations, []);
  assert.equal(r.droits, null);
  assert.deepEqual(r.etapes_en_echec.filter((e) => e.etape !== 'cout'), [
    { etape: 'obligations', raison: 'délai dépassé côté API' }, { etape: 'droits', raison: 'délai dépassé côté API' }, { etape: 'dual_use', raison: 'délai dépassé côté API' }]);
  assert.ok(!r.manquants.some((m) => /n'est enregistrée? dans l'API/.test(m)));
  const absent = etablie((d) => { delete d.decision.duties; }); // étape dite « ok », bloc absent
  assert.deepEqual(absent.etapes_en_echec, [{ etape: 'droits', raison: "étape dite « ok » mais absente de la réponse de l'API" }]);
  const saute = etablie((d) => { d.decision.steps.obligations = 'skipped'; });
  assert.deepEqual(saute.etapes_en_echec, [{ etape: 'obligations', raison: 'étape « skipped » côté API' }]);
});

// --- appels et entrées ------------------------------------------------------------

test('délai dépassé : listes vides, raison dans manquants, aucune exception', async () => {
  const fetchImpl = async () => { const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError'; throw e; };
  const r = await obligationsEtDroits({ hs6: '850440', origine: 'CN', destination: 'FR', valeur_usd: 1000 }, { fetchImpl, key: 'cle-de-test' });
  assert.deepEqual(r.obligations, []);
  assert.equal(r.droits, null);
  assert.equal(r.cout, null);
  assert.deepEqual(r.etapes_en_echec.map((e) => e.etape), ['obligations', 'catalogue_reglementaire', 'droits', 'cout']);
  assert.ok(r.manquants.length >= 4 && r.manquants.every((m) => m.includes('délai dépassé')));
  const sansCode = await obligationsEtDroits({ description: 'USB-C power adapter', origine: 'CN', destination: 'FR' }, { fetchImpl, key: 'cle-de-test' });
  assert.deepEqual(sansCode.etapes_en_echec.map((e) => e.etape), ['compliance_check']);
  // Une panne réseau ne montre pas de message technique en anglais.
  const panne = await obligationsEtDroits({ hs6: '850440', destination: 'FR' }, { fetchImpl: async () => { throw new TypeError('fetch failed'); }, key: 'cle-de-test' });
  assert.ok(!panne.manquants.join(' ').includes('fetch failed'));
});

test('entrées inutilisables : pas d\'appel, pas d\'exception', async () => {
  let appels = 0; const fetchImpl = async () => { appels++; throw new Error('ne doit pas être appelé'); };
  for (const args of [{ hs6: '8504', destination: 'FR' }, { hs6: 8504, destination: 'FR' }, { destination: 'France', hs6: '850440' }, { destination: 'FR' }, undefined]) {
    const r = await obligationsEtDroits(args, { fetchImpl, key: 'cle-de-test' });
    assert.equal(r.manquants.length, 1); assert.deepEqual(r.obligations, []);
  }
  assert.equal(appels, 0);
});

test('code passé comme nombre, valeur passée en texte, origine absente : messages justes', async () => {
  const journal = [];
  const nombre = await obligationsEtDroits({ hs6: 850440, origine: 'CN', destination: 'FR', valeur_usd: '1000' }, { fetchImpl: serveur({}, journal), key: 'cle-de-test' });
  assert.equal(nombre.code, '850440');
  assert.equal(nombre.cout.total, 1200);
  assert.deepEqual(JSON.parse(journal.find((j) => j.url.includes('landed-cost')).init.body), { code: '850440', origin: 'CN', destination: 'FR', fob_usd: 1000 });

  const phrasesCout = (r) => r.manquants.filter((m) => m.startsWith("Le coût à l'arrivée n'est pas calculé"));
  const sansOrigine = await obligationsEtDroits({ hs6: '850440', destination: 'FR', valeur_usd: 1000 }, { fetchImpl: serveur(), key: 'cle-de-test' });
  assert.deepEqual(phrasesCout(sansOrigine), ["Le coût à l'arrivée n'est pas calculé : le pays d'origine est absent ou illisible."]);
  const sansValeur = await obligationsEtDroits({ hs6: '850440', origine: 'CN', destination: 'FR' }, { fetchImpl: serveur(), key: 'cle-de-test' });
  assert.deepEqual(phrasesCout(sansValeur), ["Le coût à l'arrivée n'est pas calculé : la valeur de la marchandise n'a pas été fournie."]);
  const valeurFausse = await obligationsEtDroits({ hs6: '850440', origine: 'CN', destination: 'FR', valeur_usd: 'mille' }, { fetchImpl: serveur(), key: 'cle-de-test' });
  assert.deepEqual(phrasesCout(valeurFausse), ["Le coût à l'arrivée n'est pas calculé : la valeur fournie n'est pas un montant positif lisible."]);
});

test('date et référence produit : validées avant envoi à compliance/check', async () => {
  const journal = [];
  const r = await obligationsEtDroits({ description: 'x'.repeat(100000), sku: { a: 1 }, origine: 'CN', destination: 'gb ', date: { a: 1 } }, { fetchImpl: serveur({}, journal), key: 'cle-de-test' });
  const envoye = JSON.parse(journal[0].init.body);
  assert.deepEqual(Object.keys(envoye).sort(), ['destination_country', 'options', 'origin_country', 'product']);
  assert.deepEqual(Object.keys(envoye.product), ['description']);
  assert.equal(envoye.product.description.length, 2000);
  assert.equal(envoye.destination_country, 'GB');
  assert.deepEqual(envoye.options, { persist: false });
  assert.ok(r.manquants.includes("La date fournie n'est pas lisible (format AAAA-MM-JJ attendu) : elle est ignorée."));
  assert.ok(r.manquants.includes("La référence du produit fournie n'est pas lisible : elle n'a pas été transmise."));
  journal.length = 0;
  await obligationsEtDroits({ description: 'USB-C power adapter', sku: 'USBC-65W', destination: 'FR', date: '2026-02-30' }, { fetchImpl: serveur({}, journal), key: 'cle-de-test' });
  assert.equal(JSON.parse(journal[0].init.body).as_of, undefined); // le 30 février n'existe pas
  journal.length = 0;
  await obligationsEtDroits({ description: 'USB-C power adapter', sku: 'USBC-65W', destination: 'FR', date: '2026-01-15' }, { fetchImpl: serveur({}, journal), key: 'cle-de-test' });
  assert.deepEqual([JSON.parse(journal[0].init.body).as_of, JSON.parse(journal[0].init.body).product.item_id], ['2026-01-15', 'USBC-65W']);
});

// --- appels réels -----------------------------------------------------------------

test('appel réel CN→FR avec le code 850440', { skip: !KEY && 'clé absente' }, async () => {
  const r = await obligationsEtDroits({ hs6: '850440', origine: 'CN', destination: 'FR', valeur_usd: 1000 });
  assert.ok(r.secondes < 100);
  assert.deepEqual(r.route, { origine: 'CN', destination: 'FR' });
  assert.equal(r.chemin, 'points_d_acces_separes');
  assert.ok(r.brut.droits && r.brut.cout);
  for (const o of r.obligations) { assert.equal(typeof o.sourcee, 'boolean'); if (!o.citation_source) assert.equal(o.sourcee, false); }
  if (r.cout) { assert.equal(r.cout.partiel, true); assert.ok(r.cout.composantes.some((c) => !c.connu)); }
  assert.ok(r.manquants.length > 0);
  assert.ok(!visible(r).includes('—') && !visible(r).includes(KEY));
});

test('appels réels : 999999 → FR ne rend rien, 853669 → FR ne rend ni texte hors sujet ni faux total', { skip: !KEY && 'clé absente' }, async () => {
  const faux = await obligationsEtDroits({ hs6: '999999', origine: 'CN', destination: 'FR', valeur_usd: 1000 });
  assert.deepEqual([faux.obligations.length, faux.textes_catalogue.length, faux.droits, faux.cout], [0, 0, null, null]);
  assert.ok(!visible(faux).includes('—'));
  const prises = await obligationsEtDroits({ hs6: '853669', origine: 'CN', destination: 'FR', valeur_usd: 1000 });
  assert.deepEqual(prises.textes_catalogue, []);
  assert.ok(!visible(prises).includes('—'));
  if (prises.cout && prises.brut.cout.data.data_completeness.components_missing.includes('duty_not_determinable_at_hs6')) {
    assert.equal(prises.cout.total, null);
    assert.equal(comp(prises, 'TVA').connu, false);
    assert.ok(!prises.manquants.some((m) => m.startsWith('Le total rendu')));
  }
});
