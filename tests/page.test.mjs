import test from 'node:test';
import assert from 'node:assert/strict';
import { ipPrivee, adresseAcceptee, extrairePage, lirePage, decoder } from '../lib/page.mjs';

const HTML = `<!doctype html><html><head><title>Station USB-C | Boutique</title>
<meta property="og:image" content="/img/dock.jpg"><meta name="description" content="Meta description">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Shop"},{"@type":"Product","name":"Station d&#39;accueil USB-C 8-en-1","description":"Station <b>aluminium</b>, 100 W","sku":"DOCK-PRO","gtin13":"3760000000001","brand":{"@type":"Brand","name":"Acme"},"additionalProperty":[{"name":"Ports","value":"2 x USB-A, HDMI, RJ45"}]}]}</script>
<script type="application/ld+json">{ cassé </script></head>
<body><nav>Menu Accueil</nav><h1>Station</h1><table><tr><th>Poids</th><td>310 g</td></tr><tr><th>Ports</th><td>doublon</td></tr></table><dl><dt>Tension</dt><dd>20 V</dd></dl><script>var x=1</script><p>Livrée&nbsp;avec câble.</p></body></html>`;

test('adresses privées refusées, publiques acceptées', () => {
  for (const ip of ['127.0.0.1', '10.2.3.4', '172.20.0.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1', '100.64.0.1']) assert.equal(ipPrivee(ip), true, ip);
  for (const ip of ['8.8.8.8', '151.101.1.69', '2606:4700::1111']) assert.equal(ipPrivee(ip), false, ip);
});

test('adresse : protocole, identifiants, port et hôte vérifiés', () => {
  assert.equal(adresseAcceptee('https://shop.example.com/p/1').hostname, 'shop.example.com');
  assert.throws(() => adresseAcceptee('file:///etc/passwd'), /http/);
  assert.throws(() => adresseAcceptee('https://user:pw@example.com'), /identifiants/);
  assert.throws(() => adresseAcceptee('https://example.com:8080/'), /port/);
  assert.throws(() => adresseAcceptee('http://localhost/'), /local/);
  assert.throws(() => adresseAcceptee('http://169.254.169.254/latest'), /privé/);
  assert.throws(() => adresseAcceptee('http://intranet/'), /privé/);
  assert.throws(() => adresseAcceptee('pas une adresse'), /illisible/);
});

test('entités HTML décodées', () => {
  assert.equal(decoder('d&#39;accueil &amp; câble&nbsp;2&#x20AC;'), "d'accueil & câble 2€");
});

test('extraction : schema.org Product, caractéristiques sans doublon, texte visible sans script ni menu', () => {
  const p = extrairePage(HTML, 'https://www.shop.example.com/p/dock');
  assert.equal(p.titre, "Station d'accueil USB-C 8-en-1");
  assert.equal(p.description, 'Station aluminium, 100 W');
  assert.equal(p.sku, 'DOCK-PRO');
  assert.equal(p.gtin, '3760000000001');
  assert.equal(p.marque, 'Acme');
  assert.equal(p.domaine, 'shop.example.com');
  assert.equal(p.image, 'https://www.shop.example.com/img/dock.jpg');
  assert.deepEqual(p.caracteristiques, [{ nom: 'Ports', valeur: '2 x USB-A, HDMI, RJ45' }, { nom: 'Poids', valeur: '310 g' }, { nom: 'Tension', valeur: '20 V' }]);
  assert.match(p.texte, /Livrée avec câble\./);
  assert.doesNotMatch(p.texte, /var x|Menu Accueil/);
  assert.equal(p.schema_produit, true);
});

test('tableaux de confidentialité ou de livraison : ignorés comme caractéristiques', () => {
  const html = '<html><body><table><tr><th>Commercial information</th><td>Purchase history</td></tr><tr><th>Geolocation data</th><td>Approximate location from IP address</td></tr><tr><th>Matière</th><td>Laine mérinos</td></tr><tr><th>Livraison</th><td>Gratuite dès 50 €</td></tr></table></body></html>';
  assert.deepEqual(extrairePage(html, 'https://a.example.org/').caracteristiques, [{ nom: 'Matière', valeur: 'Laine mérinos' }]);
});

test('sans données structurées : titre et description des balises meta', () => {
  const p = extrairePage('<html><head><title>Gourde inox</title><meta property="og:description" content="750 ml, double paroi"></head><body>x</body></html>', 'https://a.example.org/');
  assert.equal(p.titre, 'Gourde inox');
  assert.equal(p.description, '750 ml, double paroi');
  assert.equal(p.schema_produit, false);
});

const reponse = (corps, { status = 200, type = 'text/html; charset=utf-8', location } = {}) => new Response(corps, { status, headers: { 'content-type': type, ...(location ? { location } : {}) } });
const dnsPublic = async () => [{ address: '93.184.216.34', family: 4 }];

test('lecture : une redirection vers une adresse privée est refusée', async () => {
  const fetchImpl = async () => reponse('', { status: 302, location: 'http://127.0.0.1/admin' });
  await assert.rejects(lirePage({ url: 'https://shop.example.com/p' }, { fetchImpl, lookup: dnsPublic }), /privé/);
});

test('lecture : un nom qui se résout en adresse privée est refusé', async () => {
  const lookup = async () => [{ address: '10.0.0.5', family: 4 }];
  await assert.rejects(lirePage({ url: 'https://interne.example.com/' }, { fetchImpl: async () => reponse(HTML), lookup }), /privé/);
});

test('lecture : autre chose qu\'une page web est refusé, une page est lue', async () => {
  await assert.rejects(lirePage({ url: 'https://shop.example.com/f.pdf' }, { fetchImpl: async () => reponse('%PDF', { type: 'application/pdf' }), lookup: dnsPublic }), /pas une page web/);
  const p = await lirePage({ url: 'https://shop.example.com/p' }, { fetchImpl: async () => reponse(HTML), lookup: dnsPublic });
  assert.equal(p.sku, 'DOCK-PRO');
});

test('lecture : une boutique qui refuse les robots est signalée, sans contournement', async () => {
  await assert.rejects(lirePage({ url: 'https://shop.example.com/p' }, { fetchImpl: async () => reponse('Forbidden', { status: 403 }), lookup: dnsPublic }), /refuse les lectures automatiques \(403\)/);
});

test('lecture : page trop lourde refusée', async () => {
  const gros = '<html><body>' + 'x'.repeat(5_100_000) + '</body></html>';
  await assert.rejects(lirePage({ url: 'https://shop.example.com/p' }, { fetchImpl: async () => reponse(gros), lookup: dnsPublic }), /trop lourde/);
});
