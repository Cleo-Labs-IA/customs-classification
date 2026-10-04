// Construit public/data/textes.json en COPIANT les textes depuis nc2026.txt (aucun texte saisi à la main).
// Chaque entrée désigne des lignes du fichier source ; "debut" est un garde-fou qui vérifie qu'on lit bien le passage attendu.
import { readFileSync, writeFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const L = readFileSync(new URL('nc2026.txt', ici), 'utf8').split('\n');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const SOURCE = "Règlement d'exécution (UE) 2025/1926 (NC 2026)";
const URL_ = 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R1926';
const out = [];
const ajouter = (id, ref, texte) => {
  if (!texte) throw new Error('texte vide : ' + id);
  if (out.some((e) => e.id === id)) throw new Error('id en double : ' + id);
  out.push({ id, ref, texte, source: SOURCE, url: URL_ });
};
// lignes a..b (numérotation à partir de 1), avec contrôle du début
const lignes = (id, ref, a, b, debut) => {
  const t = norm(L.slice(a - 1, b).join(' '));
  if (!t.startsWith(debut)) throw new Error(`${id} : début inattendu « ${t.slice(0, 60)} »`);
  ajouter(id, ref, t);
};
// ligne du tarif : on cherche la ligne qui porte exactement le code, la désignation est la ligne suivante
const DEBUT_TARIF = 40000;
const trouver = (code) => {
  const i = L.findIndex((l, k) => k > DEBUT_TARIF && norm(l) === code);
  if (i < 0) throw new Error('code introuvable : ' + code);
  return i;
};
const position = (code) => ajouter('h' + code, 'Position ' + code, norm(L[trouver(code) + 1]));
const sousPosition = (code) => {
  const i = trouver(code), six = code.replace(/ /g, '').slice(0, 6);
  if (!L[i + 1].trim().startsWith('–')) throw new Error('désignation inattendue après ' + code);
  ajouter('sh' + six, `Sous-position ${six.slice(0, 4)} ${six.slice(4)}`, norm(L[i] + ' ' + L[i + 1]));
};
// tiret commun à plusieurs sous-positions : la ligne juste avant le code donné
const tiretCommun = (id, ref, codeSuivant) => {
  const t = L[trouver(codeSuivant) - 1].trim();
  if (!/^– [^–]/.test(t)) throw new Error('tiret commun inattendu avant ' + codeSuivant + ' : ' + t);
  ajouter(id, ref, norm(t));
};

const RGI = "Règles générales pour l'interprétation de la nomenclature combinée, règle ";
lignes('rgi-1', RGI + '1', 477, 477, 'The titles of sections');
lignes('rgi-3', RGI + '3 (phrase introductive)', 484, 484, 'When, by application');
lignes('rgi-3a', RGI + '3 a)', 485, 486, '(a) the heading which provides');
lignes('rgi-3b', RGI + '3 b)', 487, 488, '(b) mixtures, composite goods');
lignes('rgi-3c', RGI + '3 c)', 489, 490, '(c) when goods cannot');
lignes('rgi-6', RGI + '6', 500, 500, 'For legal purposes');

lignes('s16-n1', 'Section XVI, note 1', 41871, 41903, 'This section does not cover');
lignes('s16-n1g', 'Section XVI, note 1 g)', 41884, 41885, '(g) parts of general use');
lignes('s16-n1p', 'Section XVI, note 1 p)', 41900, 41901, '(p) articles of Chapter 95');
lignes('s16-n2', 'Section XVI, note 2 (phrase introductive)', 41905, 41905, 'Subject to note 1 to this section');
lignes('s16-n2a', 'Section XVI, note 2 a)', 41906, 41907, '(a) Parts which are goods');
lignes('s16-n2b', 'Section XVI, note 2 b)', 41908, 41909, '(b) Other parts, if suitable');
lignes('s16-n2c', 'Section XVI, note 2 c)', 41910, 41911, '(c) All other parts');
lignes('s16-n3', 'Section XVI, note 3', 41913, 41913, 'Unless the context otherwise requires');
lignes('s16-n4', 'Section XVI, note 4', 41915, 41915, 'Where a machine');
lignes('s16-n5', 'Section XVI, note 5', 41917, 41917, 'For the purposes of these notes');

lignes('c84-n6a', 'Chapitre 84, note 6 (A)', 41997, 42005, 'For the purposes of heading 8471');
lignes('c84-n6b', 'Chapitre 84, note 6 (B)', 42007, 42007, 'Automatic data-processing machines may be');
lignes('c84-n6c', 'Chapitre 84, note 6 (C), premier alinéa', 42009, 42015, 'Subject to paragraph (D) and (E)');
lignes('c84-n6c-al2', 'Chapitre 84, note 6 (C), deuxième alinéa', 42016, 42016, 'Separately presented units');
lignes('c84-n6c-al3', 'Chapitre 84, note 6 (C), troisième alinéa', 42017, 42017, 'However keyboards');
lignes('c84-n6d', 'Chapitre 84, note 6 (D)', 42019, 42029, 'Heading 8471 does not cover');
lignes('c84-n6d2', 'Chapitre 84, note 6 (D) (2)', 42022, 42023, '(2) apparatus for the transmission');
lignes('c84-n6e', 'Chapitre 84, note 6 (E)', 42031, 42031, 'Machines incorporating or working');
lignes('c84-n8-al1', 'Chapitre 84, note 8, premier alinéa', 42036, 42036, 'A machine which is used for more than one purpose');
lignes('c84-n8-al2', 'Chapitre 84, note 8, deuxième alinéa', 42037, 42037, 'Subject to note 2 to this chapter');

lignes('c85-n2', 'Chapitre 85, note 2', 46422, 46423, 'Headings 8501 to 8504 do not apply');
lignes('c85-n3', 'Chapitre 85, note 3', 46425, 46425, 'For the purposes of heading 8507');
lignes('c85-n5', 'Chapitre 85, note 5', 46433, 46433, 'For the purposes of heading 8517');

for (const h of ['8471', '8473', '8504', '8507', '8517', '8536', '8543', '8544']) position(h);

sousPosition('8471 30 00');
tiretCommun('sh84714x', 'Sous-positions 8471 41 et 8471 49 (tiret commun)', '8471 41 00');
for (const c of ['8471 41 00', '8471 49 00', '8471 50 00', '8471 60', '8471 70', '8471 80 00', '8473 30', '8504 40', '8507 60 00', '8507 80 00']) sousPosition(c);
tiretCommun('sh85176x', 'Sous-positions 8517 61 à 8517 69 (tiret commun)', '8517 61 00');
sousPosition('8517 62 00'); sousPosition('8517 69');
tiretCommun('sh85366x', 'Sous-positions 8536 61 et 8536 69 (tiret commun)', '8536 61');
sousPosition('8536 69'); sousPosition('8536 90'); sousPosition('8543 70');
tiretCommun('sh85444x', 'Sous-positions 8544 42 et 8544 49 (tiret commun)', '8544 42');
sousPosition('8544 42'); sousPosition('8544 49');

writeFileSync(new URL('../../public/data/textes.json', ici), JSON.stringify(out, null, 2) + '\n');
console.log(out.length + ' entrées écrites');
