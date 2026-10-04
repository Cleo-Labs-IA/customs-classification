// Règles que le cockpit applique aux commandes. Plus aucun résumé libre : chaque règle vient
// - soit des exigences vérifiées (essais/monde/reglementation-*.json, citation retrouvée mot
//   pour mot dans le texte officiel), regroupées par marché et par famille de produit ;
// - soit d'une règle douanière corrigée après l'audit (essais/monde/veille-audit.json), avec
//   l'acte officiel et le passage qui la fonde.
//   node essais/monde/construire-veille.mjs   →  public/data/veille.json
import { readFileSync, writeFileSync } from 'node:fs';
const lire = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const exig = ['europe', 'ameriques', 'asie-pacifique'].flatMap((f) => lire(`./reglementation-${f}.json`)).filter((e) => e.verifie === true);
const audit = Object.fromEntries(lire('./veille-audit-cites.json').map((e) => [e.id, e]));
const ancien = lire('../../public/data/veille.json');
const cite = (id) => { const a = audit[id]; if (!a || a.verifie !== true) throw new Error('citation d\'audit non vérifiée : ' + id); return { url: a.url, citation: a.citation, verifie_le: a.verifie_le }; };

const MARCHE = { EU: ['European Union', 'UE'], GB: ['United Kingdom', 'GB'], CH: ['Switzerland', 'CH'], US: ['United States', 'US'], CA: ['Canada', 'CA'], MX: ['Mexico', 'MX'], JP: ['Japan', 'JP'], KR: ['South Korea', 'KR'], AU: ['Australia', 'AU'], NZ: ['New Zealand', 'NZ'], TW: ['Taiwan', 'TW'] };
const FAMILLE = { charger: ['850440', 'power adapter'], laptop: ['847130', 'notebook computer'] };
const regles = [];
for (const [m, [nom, zone]] of Object.entries(MARCHE)) for (const [f, [sh, quoi]] of Object.entries(FAMILLE)) {
  const liste = exig.filter((e) => e.marche === m && e.produits.includes(f));
  if (!liste.length) continue;
  regles.push({ id: `exig-${m.toLowerCase()}-${f}`, titre: `${nom}: ${liste.length} verified requirement${liste.length === 1 ? '' : 's'} for a ${quoi}`,
    resume: liste.map((e) => e.titre).join(' · ') + '. Each one quotes its official text in the World view.', juridictions: [zone], sh: [sh], debut: '2020-01-01', nature: 'texte_officiel',
    source: { nom: `${liste.length} official text${liste.length === 1 ? '' : 's'}, quoted word for word`, ref: liste.map((e) => e.acte).filter((x, i, t) => t.indexOf(x) === i).slice(0, 3).join('; ') + (new Set(liste.map((e) => e.acte)).size > 3 ? '; and others' : ''), url: liste[0].url },
    exigences: liste.map((e) => e.id), marche: m, famille: f,
    effet: { type: 'exigence', question: `Do you hold the evidence for the ${liste.length} requirement${liste.length === 1 ? '' : 's'} checked for ${nom}?`, si_oui: `Evidence held for the verified requirements of ${nom}`, si_non_texte: `Evidence missing for ${nom}: the order waits` } });
}
regles.push(
  { id: 'ue-3eur', titre: 'EUR 3 customs duty per item on small consignments', resume: 'From 1 July 2026 until 1 July 2028, a customs duty of EUR 3 per item applies to consignments whose intrinsic value does not exceed EUR 150, only where the seller uses the Import One-Stop Shop or the goods travel in a postal consignment. Other consignments pay the normal tariff. The origin of the goods plays no part.', juridictions: ['UE'], sh: ['*'], debut: '2026-07-01', fin: '2028-07-01', nature: 'texte_officiel',
    source: { nom: 'Council Regulation (EU) 2026/382', ref: 'Article 2', ...cite('ue-3eur-6') }, effet: { type: 'info', valeur_max: 150, texte: 'EUR 3 of duty per item if the sale goes through the Import One-Stop Shop or by post (consignment up to EUR 150)' } },
  { id: 'us-de-minimis', titre: 'No de minimis exemption in the United States', resume: 'Imports valued at 800 USD or less no longer enter duty free, whatever the country of origin. The ordinary duty of the product applies. Shipments through the international postal network follow a separate regime.', juridictions: ['US'], sh: ['*'], debut: '2025-08-29', nature: 'texte_officiel',
    source: { nom: 'CBP interim final rule, Federal Register 2026-12670', ref: 'Summary', ...cite('us-de-minimis-6') }, effet: { type: 'info', texte: 'No de minimis exemption: the ordinary duty of the product applies' } },
  { id: 'au-gst', titre: 'Australian GST on low value imported goods', resume: 'For goods with a customs value of 1,000 AUD or less sold to a consumer in Australia, the 10% GST is charged at the sale by the seller or by the marketplace. A non-resident seller must register only if its turnover from sales connected with Australia reaches 75,000 AUD.', juridictions: ['AU'], sh: ['*'], debut: '2018-07-01', nature: 'texte_officiel',
    source: { nom: 'Australian Taxation Office', ref: 'GST on low value imported goods', ...cite('au-gst-1') }, effet: { type: 'info', texte: '10% GST charged at the sale if the customs value is 1,000 AUD or less and the seller is registered (turnover of 75,000 AUD or more)' } },
);
writeFileSync(new URL('../../public/data/veille.json', import.meta.url), JSON.stringify({ fixe_le: new Date().toISOString().slice(0, 10),
  avertissement: 'Every rule quotes its official text, and each quote was found word for word in the source by an independent check. The list is not complete: rules that could not be checked against an official text are left out. Nothing here states that a product is compliant.',
  regles, simulations: ancien.simulations }, null, 1) + '\n');
console.log(regles.length, 'règles :', regles.map((r) => r.id).join(' '));
