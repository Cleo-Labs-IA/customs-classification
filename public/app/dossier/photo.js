// Prépare une photo dans le navigateur : JPEG redimensionné. Un HEIC que le navigateur
// ne sait pas lire est d'abord converti par la bibliothèque heic-to (chargée à la demande).
async function convertisseurHeic() {
  if (window.HeicTo) return;
  await new Promise((ok, ko) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/heic-to@1/dist/iife/heic-to.js';
    sc.onload = ok;
    sc.onerror = () => ko(new Error('convertisseur HEIC indisponible'));
    document.head.appendChild(sc);
  });
}
export async function versJpeg(fichier, cote, qualite) {
  let image;
  try { image = await createImageBitmap(fichier); }
  catch {
    await convertisseurHeic();
    image = await createImageBitmap(await window.HeicTo({ blob: fichier, type: 'image/jpeg', quality: 0.9 }));
  }
  const k = Math.min(1, cote / Math.max(image.width, image.height)), c = document.createElement('canvas');
  c.width = Math.round(image.width * k); c.height = Math.round(image.height * k);
  c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualite));
  const url = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
  return { blob, url };
}
export const estImage = (f) => f && (/^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name));
