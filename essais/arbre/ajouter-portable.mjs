// Ajoute à l'arbre la branche « ordinateur portable » (8471 30), sur des textes déjà vérifiés mot pour mot (textes.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { rejouer, verifier, evaluer } from '../../public/arbre-moteur.js';
const f = 'public/data/arbre.json', brut = readFileSync(f, 'utf8'), a = JSON.parse(brut);
const d = JSON.parse(readFileSync('public/data/decisions.json', 'utf8')), dec = d.decisions || d;
const avant = rejouer(a, dec), compte = (r) => `${r.reproduit}/${r.contredit}/${r.non_tranche}/${r.hors_perimetre} sur ${r.total}`;
const T = new Set(JSON.parse(readFileSync('public/data/textes.json', 'utf8')).map((x) => x.id));

const fp = a.criteres.find((c) => c.id === 'fonction_principale');
if (!fp.valeurs.some((v) => v.v === 'traiter_donnees')) fp.valeurs.splice(3, 0, { v: 'traiter_donnees', libelle: 'Process data itself: the product is a computer on which the user runs programs of their choice' });
const ajouter = (c) => { if (!a.criteres.some((x) => x.id === c.id)) a.criteres.push(c); };
ajouter({ id: 'programmable_librement', libelle: 'Freely programmable', question: 'Can the user install and run programs of their choice on the product (a general-purpose operating system)?', type: 'bool', aide: 'Look for the operating system on the datasheet or the label ("Notebook PC", Windows, Linux, ChromeOS). A device that only runs the function it was built for (a payment terminal, a games console, an e-reader) answers No.' });
ajouter({ id: 'portable_complet', libelle: 'Portable, complete in one unit', question: 'Is the product portable, weighing not more than 10 kg, with at least a central processing unit, a keyboard and a display in the same unit?', type: 'bool', aide: 'The three elements must be part of the product as sold. A tablet without a keyboard, a desktop tower or a mini PC sold without a screen answers No.' });
a.noeuds.q1.branches = { alimenter: 'q2', transmettre_signaux: 'q6', traiter_donnees: 'q11', porter_completer: 'q10', autre: 'h_autre', aucune_dominante: 'h_aucune' };
a.noeuds.q11 = { type: 'question', critere: 'programmable_librement', pourquoi: 'Heading 8471 covers automatic data-processing machines. Note 6(A) to Chapter 84 defines them by four capabilities, among them being freely programmed in accordance with the requirements of the user. A machine that incorporates a processor but performs a specific function other than data processing is classified by that function under note 6(E), not under heading 8471.', base: ['h8471', 'c84-n6a', 'c84-n6e', 'rgi-1'], branches: { oui: 'q12', non: 'h_fonction_propre' } };
a.noeuds.q12 = { type: 'question', critere: 'portable_complet', pourquoi: 'Within heading 8471, rule 6 classifies the machine according to the terms of the subheadings. Subheading 8471 30 names portable machines weighing not more than 10 kg that consist of at least a central processing unit, a keyboard and a display. A machine that lacks one of these elements, or is not portable, falls under the other subheadings of heading 8471.', base: ['sh847130', 'sh84714x', 'rgi-6'], branches: { oui: 'c847130', non: 'h_autre_machine' } };
a.noeuds.c847130 = { type: 'code', code: '847130', libelle: 'Portable automatic data-processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display', motif: 'A notebook computer is freely programmable by its user, so it is an automatic data-processing machine within the meaning of note 6(A) to Chapter 84. It is portable, weighs not more than 10 kg and combines a central processing unit, a keyboard and a display in one unit: these are the terms of subheading 8471 30. Its built-in radio module and its battery do not change the classification, because rule 1 classifies by the terms of the heading and the machine remains a data-processing machine.', base: ['h8471', 'c84-n6a', 'sh847130', 'rgi-1', 'rgi-6'] };
a.noeuds.h_fonction_propre = { type: 'hors_perimetre', motif: 'The product incorporates a processor but performs a specific function other than data processing: note 6(E) to Chapter 84 classifies it in the heading appropriate to that function, which this tree does not cover.', base: ['c84-n6e'] };
a.noeuds.h_autre_machine = { type: 'hors_perimetre', motif: 'The product is an automatic data-processing machine, but not a portable one with a central processing unit, a keyboard and a display in the same unit: it falls under the other subheadings of heading 8471 (8471 41, 8471 49 or 8471 50), which this tree does not decide.', base: ['h8471', 'sh84714x'] };
a.titre = 'Notebook computers, chargers, power banks, docking stations, hubs, adapters and cables for computers and phones';
a.perimetre = 'Notebook computers. ' + a.perimetre.replace(/^Notebook computers\. /, '');

for (const n of Object.values(a.noeuds)) for (const b of n.base || []) if (!T.has(b)) throw new Error('texte absent : ' + b);
const pb = verifier(a); if (pb.length) throw new Error('arbre invalide : ' + JSON.stringify(pb));
const apres = rejouer(a, dec);
console.log('rejeu avant', compte(avant), '| après', compte(apres));
if (compte(avant) !== compte(apres)) throw new Error('le rejeu sur les décisions officielles a changé');
// témoins : un portable arrive à 8471 30, une tablette sans clavier n'y arrive pas, le chargeur reste à 8504 40
const r1 = evaluer(a, { fonction_principale: 'traiter_donnees', programmable_librement: true, portable_complet: true });
const r2 = evaluer(a, { fonction_principale: 'traiter_donnees', programmable_librement: true, portable_complet: false });
const r3 = evaluer(a, { fonction_principale: 'alimenter', genere_electricite: false, batterie_integree: 'aucune', convertit_courant: 'convertisseur', prises_secteur_sortie: false });
console.log('portable →', r1.statut, r1.code, '| sans clavier →', r2.statut, r2.code || '', '| chargeur →', r3.statut, r3.code);
if (r1.code !== '847130' || r2.statut !== 'hors_perimetre' || r3.code !== '850440') throw new Error('témoin en échec');
const indent = brut.startsWith('{\n "') ? 1 : brut.startsWith('{\n  "') ? 2 : 0;
writeFileSync(f, JSON.stringify(a, null, indent) + (brut.endsWith('\n') ? '\n' : ''));
console.log('écrit :', Object.keys(a.noeuds).length, 'nœuds,', a.criteres.length, 'critères');
