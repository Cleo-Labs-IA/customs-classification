import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lireCsv, detecterFormat, versCommandes, codePays } from '../public/app/csv.js';
import { normaliserClassification } from '../public/app/classification.js';

test('CSV : guillemets, guillemets doublés, retour à la ligne dans un champ, CRLF, BOM', () => {
  const t = '﻿a,b,c\r\n1,"x, y","dit ""oui"""\r\n2,"ligne\nsuivante",3\r\n\r\n';
  assert.deepEqual(lireCsv(t), [['a', 'b', 'c'], ['1', 'x, y', 'dit "oui"'], ['2', 'ligne\nsuivante', '3']]);
});

test('CSV : séparateur point-virgule détecté sur l\'en-tête', () => {
  assert.deepEqual(lireCsv('pays;produit\nFR;Lampe'), [['pays', 'produit'], ['FR', 'Lampe']]);
});

test('format détecté sur les en-têtes', () => {
  assert.equal(detecterFormat(['Name', 'Email', 'Lineitem name', 'Shipping Country']), 'shopify');
  assert.equal(detecterFormat(['Sale Date', 'Item Name', 'Ship Country', 'Order ID']), 'etsy');
  assert.equal(detecterFormat(['Produit', 'Pays']), 'generique');
});

test('pays : code à deux lettres ou nom en français ou en anglais', () => {
  assert.equal(codePays('us'), 'US');
  assert.equal(codePays('United States'), 'US');
  assert.equal(codePays('Royaume-Uni'), 'GB');
  assert.equal(codePays('Corée du Sud'), 'KR');
  assert.equal(codePays('Atlantide'), null);
});

test('Shopify : les lignes suivantes d\'une commande héritent du pays et du statut', () => {
  const csv = 'Name,Created at,Currency,Fulfillment Status,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku,Shipping Name,Shipping Country\n'
    + '#1001,2026-10-03,EUR,unfulfilled,2,Chargeur 65 W,39.90,CHG-65W,Ada L.,JP\n'
    + '#1001,,,,1,Câble HDMI,12.50,HDMI-2M,,\n'
    + '#1002,2026-10-03,EUR,fulfilled,1,Chargeur 65 W,39.90,CHG-65W,Bo K.,US\n';
  const r = versCommandes(csv);
  assert.equal(r.format, 'shopify');
  assert.equal(r.lignes.length, 3);
  assert.deepEqual({ ...r.lignes[1] }, { commande: '#1001', date: '2026-10-03', sku: 'HDMI-2M', produit: 'Câble HDMI', quantite: 1, prixUnitaire: 12.5, devise: 'EUR', pays: 'JP', origine: 'CN', client: 'Ada L.', expedition: 'a_expedier' });
  assert.equal(r.lignes[2].expedition, 'expediee');
});

test('Etsy : pays en toutes lettres, expédiée si une date d\'envoi est présente', () => {
  const csv = 'Sale Date,Item Name,Buyer,Quantity,Price,Order ID,Date Shipped,Ship Name,Ship Country,Currency,SKU\n'
    + '10/03/26,Robot dog,bob,1,59,3311,,Bob,United States,USD,ROBO-DOG\n'
    + '10/03/26,Robot dog,eve,1,59,3312,10/04/26,Eve,Australia,USD,ROBO-DOG\n';
  const r = versCommandes(csv, { origine: 'VN' });
  assert.equal(r.format, 'etsy');
  assert.deepEqual(r.lignes.map((l) => [l.pays, l.expedition, l.origine, l.devise]), [['US', 'a_expedier', 'VN', 'USD'], ['AU', 'expediee', 'VN', 'USD']]);
});

test('ligne écartée et comptée : pays inconnu, produit absent ; SKU dérivé du nom s\'il manque', () => {
  const csv = 'commande;produit;pays;quantité;prix\nA1;Lampe de bureau;Atlantide;1;10\nA2;;FR;1;10\nA3;Lampe de bureau;France;2;10,5\n';
  const r = versCommandes(csv);
  assert.equal(r.lignes.length, 1);
  assert.equal(r.lignes[0].sku, 'LAMPE-DE-BUREAU');
  assert.equal(r.lignes[0].prixUnitaire, 10.5);
  assert.deepEqual(r.ecartees.map((e) => e.rang), [2, 3]);
  assert.match(r.ecartees[0].raison, /Atlantide/);
});

test('fichier sans colonne de pays : erreur explicite, aucune ligne', () => {
  const r = versCommandes('produit,quantite\nLampe,1\n');
  assert.equal(r.lignes.length, 0);
  assert.match(r.erreur, /pays/);
});

test('jeu de démonstration : toutes les lignes sont lues', () => {
  const r = versCommandes(readFileSync(new URL('../public/data/demo-commandes.csv', import.meta.url), 'utf8'));
  assert.equal(r.format, 'shopify');
  assert.equal(r.ecartees.length, 0);
  assert.ok(r.lignes.length >= 40);
});

test('classification : réponse réelle de l\'API ramenée au modèle du cockpit', () => {
  const rec = JSON.parse(readFileSync(new URL('../essais/avec-fait-1.json', import.meta.url), 'utf8'));
  const c = normaliserClassification(rec.body.data, { source: 'enregistree' });
  assert.equal(c.statut, 'ambiguous');
  assert.equal(c.code, '851762');
  assert.equal(c.candidats.find((x) => x.code === '851769').ecarte !== null, true);
  assert.equal(c.source, 'enregistree');
  assert.equal(normaliserClassification(null).erreur, 'réponse vide');
});

test('hors ligne : une réponse enregistrée ne sert que pour exactement les mêmes pièces', async () => {
  const { reponseEnregistree } = await import('../public/app/classification.js');
  const liste = [{ envoye: { description: 'USB-C docking station for laptop', facts: { function: 'f' } }, id: 1 }, { envoye: { description: 'USB-C docking station for laptop' }, id: 2 }];
  assert.equal(reponseEnregistree(liste, { description: '  usb-c  docking station for LAPTOP ' }).id, 2);
  assert.equal(reponseEnregistree(liste, { description: 'USB-C docking station for laptop', faits: { function: 'f' } }).id, 1);
  assert.equal(reponseEnregistree(liste, { description: 'USB-C docking station for laptop', faits: { function: 'autre' } }), null);
  assert.equal(reponseEnregistree(liste, { description: 'Laptop dock' }), null);
});
