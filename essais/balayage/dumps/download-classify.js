// Generated from the tree. Do not edit here: edit the tree.
function classify(product) {
  // Principal function  [s16-n3, s16-n5, rgi-1, rgi-3, rgi-3a, rgi-3b]
  if (product.fonction_principale == null) return ask('fonction_principale');
  if (product.fonction_principale === 'alimenter') {
    return '850440'; // Static converters
  } else if (product.fonction_principale === 'transmettre_signaux') {
    // Active electronics on the signal  [h8544, h8536]
    if (product.electronique_active == null) return ask('electronique_active');
    if (product.electronique_active === true) {
      // Network or communication link  [c84-n6d, c84-n6d2, s16-n3, h8517]
      if (product.liaison_reseau == null) return ask('liaison_reseau');
      if (product.liaison_reseau === 'aucune') {
        // Device it connects to  [c84-n6c, c84-n6e, h8471, h8543]
        if (product.appareil_hote == null) return ask('appareil_hote');
        if (product.appareil_hote === 'ordinateur') {
          return '847180'; // Other units of automatic data-processing machines
        } else if (product.appareil_hote === 'mixte') {
          return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
        } else if (product.appareil_hote === 'audio_video') {
          return '854370'; // Other electrical machines and apparatus, having individual functions, not specified or included elsewhere in Chapter 85
        } else if (product.appareil_hote === 'autre') {
          return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
        }
      } else if (product.liaison_reseau === 'port_parmi_autres') {
        // Device it connects to  [c84-n6c, c84-n6e, h8471, h8543]
        if (product.appareil_hote == null) return ask('appareil_hote');
        if (product.appareil_hote === 'ordinateur') {
          return '847180'; // Other units of automatic data-processing machines
        } else if (product.appareil_hote === 'mixte') {
          return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
        } else if (product.appareil_hote === 'audio_video') {
          return '854370'; // Other electrical machines and apparatus, having individual functions, not specified or included elsewhere in Chapter 85
        } else if (product.appareil_hote === 'autre') {
          return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
        }
      } else if (product.liaison_reseau === 'seule_fonction') {
        return '851762'; // Machines for the reception, conversion and transmission or regeneration of voice, images or other data, including switching and routing apparatus
      }
    } else if (product.electronique_active === false) {
      // Construction of the product without electronics  [rgi-1, h8544, h8536, sh85444x, sh85366x, rgi-6]
      if (product.construction_passive == null) return ask('construction_passive');
      if (product.construction_passive === 'cable_connecteurs') {
        return '854442'; // Other electric conductors, for a voltage not exceeding 1 000 V, fitted with connectors
      } else if (product.construction_passive === 'cable_coaxial') {
        return OUT_OF_SCOPE; // Coaxial cable, wiring set for vehicles or optical fibre cable made up of individually sheathed fibres: the product stays in heading 8544 but outside subheadings 8544 42 and 8544 49. Subheadings 8544 20, 8544 30 and 8544 70 are not in the text repository and this tree does not cover them.
      } else if (product.construction_passive === 'faisceau_vehicule') {
        return OUT_OF_SCOPE; // Coaxial cable, wiring set for vehicles or optical fibre cable made up of individually sheathed fibres: the product stays in heading 8544 but outside subheadings 8544 42 and 8544 49. Subheadings 8544 20, 8544 30 and 8544 70 are not in the text repository and this tree does not cover them.
      } else if (product.construction_passive === 'fibre_optique') {
        return OUT_OF_SCOPE; // Coaxial cable, wiring set for vehicles or optical fibre cable made up of individually sheathed fibres: the product stays in heading 8544 but outside subheadings 8544 42 and 8544 49. Subheadings 8544 20, 8544 30 and 8544 70 are not in the text repository and this tree does not cover them.
      } else if (product.construction_passive === 'bloc_fiches_prises') {
        return '853669'; // Plugs and sockets, other, for a voltage not exceeding 1 000 V
      } else if (product.construction_passive === 'commutateur_mecanique') {
        return OUT_OF_SCOPE; // Mechanical selector without electronics: a switch of subheading 8536 50, not covered by this tree.
      }
    }
  } else if (product.fonction_principale === 'porter_completer') {
    // Device it connects to  [h8473, sh847330, s16-n1, s16-n1g, s16-n2, s16-n2b]
    if (product.appareil_hote == null) return ask('appareil_hote');
    if (product.appareil_hote === 'ordinateur') {
      return '847330'; // Parts and accessories of the machines of heading 8471
    } else if (product.appareil_hote === 'mixte') {
      return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
    } else if (product.appareil_hote === 'audio_video') {
      return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
    } else if (product.appareil_hote === 'autre') {
      return OUT_OF_SCOPE; // Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.
    }
  } else if (product.fonction_principale === 'autre') {
    return OUT_OF_SCOPE; // The principal function is neither power supply nor connection (hand warmer that also recharges a phone, luminaire, loudspeaker): the product is classified according to that function, under a heading that this tree does not cover.
  } else if (product.fonction_principale === 'aucune_dominante') {
    return OUT_OF_SCOPE; // No function prevails: for a machine of Chapter 84, note 8 refers to heading 8479; otherwise, after rules 3(a) and 3(b), rule 3(c) takes the heading which occurs last among those which equally merit consideration. This tree does not make that determination.
  }
}