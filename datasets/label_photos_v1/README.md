# Photos réelles d'étiquettes produits électroniques + offres Amazon.fr (v1)

51 vraies photos d'étiquettes signalétiques (dessous / dos de l'appareil : modèle, tension, origine,
FCC ID, marquages CE / FC / DEEE…), chacune associée au produit et, quand elle existe, à son offre Amazon.fr.

## Format

Dossier au format Hugging Face **`imagefolder`** :

```
images/NNN_<produit>.jpg     une photo par produit
metadata.jsonl               une ligne JSON par image (colonne file_name = chemin de l'image)
liens.csv / liens.txt        la même chose en tableur / texte lisible
CREDITS.txt                  auteur et source de chaque photo (obligatoire, voir licence)
```

Chargement :

```python
from datasets import load_dataset
ds = load_dataset("imagefolder", data_dir="label_photos_v1", split="train")
ds[0]["image"], ds[0]["product"], ds[0]["label_text"], ds[0]["amazon_url"]
```

Ou sans dépendance : lire `metadata.jsonl` ligne par ligne et ouvrir `file_name` avec PIL.

## Colonnes de `metadata.jsonl`

| Colonne | Contenu |
|---|---|
| `file_name` | chemin de l'image |
| `product`, `brand`, `category` | produit (nom iFixit), marque, famille (console_controller, mouse_keyboard, network, speaker, headphone, vr, mac_laptop, pc_laptop) |
| `label_text` | texte lu sur l'étiquette par OCR (pré-annotation, à relire) |
| `amazon_title`, `amazon_url` | offre Amazon.fr trouvée par recherche web |
| `link_quality` | `exact` (même modèle), `approximate` (même modèle, autre configuration/version), `wrong`, `none` |
| `link_note` | précision sur le lien |
| `photo_author`, `photo_source`, `license` | crédit de la photo |

Qualité des liens : 20 exacts, 16 approximatifs, 0 faux, 15 sans offre.
Pour entraîner sur le couple photo → offre, filtrer `link_quality == "exact"` (ou `exact` + `approximate`).

## Limites

- **Petit volume** : 51 images. Suffisant pour évaluer un modèle de vision ou faire du few-shot,
  pas pour entraîner un modèle à partir de zéro.
- `label_text` vient de l'OCR : texte parfois collé ou incomplet.
- Les liens Amazon.fr ont été trouvés par recherche web, pas vérifiés en ouvrant chaque fiche.
- Pas de boîtes englobantes (pictos, champs) : à annoter si vous entraînez un détecteur.

## Licence

Photos : contributeurs iFixit, **CC BY-NC-SA 3.0** (https://creativecommons.org/licenses/by-nc-sa/3.0/).
Usage **non commercial**, attribution obligatoire (voir `CREDITS.txt`), redistribution sous la même licence.
Un modèle destiné à un usage commercial ne doit pas être entraîné sur ces photos sans autorisation.
