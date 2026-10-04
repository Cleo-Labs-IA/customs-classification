// Builds public/data/textes-conformite.json by COPYING passages out of the acts downloaded from the
// EU Publications Office (essais/conformite/sources/*.xhtml). No legal text is typed by hand:
// every entry points at an article, paragraph or point of a source file, and "debut" is a guard that
// checks the passage read is the expected one. Run: node essais/conformite/construire-textes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// XHTML to plain lines: inline tags vanish, every other tag is a line break, entities are decoded.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const enLignes = (x) => x
  .replace(/<head[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<\/?(span|a|i|b|em|strong|sup|sub)(\s[^>]*)?>/gi, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/g, (m, n) => ENT[n] ?? m)
  .split('\n').map(norm).filter(Boolean);

// The acts kept. "version" is the CELEX number of the file actually downloaded (consolidated when one exists in English).
const EURLEX = 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:';
const acte = (version, celex, nom, source) => {
  const L = enLignes(readFileSync(new URL(`sources/${version}.xhtml`, ici), 'utf8'));
  writeFileSync(new URL(`sources/${version}.txt`, ici), L.join('\n') + '\n');
  return { version, celex, nom, source, url: EURLEX + version, L };
};
const LVD = acte('02014L0035-20260530', '32014L0035', 'Directive 2014/35/EU', 'Directive 2014/35/EU (Low Voltage Directive), consolidated version of 30 May 2026');
const EMC = acte('02014L0030-20260530', '32014L0030', 'Directive 2014/30/EU', 'Directive 2014/30/EU (Electromagnetic Compatibility Directive), consolidated version of 30 May 2026');
const ROHS = acte('02011L0065-20260701', '32011L0065', 'Directive 2011/65/EU', 'Directive 2011/65/EU (RoHS Directive), consolidated version of 1 July 2026');
const EPS = acte('32019R1782', '32019R1782', 'Regulation (EU) 2019/1782', 'Commission Regulation (EU) 2019/1782 (ecodesign of external power supplies), text as published in OJ L 272, 25.10.2019');
const ECO = acte('02009L0125-20121204', '32009L0125', 'Directive 2009/125/EC', 'Directive 2009/125/EC (Ecodesign Directive), consolidated version of 4 December 2012');
const ESPR = acte('02024R1781-20240628', '32024R1781', 'Regulation (EU) 2024/1781', 'Regulation (EU) 2024/1781 (Ecodesign for Sustainable Products Regulation), consolidated version of 28 June 2024');
const EPS2 = acte('32025R2052', '32025R2052', 'Regulation (EU) 2025/2052', 'Commission Regulation (EU) 2025/2052 (ecodesign of external power supplies, applicable from 14 December 2028), text as published in the OJ of 24.11.2025');
const WEEE = acte('02012L0019-20240408', '32012L0019', 'Directive 2012/19/EU', 'Directive 2012/19/EU (WEEE Directive), consolidated version of 8 April 2024');
const MSR = acte('02019R1020-20260812', '32019R1020', 'Regulation (EU) 2019/1020', 'Regulation (EU) 2019/1020 (Market Surveillance Regulation), consolidated version of 12 August 2026');
const GPSR = acte('02023R0988-20260529', '32023R0988', 'Regulation (EU) 2023/988', 'Regulation (EU) 2023/988 (General Product Safety Regulation), consolidated version of 29 May 2026');
const RED = acte('02014L0053-20260530', '32014L0053', 'Directive 2014/53/EU', 'Directive 2014/53/EU (Radio Equipment Directive), consolidated version of 30 May 2026');
const CC = acte('32022L2380', '32022L2380', 'Directive (EU) 2022/2380', 'Directive (EU) 2022/2380 (common charger amendment to Directive 2014/53/EU), text as published in OJ L 315, 7.12.2022');
// Entries are taken from it only for the "product contains a battery" line added after the reviews of 2026-10-04.
const BAT = acte('02023R1542-20260813', '32023R1542', 'Regulation (EU) 2023/1542', 'Regulation (EU) 2023/1542 (Batteries Regulation), consolidated version of 13 August 2026');

// ---- locating passages -------------------------------------------------------------------------
const FIN = /^(Article \d+[a-z]?|ANNEX( [IVX]+[a-z]?)?|CHAPTER [0-9IVX]+[a-z]?|SECTION \d+|Done at .*)$/;
// Body of an article or annex: the lines after its number and its title. "titre" guards the right occurrence
// (a consolidated act also carries article numbers in its correlation table); titre === null for untitled articles.
const corps = (a, nom, titre) => {
  for (let i = 0; i < a.L.length; i++) {
    if (a.L[i] !== nom) continue;
    if (titre !== null && !(a.L[i + 1] || '').startsWith(titre)) continue;
    let j = i + 1; while (j < a.L.length && !FIN.test(a.L[j])) j++;
    return a.L.slice(i + (titre === null ? 1 : 2), j);
  }
  throw new Error(`${a.version}: ${nom} (${titre}) not found`);
};
const estDebut = (l, m) => l === m || l.startsWith(m + ' ');
// Numbered paragraph n ("1." alone on its line in consolidated texts, "1. Text" in OJ texts).
const par = (B, n, suivant = `${n + 1}.`) => {
  const i = B.findIndex((l) => estDebut(l, `${n}.`));
  if (i < 0) throw new Error(`paragraph ${n} not found`);
  let j = B.findIndex((l, k) => k > i && estDebut(l, suivant)); if (j < 0) j = B.length;
  return B.slice(i, j);
};
// From the line that is the marker "de" (or starts with it) up to, not including, the marker "avant".
// avant === 1, 2...: that many lines; avant === null: to the end.
const de = (B, debut, avant = 1) => {
  const i = B.findIndex((l) => l === debut || l.startsWith(debut));
  if (i < 0) throw new Error(`"${debut}" not found`);
  if (avant === null) return B.slice(i);
  if (typeof avant === 'number') return B.slice(i, i + avant);
  const j = B.findIndex((l, k) => k > i && (l === avant || l.startsWith(avant)));
  if (j < 0) throw new Error(`end "${avant}" not found after "${debut}"`);
  return B.slice(i, j);
};
// Consolidation markers (▼B, ▼M1, ►C1 ...) are editorial, not law: they are trimmed at both ends of a passage,
// and a passage that would carry one in its middle is refused (it must be split instead).
const MARQUE = /^[▼►]|◄/;
const net = (lignes) => {
  let B = [...lignes];
  while (B.length && MARQUE.test(B[0]) && /^[▼►][A-Z]\d*( \u2014+)?$/.test(B[0])) B.shift();
  while (B.length && /^[▼►][A-Z]\d*( \u2014+)?$/.test(B[B.length - 1])) B.pop();
  return B;
};

const out = [];
const add = (id, a, ref, lignes, debut) => {
  const B = net(lignes);
  const m = B.find((l) => MARQUE.test(l));
  if (m) throw new Error(`${id}: consolidation marker inside the passage (${m})`);
  const texte = norm(B.join(' '));
  if (!texte) throw new Error(`${id}: empty text`);
  if (!texte.startsWith(debut)) throw new Error(`${id}: unexpected start "${texte.slice(0, 70)}"`);
  if (!/^[a-z0-9-]+$/.test(id) || out.some((e) => e.id === id)) throw new Error(`bad or duplicate id ${id}`);
  out.push({ id, ref: `${a.nom}, ${ref}`, texte, source: a.source, celex: a.celex, version: a.version, url: a.url });
};

// ---- Low Voltage Directive 2014/35/EU ----------------------------------------------------------
{
  const a = LVD, a1 = corps(a, 'Article 1', 'Subject matter'), a2 = corps(a, 'Article 2', 'Definitions');
  const a6 = corps(a, 'Article 6', 'Obligations of manufacturers'), a8 = corps(a, 'Article 8', 'Obligations of importers');
  const a9 = corps(a, 'Article 9', 'Obligations of distributors'), a15 = corps(a, 'Article 15', 'EU declaration'), a17 = corps(a, 'Article 17', 'Rules and conditions');
  add('lvd-art1', a, 'Article 1, second paragraph (scope)', de(a1, 'This Directive shall apply to'), 'This Directive shall apply to electrical equipment designed for use with a voltage rating');
  add('lvd-art2-1', a, 'Article 2, point (1)', de(a2, '(1)', '(2)'), '(1) ‘making available on the market’');
  add('lvd-art2-2', a, 'Article 2, point (2)', de(a2, '(2)', '(3)'), '(2) ‘placing on the market’');
  add('lvd-art2-3', a, 'Article 2, point (3)', de(a2, '(3)', '(4)'), '(3) ‘manufacturer’');
  add('lvd-art2-5', a, 'Article 2, point (5)', de(a2, '(5)', '(6)'), '(5) ‘importer’');
  add('lvd-art2-6', a, 'Article 2, point (6)', de(a2, '(6)', '(7)'), '(6) ‘distributor’');
  add('lvd-art3', a, 'Article 3, first paragraph', de(corps(a, 'Article 3', 'Making available'), 'Electrical equipment may be made available'), 'Electrical equipment may be made available on the Union market only if');
  add('lvd-art6-1', a, 'Article 6(1)', par(a6, 1), '1. When placing their electrical equipment on the market, manufacturers shall ensure');
  add('lvd-art6-2', a, 'Article 6(2)', par(a6, 2), '2. Manufacturers shall draw up the technical documentation');
  add('lvd-art6-3', a, 'Article 6(3)', par(a6, 3), '3. Manufacturers shall keep the technical documentation');
  add('lvd-art6-5', a, 'Article 6(5)', par(a6, 5), '5. Manufacturers shall ensure that electrical equipment which they have placed on the market bears a type');
  add('lvd-art6-6', a, 'Article 6(6)', par(a6, 6), '6. Manufacturers shall indicate on the electrical equipment their name');
  add('lvd-art6-7', a, 'Article 6(7)', par(a6, 7), '7. Manufacturers shall ensure that the electrical equipment is accompanied by instructions');
  add('lvd-art8-2', a, 'Article 8(2), first subparagraph', par(a8, 2).slice(0, 2), '2. Before placing electrical equipment on the market importers shall ensure');
  add('lvd-art8-3', a, 'Article 8(3)', par(a8, 3), '3. Importers shall indicate on the electrical equipment their name');
  add('lvd-art8-4', a, 'Article 8(4)', par(a8, 4), '4. Importers shall ensure that the electrical equipment is accompanied by instructions');
  add('lvd-art8-8', a, 'Article 8(8)', par(a8, 8), '8. Importers shall, for 10 years');
  add('lvd-art9-2', a, 'Article 9(2), first subparagraph', par(a9, 2).slice(0, 2), '2. Before making electrical equipment available on the market distributors shall verify');
  add('lvd-art10', a, 'Article 10', corps(a, 'Article 10', 'Cases in which'), 'An importer or distributor shall be considered a manufacturer');
  add('lvd-art15-2', a, 'Article 15(2)', par(a15, 2), '2. The EU declaration of conformity shall have the model structure set out in Annex IV');
  add('lvd-art15-3', a, 'Article 15(3)', par(a15, 3), '3. Where electrical equipment is subject to more than one Union act');
  add('lvd-art15-4', a, 'Article 15(4)', par(a15, 4), '4. By drawing up the EU declaration of conformity, the manufacturer shall assume responsibility');
  add('lvd-art17-1', a, 'Article 17(1)', par(a17, 1), '1. The CE marking shall be affixed visibly, legibly and indelibly');
  add('lvd-annex2', a, 'Annex II (equipment and phenomena outside the scope)', corps(a, 'ANNEX II', 'EQUIPMENT AND PHENOMENA'), 'Electrical equipment for use in an explosive atmosphere');
  const m = corps(a, 'ANNEX III', 'MODULE A');
  add('lvd-annex3-2', a, 'Annex III, Module A, point 2 (technical documentation)', par(m, 2), '2. Technical documentation The manufacturer shall establish the technical documentation.');
  add('lvd-annex4', a, 'Annex IV (model of the EU declaration of conformity), points 1 to 7', de(corps(a, 'ANNEX IV', 'EU DECLARATION'), '1. Product model', 'Signed for'), '1. Product model/product');
}

// ---- EMC Directive 2014/30/EU ------------------------------------------------------------------
{
  const a = EMC, a2 = corps(a, 'Article 2', 'Scope'), a3 = corps(a, 'Article 3', 'Definitions');
  const a7 = corps(a, 'Article 7', 'Obligations of manufacturers'), a9 = corps(a, 'Article 9', 'Obligations of importers');
  const a10 = corps(a, 'Article 10', 'Obligations of distributors'), a15 = corps(a, 'Article 15', 'EU declaration'), a17 = corps(a, 'Article 17', 'Rules and conditions');
  add('emc-art2-1', a, 'Article 2(1) (scope)', par(a2, 1), '1. This Directive shall apply to equipment as defined in Article 3.');
  add('emc-art3-1-1', a, 'Article 3(1), point (1)', de(a3, '(1)', '(2)'), '(1) ‘equipment’ means any apparatus or fixed installation;');
  add('emc-art3-1-2', a, 'Article 3(1), point (2)', de(a3, '(2)', '(3)'), '(2) ‘apparatus’ means any finished appliance');
  add('emc-art6', a, 'Article 6', corps(a, 'Article 6', 'Essential requirements'), 'The equipment shall meet the essential requirements set out in Annex I.');
  add('emc-art7-2', a, 'Article 7(2)', par(a7, 2), '2. Manufacturers shall draw up the technical documentation');
  add('emc-art7-6', a, 'Article 7(6)', par(a7, 6), '6. Manufacturers shall indicate, on the apparatus, their name');
  add('emc-art7-7', a, 'Article 7(7)', par(a7, 7), '7. Manufacturers shall ensure that the apparatus is accompanied by instructions');
  add('emc-art9-2', a, 'Article 9(2), first subparagraph', par(a9, 2).slice(0, 2), '2. Before placing apparatus on the market importers shall ensure');
  add('emc-art9-3', a, 'Article 9(3)', par(a9, 3), '3. Importers shall indicate on the apparatus their name');
  add('emc-art10-2', a, 'Article 10(2), first subparagraph', par(a10, 2).slice(0, 2), '2. Before making apparatus available on the market distributors shall verify');
  add('emc-art11', a, 'Article 11', corps(a, 'Article 11', 'Cases in which'), 'An importer or distributor shall be considered a manufacturer');
  add('emc-art14', a, 'Article 14, first paragraph', de(corps(a, 'Article 14', 'Conformity assessment'), 'Compliance of apparatus', 'The manufacturer may choose'), 'Compliance of apparatus with the essential requirements set out in Annex I shall be demonstrated');
  add('emc-art15-2', a, 'Article 15(2)', par(a15, 2), '2. The EU declaration of conformity shall have the model structure set out in Annex IV');
  add('emc-annex1-1', a, 'Annex I, point 1 (general requirements)', par(corps(a, 'ANNEX I', 'ESSENTIAL REQUIREMENTS'), 1), '1. General requirements');
}

// ---- RoHS Directive 2011/65/EU -----------------------------------------------------------------
{
  const a = ROHS, a3 = corps(a, 'Article 3', 'Definitions'), a7 = corps(a, 'Article 7', 'Obligations of manufacturers');
  const a9 = corps(a, 'Article 9', 'Obligations of importers'), a13 = corps(a, 'Article 13', 'EU declaration');
  add('rohs-art2-1', a, 'Article 2(1) (scope)', par(corps(a, 'Article 2', 'Scope'), 1, '3.'), '1. This Directive shall, subject to paragraph 2, apply to EEE falling within the categories set out in Annex I.');
  add('rohs-art3-1', a, 'Article 3, point (1)', de(a3, '(1)', '(2)'), '(1) ‘electrical and electronic equipment’ or ‘EEE’ means');
  add('rohs-art4-1', a, 'Article 4(1)', par(corps(a, 'Article 4', 'Prevention'), 1), '1. Member States shall ensure that EEE placed on the market');
  add('rohs-art7-c', a, 'Article 7, point (c)', de(a7, '(c)', '(d)'), '(c) where compliance of EEE with the applicable requirements has been demonstrated');
  add('rohs-art7-d', a, 'Article 7, point (d)', de(a7, '(d)', '(e)'), '(d) manufacturers keep the technical documentation and the EU declaration of conformity for 10 years');
  add('rohs-art7-h', a, 'Article 7, point (h)', de(a7, '(h)', '(i)'), '(h) manufacturers indicate their name');
  add('rohs-art9-d', a, 'Article 9, point (d)', de(a9, '(d)', '(e)'), '(d) importers indicate their name');
  add('rohs-art9-g', a, 'Article 9, point (g)', de(a9, '(g)', '(h)'), '(g) importers keep, for 10 years');
  add('rohs-art10-a', a, 'Article 10, introductory words and point (a)', de(corps(a, 'Article 10', 'Obligations of distributors'), 'Member States shall ensure that:', '(b)'), 'Member States shall ensure that: (a) when making an EEE available on the market, distributors act with due care');
  add('rohs-art11', a, 'Article 11', corps(a, 'Article 11', 'Cases in which'), 'Member States shall ensure that an importer or distributor is considered a manufacturer');
  add('rohs-art13-2', a, 'Article 13(2), first subparagraph', par(a13, 2).slice(0, 2), '2. The EU declaration of conformity shall have the model structure');
  add('rohs-annex1', a, 'Annex I (categories of EEE covered)', corps(a, 'ANNEX I', 'Categories of EEE'), '1. Large household appliances.');
  add('rohs-annex2', a, 'Annex II (restricted substances and maximum concentration values), list', de(corps(a, 'ANNEX II', 'Restricted substances'), 'Lead (0,1 %)', 'The restriction of DEHP'), 'Lead (0,1 %) Mercury (0,1 %) Cadmium (0,01 %)');
}

// ---- Ecodesign: Regulation (EU) 2019/1782, its framework Directive 2009/125/EC, and what replaces them ----
{
  const a = EPS, a1 = corps(a, 'Article 1', 'Subject matter'), a2 = corps(a, 'Article 2', 'Definitions'), a4 = corps(a, 'Article 4', 'Conformity assessment');
  const x1 = corps(a, 'ANNEX I', 'List of electrical'), x2 = corps(a, 'ANNEX II', 'Ecodesign requirements');
  add('eps-art1-1', a, 'Article 1(1) (subject matter)', par(a1, 1), '1. This Regulation establishes ecodesign requirements for the placing on the market or putting into service of external power supplies.');
  add('eps-art1-2', a, 'Article 1(2) (exclusions)', par(a1, 2), '2. This Regulation shall not apply to: (a) voltage converters;');
  add('eps-art2-1', a, 'Article 2, point (1) (definition of external power supply)', de(a2, '(1)', '(2)'), '(1) ‘external power supply’ means a device which meets all of the following criteria:');
  add('eps-art4-1', a, 'Article 4(1)', par(a4, 1), '1. The conformity assessment procedure referred to in Article 8 of Directive 2009/125/EC');
  add('eps-art4-2', a, 'Article 4(2)', par(a4, 2), '2. For the purposes of the conformity assessment pursuant to Article 8 of Directive 2009/125/EC, the technical documentation shall contain');
  add('eps-art9', a, 'Article 9, first and second paragraphs (entry into force and application)', de(corps(a, 'Article 9', 'Entry into force'), 'This Regulation shall enter into force', 2), 'This Regulation shall enter into force on the twentieth day');
  add('eps-annex1-2', a, 'Annex I, point 2', de(x1, 'Information technology equipment, including'), 'Information technology equipment, including copying and printing equipment');
  add('eps-annex2-1a', a, 'Annex II, point 1(a) (no-load power consumption; table read row by row: AC-AC, AC-DC, low voltage, multiple voltage output)', de(x2, 'from 1 April 2020, the no-load condition power consumption', '(b)'), 'from 1 April 2020, the no-load condition power consumption shall not exceed the following values:');
  add('eps-annex2-1b', a, 'Annex II, point 1(b) (average active efficiency; table read row by row: AC-AC, AC-DC, low voltage, multiple voltage output)', de(x2, 'from 1 April 2020, the average active efficiency', '2. Information requirements'), 'from 1 April 2020, the average active efficiency shall be not less than the following values:');
  add('eps-annex2-2a', a, 'Annex II, point 2(a) (nameplate information), introductory words', de(x2, 'from 1 April 2020, the nameplate shall include'), 'from 1 April 2020, the nameplate shall include the following information:');
  add('eps-annex2-2b', a, 'Annex II, point 2(b) (instruction manuals and free access websites), introductory words', de(x2, 'from 1 April 2020, instruction manuals'), 'from 1 April 2020, instruction manuals for end-users (where applicable), and free access websites');
  add('eps-annex2-2c', a, 'Annex II, point 2(c) (technical documentation), introductory words', de(x2, 'from 1 April 2020, the technical documentation'), 'from 1 April 2020, the technical documentation for the purposes of conformity assessment');
}
{
  const a = ECO, a2 = corps(a, 'Article 2', 'Definitions'), a5 = corps(a, 'Article 5', 'Marking'), a8 = corps(a, 'Article 8', 'Conformity assessment');
  add('eco-art2-6', a, 'Article 2, point 6', par(a2, 6), '6. ‘Manufacturer’ means');
  add('eco-art3-1', a, 'Article 3(1)', par(corps(a, 'Article 3', 'Placing on the market'), 1), '1. Member States shall take all appropriate measures to ensure that products covered by implementing measures may be placed on the market');
  add('eco-art4', a, 'Article 4 (responsibilities of the importer)', corps(a, 'Article 4', 'Responsibilities of the importer'), 'Where the manufacturer is not established within the Community and in the absence of an authorised representative, the importer shall have the following obligations:');
  add('eco-art5-1', a, 'Article 5(1)', par(a5, 1), '1. Before a product covered by implementing measures is placed on the market and/or put into service, a CE marking shall be affixed');
  add('eco-art5-3', a, 'Article 5(3)', par(a5, 3), '3. The EC declaration of conformity shall contain the elements specified in Annex VI');
  add('eco-art8-3', a, 'Article 8(3)', par(a8, 3), '3. After placing a product covered by implementing measures on the market');
  add('eco-annex4-2', a, 'Annex IV (internal design control), point 2', de(corps(a, 'ANNEX IV', 'Internal design control'), '2. A technical documentation file', '3. The manufacturer'), '2. A technical documentation file making possible an assessment');
  add('eco-annex6', a, 'Annex VI (EC declaration of conformity)', de(corps(a, 'ANNEX VI', 'EC declaration'), 'The EC declaration of conformity must contain', null), 'The EC declaration of conformity must contain the following elements:');
}
{
  const a = ESPR, a79 = corps(a, 'Article 79', 'Repeal and transitional');
  add('espr-art79-1', a, 'Article 79(1), introductory words', par(a79, 1).slice(0, 2), '1. Directive 2009/125/EC is repealed with effect from 18 July 2024, with the exception of:');
  add('espr-art79-1-b', a, 'Article 79(1), point (b)', de(a79, '(b)', 'Point (b) of this paragraph'), '(b) Article 1(3), Article 2, Article 3(1), Articles 4, 5 and 8');
}
{
  const a = EPS2;
  add('eps2-art1-1', a, 'Article 1(1) (subject matter)', par(corps(a, 'Article 1', 'Subject matter'), 1), '1. This Regulation lays down ecodesign requirements for the placing on the market or putting into service of external power supplies (EPS)');
  add('eps2-art8', a, 'Article 8 (repeal of Regulation (EU) 2019/1782)', corps(a, 'Article 8', 'Repeal'), 'Regulation (EU) 2019/1782 is repealed with effect from 14 December 2028');
  add('eps2-art9-3', a, 'Article 9(3)', par(corps(a, 'Article 9', 'Transitional'), 3), '3. EPS placed on the market between 14 December 2025 and 14 December 2028');
  add('eps2-art10', a, 'Article 10, first and second paragraphs (entry into force and application)', de(corps(a, 'Article 10', 'Entry into force'), 'This Regulation shall enter into force', 2), 'This Regulation shall enter into force on the twentieth day');
}

// ---- WEEE Directive 2012/19/EU -----------------------------------------------------------------
{
  const a = WEEE, a2 = corps(a, 'Article 2', 'Scope'), a3 = corps(a, 'Article 3', 'Definitions'), a16 = corps(a, 'Article 16', 'Registration');
  add('weee-art2-1-b', a, 'Article 2(1), point (b) (scope from 15 August 2018)', de(a2, '(b)', '2.'), '(b) from 15 August 2018, subject to paragraphs 3 and 4, to all EEE.');
  add('weee-art3-1-a', a, 'Article 3(1), point (a)', de(a3, '(a)', '(b)'), '(a) ‘electrical and electronic equipment’ or ‘EEE’ means');
  add('weee-art3-1-f', a, 'Article 3(1), point (f) (definition of producer)', de(a3, '(f)', '(g)'), '(f) ‘producer’ means any natural or legal person who, irrespective of the selling technique used');
  add('weee-art12-1', a, 'Article 12(1), introductory words', par(corps(a, 'Article 12', 'Financing in respect of WEEE from private households'), 1).slice(0, 2), '1. Member States shall ensure that producers provide at least for the financing');
  add('weee-art14-4', a, 'Article 14(4) (marking with the crossed-out wheeled bin)', par(corps(a, 'Article 14', 'Information for users'), 4), '4. With a view to minimising the disposal of WEEE as unsorted municipal waste');
  add('weee-art16-1', a, 'Article 16(1), first subparagraph', par(a16, 1).slice(0, 2), '1. Member States shall, in accordance with paragraph 2, draw up a register of producers');
  add('weee-art16-2-a', a, 'Article 16(2), introductory words and point (a)', de(a16, '2.', '(b)'), '2. Member States shall ensure that: (a) each producer, or each authorised representative');
  add('weee-annex3-6', a, 'Annex III, category 6', de(corps(a, 'ANNEX III', 'CATEGORIES OF EEE'), '6. Small IT'), '6. Small IT and telecommunication equipment');
  add('weee-annex9', a, 'Annex IX (symbol for the marking of EEE), first sentences', de(corps(a, 'ANNEX IX', 'SYMBOL'), 'The symbol indicating separate collection'), 'The symbol indicating separate collection for EEE consists of the crossed-out wheeled bin');
}

// ---- Market Surveillance Regulation (EU) 2019/1020 ---------------------------------------------
{
  const a = MSR, a3 = corps(a, 'Article 3', 'Definitions'), a4 = corps(a, 'Article 4', 'Tasks of economic operators');
  add('msr-art4-1', a, 'Article 4(1)', par(a4, 1), '1. Notwithstanding any obligations set out in applicable Union harmonisation legislation, a product subject to legislation referred to in paragraph 5 may be placed on the market only if');
  add('msr-art4-2', a, 'Article 4(2)', par(a4, 2), '2. For the purposes of this Article, the economic operator referred to in paragraph 1 means any of the following:');
  add('msr-art4-3', a, 'Article 4(3)', par(a4, 3), '3. Without prejudice to any obligations of economic operators under the applicable Union harmonisation legislation, the economic operator referred to in paragraph 1 shall perform the following tasks:');
  add('msr-art4-4', a, 'Article 4(4)', par(a4, 4), '4. Without prejudice to the respective obligations of economic operators');
  add('msr-art4-5', a, 'Article 4(5) (the figures in brackets are footnote references of the source)', par(a4, 5), '5. This Article applies only in relation to products that are subject to');
  add('msr-art6', a, 'Article 6 (distance sales)', corps(a, 'Article 6', 'Distance sales'), 'Products offered for sale online or through other means of distance sales shall be deemed to be made available on the market');
  add('msr-art44', a, 'Article 44, second paragraph (application)', de(corps(a, 'Article 44', 'Entry into force'), 'It shall apply from'), 'It shall apply from 16 July 2021.');
}

// ---- General Product Safety Regulation (EU) 2023/988 -------------------------------------------
{
  const a = GPSR, a2 = corps(a, 'Article 2', 'Scope'), a3 = corps(a, 'Article 3', 'Definitions'), a20 = corps(a, 'Article 20', 'Obligations of economic operators in the case of accidents');
  add('gpsr-art2-1', a, 'Article 2(1), first to third subparagraphs, with point (a)', de(a2, '1.', '(b)'), '1. This Regulation applies to products that are placed or made available on the market insofar as there are no specific provisions');
  add('gpsr-art2-1-b', a, 'Article 2(1), third subparagraph, point (b)', de(a2, '(b)', '2.'), '(b) Chapter IIa, Chapter III, Section 1, Chapters V and VII and Chapters IX to XI do not apply.');
  add('gpsr-art3-27', a, 'Article 3, point (27)', de(a3, '(27)', '(28)'), '(27) ‘Union harmonisation legislation’ means');
  add('gpsr-art4', a, 'Article 4 (distance sales)', corps(a, 'Article 4', 'Distance sales'), 'Products offered for sale online or through other means of distance sales shall be deemed to be made available on the market');
  add('gpsr-art19', a, 'Article 19 (information in the offer in the case of distance sales)', corps(a, 'Article 19', 'Obligations of economic operators in the case of distance sales'), 'Where economic operators make products available on the market online or through other means of distance sales, the offer of those products shall clearly and visibly indicate');
  add('gpsr-art20-3', a, 'Article 20(3)', par(a20, 3), '3. The importers and the distributors which have knowledge of an accident');
  add('gpsr-art21', a, 'Article 21 (information in electronic format)', corps(a, 'Article 21', 'Information in electronic format'), 'Without prejudice to Article 9(5), (6) and (7), Article 11(3) and Article 16(3)');
  add('gpsr-art52', a, 'Article 52, second paragraph (application)', de(corps(a, 'Article 52', 'Entry into force'), 'It shall apply from'), 'It shall apply from 13 December 2024.');
}

// ---- Radio Equipment Directive 2014/53/EU and its common charger amendment ---------------------
{
  const a = RED, a1 = corps(a, 'Article 1', 'Subject matter'), a3a = corps(a, 'Article 3a', 'Possibility for consumers');
  add('red-art1-4', a, 'Article 1(4)', par(a1, 4), '4. Radio equipment falling within the scope of this Directive shall not be subject to Directive 2014/35/EU');
  add('red-art2-1-1', a, 'Article 2(1), point (1) (definition of radio equipment)', de(corps(a, 'Article 2', 'Definitions'), '(1)', '(2)'), '(1) ‘radio equipment’ means an electrical or electronic product, which intentionally emits and/or receives radio waves');
  add('red-art3-4', a, 'Article 3(4), first subparagraph', par(corps(a, 'Article 3', 'Essential requirements'), 4).slice(0, 2), '4. Radio equipment falling within the categories or classes specified in Part I of Annex Ia');
  add('red-art3a-1', a, 'Article 3a(1)', par(a3a, 1), '1. Where an economic operator offers to consumers and other end-users the possibility to acquire the radio equipment referred to in Article 3(4) together with a charging device');
  add('red-art3a-2', a, 'Article 3a(2), first subparagraph', par(a3a, 2).slice(0, 2), '2. Economic operators shall ensure that the information on whether or not a charging device is included');
  add('red-annex1a-1', a, 'Annex Ia, Part I, point 1 (categories of radio equipment concerned)', de(corps(a, 'ANNEX Ia', 'SPECIFICATIONS AND INFORMATION'), '1. The requirements set out in points 2 and 3', '2. In so far as'), '1. The requirements set out in points 2 and 3 of this Part shall apply to the following categories or classes of radio equipment:');
  add('cc-art2-1', CC, 'Article 2(1), second subparagraph (dates of application)', de(corps(CC, 'Article 2', null), 'They shall apply those measures from'), 'They shall apply those measures from 28 December 2024');
}

// ---- Provisions added after the legal review and the case review of 2026-10-04 -------------------
// (essais/conformite/revue-droit.json, revue-cas.json). Same rule: copied from the downloaded acts, never typed.
{
  const a = LVD;
  add('lvd-art11', a, 'Article 11 (identification of economic operators)', corps(a, 'Article 11', 'Identification of economic operators'), 'Economic operators shall, on request, identify the following to the market surveillance authorities:');
}
{
  const a = EMC, a2 = corps(a, 'Article 2', 'Scope'), a3 = corps(a, 'Article 3', 'Definitions'), a7 = corps(a, 'Article 7', 'Obligations of manufacturers');
  add('emc-art2-2-a', a, 'Article 2(2), introductory words and point (a)', par(a2, 2).slice(0, 4), '2. This Directive shall not apply to: (a) equipment covered by Directive 1999/5/EC;');
  add('emc-art3-1-13', a, 'Article 3(1), point (13)', de(a3, '(13)', '(14)'), '(13) ‘importer’ means');
  add('emc-art3-1-14', a, 'Article 3(1), point (14)', de(a3, '(14)', '(15)'), '(14) ‘distributor’ means');
  add('emc-art7-5', a, 'Article 7(5)', par(a7, 5), '5. Manufacturers shall ensure that apparatus which they have placed on the market bear a type, batch or serial number');
  add('emc-art12', a, 'Article 12 (identification of economic operators)', corps(a, 'Article 12', 'Identification of economic operators'), 'Economic operators shall, on request, identify the following to the market surveillance authorities:');
  add('emc-art18', a, 'Article 18 (information concerning the use of apparatus)', corps(a, 'Article 18', 'Information concerning the use of apparatus'), '1. Apparatus shall be accompanied by information on any specific precautions');
}
{
  const a = ROHS, a3 = corps(a, 'Article 3', 'Definitions'), a7 = corps(a, 'Article 7', 'Obligations of manufacturers'), a9 = corps(a, 'Article 9', 'Obligations of importers');
  add('rohs-art3-8', a, 'Article 3, point (8)', de(a3, '(8)', '(9)'), '(8) ‘distributor’ means');
  add('rohs-art3-9', a, 'Article 3, point (9)', de(a3, '(9)', '(10)'), '(9) ‘importer’ means');
  add('rohs-art4-2', a, 'Article 4(2)', par(corps(a, 'Article 4', 'Prevention'), 2), '2. For the purposes of this Directive, no more than the maximum concentration value by weight in homogeneous materials');
  add('rohs-art7-intro', a, 'Article 7, introductory words (they govern every point of the Article)', a7.slice(0, 1), 'Member States shall ensure that:');
  add('rohs-art7-b', a, 'Article 7, point (b)', de(a7, '(b)', '(c)'), '(b) manufacturers draw up the required technical documentation');
  add('rohs-art7-g', a, 'Article 7, point (g)', de(a7, '(g)', '(h)'), '(g) manufacturers ensure that their EEE bears a type, batch or serial number');
  add('rohs-art9-intro', a, 'Article 9, introductory words (they govern every point of the Article)', a9.slice(0, 1), 'Member States shall ensure that:');
  // The end of point (b) ("and that the manufacturer has complied with ... points (g) and (h) of Article 7") is a corrected passage
  // carried between consolidation markers in the source: it is left out, the entry stops at the comma before it.
  add('rohs-art9-b', a, 'Article 9, point (b), up to the words "required documents" (the end of the point, a corrected passage, is not quoted)', de(a9, '(b)', 2), '(b) importers, before placing an EEE on the market, ensure that the appropriate conformity assessment procedure');
  add('rohs-art12', a, 'Article 12 (identification of economic operators)', corps(a, 'Article 12', 'Identification of economic operators'), 'Member States shall ensure that economic operators, on request, identify the following');
}
{
  const a = ECO;
  add('eco-art2-8', a, 'Article 2, point 8', par(corps(a, 'Article 2', 'Definitions'), 8), '8. ‘Importer’ means');
}
{
  const a = EPS, x1 = corps(a, 'ANNEX I', 'List of electrical'), x2 = corps(a, 'ANNEX II', 'Ecodesign requirements');
  add('eps-art3', a, 'Article 3 (ecodesign requirements)', corps(a, 'Article 3', 'Ecodesign requirements'), 'The ecodesign requirements set out in Annex II shall apply from the dates indicated therein.');
  add('eps-art8', a, 'Article 8 (repeal of Regulation (EC) No 278/2009)', corps(a, 'Article 8', 'Repeal'), 'Regulation (EC) No 278/2009 is repealed as from 1 April 2020.');
  add('eps-annex1-1', a, 'Annex I, point 1', de(x1, 'Household appliances:', '2.'), 'Household appliances:');
  add('eps-annex1-3', a, 'Annex I, point 3', de(x1, 'Consumer equipment:', '4.'), 'Consumer equipment:');
  add('eps-annex1-4', a, 'Annex I, point 4', de(x1, 'Electrical and electronic toys, leisure and sports equipment:', null), 'Electrical and electronic toys, leisure and sports equipment:');
  add('eps-annex2-2a-table', a, 'Annex II, point 2(a), table of nameplate information (read row by row: item, value and precision, unit, notes)', de(x2, 'Nameplate information', '(b)'), 'Nameplate information Value and precision Unit Notes Output power');
  add('eps-annex2-2b-table', a, 'Annex II, point 2(b), table of information published and load conditions (read row by row: item, value and precision, unit, notes)', de(x2, 'Information published', '(c)'), 'Information published Value and precision Unit Notes Manufacturer’s name or trade mark, commercial registration number and address');
  add('eps-annex2-2c-table', a, 'Annex II, point 2(c), elements of the technical documentation (tables read row by row)', de(x2, 'from 1 April 2020, the technical documentation', null), 'from 1 April 2020, the technical documentation for the purposes of conformity assessment pursuant to Article 4 shall contain the following elements: (1) for external power supplies with a nameplate output power greater than 10 watts:');
}
{
  const a = EPS2, a9 = corps(a, 'Article 9', 'Transitional');
  add('eps2-art2-1', a, 'Article 2, point (1) (definition of external power supply)', de(corps(a, 'Article 2', 'Definitions'), '(1)', '(2)'), '(1) ‘external power supply’ (EPS) means a product which is neither a battery charger nor a wireless charger');
  add('eps2-art3', a, 'Article 3 (ecodesign requirements)', corps(a, 'Article 3', 'Ecodesign requirements'), 'EPS, wireless chargers, wireless charging pads, battery chargers for portable batteries of general use and USB Type-C cables shall meet the ecodesign requirements');
  add('eps2-art9-1', a, 'Article 9(1)', par(a9, 1), '1. Annexes I, II and III to Regulation (EU) 2019/1782 shall continue to apply to spare part EPS until 14 December 2033');
  add('eps2-art9-2', a, 'Article 9(2)', par(a9, 2), '2. Point 1 of Annex II to Regulation (EU) 2019/1782 shall continue to apply to EPS with a USB-PD port');
}
{
  const a = WEEE, a3 = corps(a, 'Article 3', 'Definitions'), a17 = corps(a, 'Article 17', 'Authorised representative');
  add('weee-art3-1-h', a, 'Article 3(1), point (h)', de(a3, '(h)', '(i)'), '(h) ‘WEEE from private households’ means');
  add('weee-art17-2', a, 'Article 17(2)', par(a17, 2), '2. Each Member State shall ensure that a producer as defined in Article 3(1)(f)(iv) and established on its territory');
  add('weee-art17-3', a, 'Article 17(3)', par(a17, 3), '3. Appointment of an authorised representative shall be by written mandate.');
}
{
  const a = MSR, a3 = corps(a, 'Article 3', 'Definitions');
  add('msr-art3-8', a, 'Article 3, point (8)', de(a3, '(8)', '(9)'), '(8) ‘manufacturer’ means');
  add('msr-art3-9', a, 'Article 3, point (9)', de(a3, '(9)', '(10)'), '(9) ‘importer’ means');
  add('msr-art3-10', a, 'Article 3, point (10)', de(a3, '(10)', '(11)'), '(10) ‘distributor’ means');
  add('msr-art3-13', a, 'Article 3, point (13)', de(a3, '(13)', '(14)'), '(13) ‘economic operator’ means');
}
{
  const a = GPSR, a3 = corps(a, 'Article 3', 'Definitions'), a20 = corps(a, 'Article 20', 'Obligations of economic operators in the case of accidents');
  add('gpsr-art3-1', a, 'Article 3, point (1)', de(a3, '(1)', '(2)'), '(1) ‘product’ means any item');
  add('gpsr-art3-2', a, 'Article 3, point (2)', de(a3, '(2)', '(3)'), '(2) ‘safe product’ means');
  add('gpsr-art3-13', a, 'Article 3, point (13)', de(a3, '(13)', '(14)'), '(13) ‘economic operator’ means');
  add('gpsr-art5', a, 'Article 5 (general safety requirement)', corps(a, 'Article 5', 'General safety requirement'), 'Economic operators shall place or make available on the market only safe products.');
  add('gpsr-art20-1', a, 'Article 20(1)', par(a20, 1), '1. The manufacturer shall ensure that, through the Safety Business Gateway, an accident caused by a product');
}
{
  const a = RED, a10 = corps(a, 'Article 10', 'Obligations of manufacturers'), a12 = corps(a, 'Article 12', 'Obligations of importers'), a2 = corps(a, 'Article 2', 'Definitions');
  add('red-art2-1-12', a, 'Article 2(1), point (12)', de(a2, '(12)', '(13)'), '(12) ‘manufacturer’ means');
  add('red-art2-1-14', a, 'Article 2(1), point (14)', de(a2, '(14)', '(15)'), '(14) ‘importer’ means');
  add('red-art2-1-15', a, 'Article 2(1), point (15)', de(a2, '(15)', '(16)'), '(15) ‘distributor’ means');
  add('red-art3-1', a, 'Article 3(1)', par(corps(a, 'Article 3', 'Essential requirements'), 1), '1. Radio equipment shall be constructed so as to ensure:');
  add('red-art10-3', a, 'Article 10(3)', par(a10, 3), '3. Manufacturers shall draw up the technical documentation referred to in Article 21');
  add('red-art10-4', a, 'Article 10(4)', par(a10, 4), '4. Manufacturers shall keep the technical documentation and the EU declaration of conformity for 10 years');
  add('red-art12-2', a, 'Article 12(2), first subparagraph', par(a12, 2).slice(0, 2), '2. Before placing radio equipment on the market importers shall ensure');
  add('red-art12-3', a, 'Article 12(3)', par(a12, 3), '3. Importers shall indicate on the radio equipment their name');
  add('red-art13-2', a, 'Article 13(2), first subparagraph', par(corps(a, 'Article 13', 'Obligations of distributors'), 2).slice(0, 2), '2. Before making radio equipment available on the market distributors shall verify');
  add('red-art50', a, 'Article 50 (repeal of Directive 1999/5/EC)', corps(a, 'Article 50', 'Repeal'), 'Directive 1999/5/EC is repealed with effect from 13 June 2016.');
}
{
  const a = BAT, a38 = corps(a, 'Article 38', 'Obligations of manufacturers'), a96 = corps(a, 'Article 96', 'Entry into force');
  add('bat-art1-3', a, 'Article 1(3), first subparagraph (scope)', par(corps(a, 'Article 1', 'Subject matter and scope'), 3).slice(0, 2), '3. This Regulation applies to all categories of batteries');
  add('bat-art3-1-1', a, 'Article 3(1), point (1) (definition of battery)', de(corps(a, 'Article 3', 'Definitions'), '(1)', '(2)'), '(1) ‘battery’ means any device delivering electrical energy generated by direct conversion of chemical energy');
  add('bat-art18-3', a, 'Article 18(3)', par(corps(a, 'Article 18', 'EU declaration'), 3), '3. Where a battery is subject to more than one Union act requiring an EU declaration of conformity');
  add('bat-art38-2', a, 'Article 38(2)', par(a38, 2), '2. Before placing a battery on the market or putting it into service, manufacturers shall draw up the technical documentation');
  add('bat-art38-3', a, 'Article 38(3)', par(a38, 3), '3. Where compliance of a battery with the applicable requirements has been demonstrated');
  add('bat-art41-2-ab', a, 'Article 41(2), introductory words and points (a) and (b)', de(corps(a, 'Article 41', 'Obligations of importers'), '2.', '(c)'), '2. Before placing a battery on the market, importers shall verify that:');
  add('bat-art42-2-ab', a, 'Article 42(2), introductory words and points (a) and (b)', de(corps(a, 'Article 42', 'Obligations of distributors'), '2.', '(c)'), '2. Before making a battery available on the market, distributors shall verify that:');
  add('bat-art44-a', a, 'Article 44, introductory words and point (a)', de(corps(a, 'Article 44', 'Case in which'), 'An importer or distributor shall be considered a manufacturer', '(b)'), 'An importer or distributor shall be considered a manufacturer for the purposes of this Regulation');
  add('bat-art96-2', a, 'Article 96(2), first subparagraph (application)', par(a96, 2).slice(0, 2), '2. It shall apply from 18 February 2024');
  add('bat-art96-2-b', a, 'Article 96(2), second subparagraph, point (b)', de(a96, '(b)', '(c)'), '(b) Article 17 and Chapter VI shall apply from 18 August 2024');
}

writeFileSync(new URL('../../public/data/textes-conformite.json', ici), JSON.stringify(out, null, 2) + '\n');
const parActe = {};
for (const e of out) parActe[e.celex] = (parActe[e.celex] || 0) + 1;
console.log(`${out.length} entries written to public/data/textes-conformite.json`);
console.log(Object.entries(parActe).map(([c, n]) => `${c}: ${n}`).join(' | '));
