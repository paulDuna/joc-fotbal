// Tari si echipe, cu jucatorii din sezonul 2025-2026 (aproximativ; transferurile se schimba des).
// Fiecare jucator: "Nume,numar,viteza,sut,pase,dribling,deposedare,piele(0-2),par(hex),frizura,barba"
// Ordinea primilor 11 urmeaza formatia 4-3-3: portar, fundas dreapta, 2 fundasi centrali, fundas stanga,
// mijlocas, mijlocas defensiv, mijlocas, extrema, atacant central, extrema. Rezervele: primul e portarul.
// Culori: [tricou, sort, jambiere, portar]. Fara sigle — doar culorile clubului.

const P = (s) => {
  const [name, num, spd, sho, pas, dri, def, t, h, st, b] = s.split(',');
  const d = { name, num: +num, spd: +spd, sho: +sho, pas: +pas, dri: +dri, def: +def, t: +(t || 0) };
  if (h) d.h = parseInt(h, 16);
  if (st) d.s = st;
  if (b === '1') d.b = 1;
  return d;
};

export const COUNTRIES = [
  { id: 'es', name: 'Spania', flag: '🇪🇸', clubs: [
    { id: 'rma', name: 'Real Madrid', short: 'RMA', kit: [0xf4f4f4, 0xf4f4f4, 0xf4f4f4, 0x2b2b2b], away: [0x1b2440, 0x1b2440, 0x1b2440, 0x2b2b2b],
      xi: ['Courtois,1,48,25,72,40,90,0,3a2a1c,,1', 'Alexander-Arnold,12,78,74,90,82,74,0', 'Militão,3,82,45,68,64,86,1,,buzz', 'Huijsen,24,74,45,78,70,84,0', 'Carreras,18,84,55,76,78,79,0',
        'Valverde,8,88,84,84,84,80,0,6b4a2a,,1', 'Tchouaméni,14,74,72,82,78,85,2,,buzz', 'Bellingham,5,80,86,86,88,78,1,,buzz', 'Rodrygo,11,88,82,82,88,40,2', 'Mbappé,10,97,93,82,92,36,2,,bald', 'Vinícius,7,95,86,81,93,30,2,,afro'],
      bench: ['Lunin,13,46,22,66,38,82,0', 'Rüdiger,22,82,50,70,64,87,2,,buzz,1', 'Güler,15,74,84,88,88,50,0', 'Camavinga,6,84,68,80,84,80,2,,afro', 'Endrick,16,86,82,70,82,30,1']},
    { id: 'fcb', name: 'FC Barcelona', short: 'FCB', kit: [0xa50044, 0x1d3f8f, 0xa50044, 0xf2c200], away: [0xf3e9c6, 0xf3e9c6, 0xf3e9c6, 0x2bb673],
      xi: ['Joan García,13,50,22,74,42,85,0', 'Koundé,23,85,50,76,76,85,2,,afro', 'Cubarsí,2,72,40,82,72,83,0', 'Eric García,24,66,48,80,70,80,0', 'Balde,3,92,58,74,80,76,2',
        'Pedri,8,74,74,90,90,68,0', 'De Jong,21,76,70,88,86,78,0,c9a060', 'Fermín López,16,80,80,78,82,62,0', 'Lamine Yamal,10,88,84,86,93,35,1,,afro', 'Lewandowski,9,74,92,80,84,40,0,6b4a2a', 'Raphinha,11,88,86,80,86,48,1,,,1'],
      bench: ['Szczęsny,25,45,20,68,36,82,0,,,1', 'Araujo,4,80,55,66,68,86,1,,,1', 'Gavi,6,78,70,82,84,72,0', 'Rashford,14,90,82,76,84,40,2,,buzz', 'Ferran Torres,7,82,82,76,80,45,0']},
    { id: 'atm', name: 'Atlético Madrid', short: 'ATM', kit: [0xcb3524, 0x1b3a8c, 0xcb3524, 0x2bb673], away: [0x1b3a8c, 0x1b3a8c, 0x1b3a8c, 0x2bb673],
      xi: ['Oblak,13,45,20,66,38,88,0,,,1', 'Llorente,14,88,74,80,80,76,0', 'Le Normand,24,68,45,68,62,83,0,,,1', 'Giménez,2,70,48,62,60,85,0,,,1', 'Hancko,17,76,55,74,72,80,0',
        'Koke,6,64,70,86,80,76,0,,,1', 'Barrios,8,80,66,80,82,79,0', 'Baena,10,78,82,86,86,58,0', 'G. Simeone,20,86,74,74,80,56,0', 'Julián Álvarez,19,84,88,80,86,52,0', 'Griezmann,7,76,86,88,88,54,0,c9a060,,1'],
      bench: ['Musso,1,45,20,64,36,80,0', 'Sørloth,9,72,84,66,72,40,0,e0c070,long', 'Gallagher,4,80,72,78,78,74,0', 'Lenglet,15,66,42,70,62,80,0', 'Raspadori,22,80,80,78,84,40,0']},
  ]},
  { id: 'en', name: 'Anglia', flag: '🏴', clubs: [
    { id: 'mci', name: 'Manchester City', short: 'MCI', kit: [0x6cabdd, 0xffffff, 0x6cabdd, 0xf2c200], away: [0x14213d, 0x14213d, 0x14213d, 0xf2c200],
      xi: ['Donnarumma,25,46,22,62,38,89,0', 'Matheus Nunes,27,84,72,80,82,74,1', 'Rúben Dias,3,66,42,70,66,89,0,,,1', 'Gvardiol,24,80,62,76,74,85,0', "O'Reilly,33,78,64,78,78,74,0",
        'Reijnders,4,80,82,86,86,70,1', 'Rodri,16,64,78,90,84,88,0,3a2a1c,,1', 'Foden,47,82,86,88,90,56,0,8a6a3a,buzz', 'Doku,11,93,74,74,90,32,2,,afro', 'Haaland,9,90,95,68,80,45,0,e0c070', 'Cherki,10,80,82,86,90,40,1'],
      bench: ['Trafford,1,48,20,74,40,80,0', 'Stones,5,66,50,82,74,84,0', 'Bernardo Silva,20,74,78,88,90,66,0,,,1', 'Marmoush,7,88,84,78,84,40,1,,,1', 'Aït-Nouri,21,86,64,76,82,74,1,,afro']},
    { id: 'liv', name: 'Liverpool', short: 'LIV', kit: [0xc8102e, 0xc8102e, 0xc8102e, 0x1f1f1f], away: [0xf2f2f2, 0x111111, 0xf2f2f2, 0x1f1f1f],
      xi: ['Alisson,1,48,22,76,44,89,0,4a3423,,1', 'Frimpong,30,94,70,76,84,70,2', 'Konaté,5,82,45,66,64,86,2,,buzz', 'Van Dijk,4,76,62,78,72,90,1,,buzz,1', 'Kerkez,6,84,62,76,78,76,0',
        'Szoboszlai,8,80,84,84,84,70,0,e0c070', 'Gravenberch,38,78,72,84,86,80,2', 'Wirtz,7,78,86,90,92,50,0,6b4a2a', 'Salah,11,88,90,82,88,45,1,,afro,1', 'Isak,9,86,88,78,86,40,2', 'Gakpo,18,84,84,78,84,45,1'],
      bench: ['Mamardashvili,25,46,20,62,36,84,0,,,1', 'Ekitike,22,86,84,74,84,35,2', 'Mac Allister,10,72,82,88,84,74,0,c9853a', 'Robertson,26,78,62,84,76,76,0,,,1', 'Chiesa,14,86,80,76,86,40,0,,,1']},
    { id: 'ars', name: 'Arsenal', short: 'ARS', kit: [0xef0107, 0xffffff, 0xffffff, 0x2bb673], away: [0xf2e04a, 0x14213d, 0xf2e04a, 0x2bb673],
      xi: ['Raya,1,48,22,82,42,86,0,,,1', 'Timber,12,82,58,78,80,82,2,,afro', 'Saliba,2,82,42,72,70,89,2,,buzz', 'Gabriel,6,72,55,66,62,88,1,,,1', 'Calafiori,33,76,62,78,76,80,0,,long',
        'Ødegaard,8,74,84,90,90,62,0,e0c070', 'Zubimendi,36,70,66,86,80,84,0', 'Rice,41,78,80,86,82,86,0', 'Saka,7,88,86,84,88,50,2,,buzz', 'Gyökeres,14,88,90,74,82,42,0,,,1', 'Eze,10,80,84,84,90,40,2,,buzz'],
      bench: ['Kepa,13,46,20,70,38,80,0,,,1', 'Martinelli,11,92,80,74,84,44,1', 'Havertz,29,76,82,80,82,58,0', 'Merino,23,70,76,82,80,78,0', 'Ben White,4,76,55,78,72,82,0']},
  ]},
  { id: 'it', name: 'Italia', flag: '🇮🇹', clubs: [
    { id: 'int', name: 'Inter', short: 'INT', kit: [0x0068a8, 0x111111, 0x111111, 0xf2c200], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0xf2c200],
      xi: ['Sommer,1,44,20,70,40,86,0', 'Dumfries,2,86,72,74,76,76,2,,buzz', 'Bisseck,31,76,48,70,64,83,2', 'Bastoni,95,72,58,84,74,87,0,,,1', 'Dimarco,32,80,78,86,80,76,0',
        'Barella,23,82,76,86,86,80,0', 'Çalhanoğlu,20,66,84,90,82,74,0,,,1', 'Mkhitaryan,22,70,78,86,84,70,0,,buzz', 'Thuram,9,86,82,76,82,40,2', 'Lautaro,10,82,90,78,86,48,0,,,1', 'Bonny,14,86,80,72,82,38,2'],
      bench: ['J. Martínez,13,46,20,66,38,80,0', 'Frattesi,16,80,78,78,80,70,0', 'Zieliński,7,74,80,86,84,60,0', 'Carlos Augusto,30,82,66,76,76,74,1', 'Pio Esposito,94,74,78,66,72,36,0']},
    { id: 'juv', name: 'Juventus', short: 'JUV', kit: [0xf2f2f2, 0x111111, 0xf2f2f2, 0xf2c200], away: [0x111111, 0x111111, 0x111111, 0xf2c200],
      xi: ['Di Gregorio,29,46,20,68,40,85,0', 'Kalulu,15,84,50,72,74,82,2', 'Bremer,3,80,48,66,64,88,1,,buzz', 'Gatti,4,72,50,64,60,84,0,,,1', 'Cambiaso,27,80,70,82,82,78,0',
        'Koopmeiners,8,72,82,86,82,72,0,e0c070', 'Locatelli,5,66,74,86,80,80,0,,,1', 'K. Thuram,19,82,72,78,82,76,2', 'Conceição,7,88,78,80,88,40,0', 'Vlahović,9,78,88,72,80,40,0,,long', 'Yildiz,10,82,84,82,90,40,0'],
      bench: ['Perin,1,44,20,64,36,80,0,,,1', 'Jonathan David,30,84,86,78,84,40,2', 'McKennie,16,78,72,78,78,72,0,e0c070', 'Kelly,6,70,40,72,64,80,0', 'Zhegrova,11,88,78,80,88,36,0']},
    { id: 'mil', name: 'AC Milan', short: 'MIL', kit: [0xd21f26, 0xf2f2f2, 0x111111, 0x2bb673], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0x2bb673],
      xi: ['Maignan,16,48,22,78,42,88,2,,,1', 'Saelemaekers,56,82,74,80,82,70,0', 'Gabbia,46,66,45,70,62,80,0', 'Pavlović,31,74,50,66,62,81,0,,buzz', 'Estupiñán,2,84,64,80,78,74,1',
        'Modrić,14,68,78,92,88,68,0,b89a5a,long', 'Fofana,29,82,66,80,80,80,2', 'Rabiot,12,78,78,84,82,78,0,,long,1', 'Pulisic,11,88,84,80,88,40,0', 'S. Giménez,7,80,84,72,78,38,0,,,1', 'Leão,10,93,84,78,90,30,2'],
      bench: ['Terracciano,1,44,20,62,36,76,0,,,1', 'Tomori,23,86,45,68,66,82,2,,buzz', 'Loftus-Cheek,8,78,76,78,82,72,2', 'Nkunku,18,84,84,82,86,40,2,,bald', 'Ricci,4,70,62,82,76,78,0']},
  ]},
  { id: 'de', name: 'Germania', flag: '🇩🇪', clubs: [
    { id: 'fcbm', name: 'Bayern München', short: 'BAY', kit: [0xdc052d, 0xdc052d, 0xdc052d, 0x2bb673], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0x2bb673],
      xi: ['Neuer,1,46,26,86,48,86,0,e0c070', 'Laimer,27,84,66,78,78,80,0', 'Upamecano,2,82,42,70,66,85,2,,buzz', 'Tah,4,74,45,72,62,86,2,,buzz', 'Davies,19,95,64,76,82,78,2,,buzz',
        'Kimmich,6,70,76,90,84,82,0,6b4a2a', 'A. Pavlović,45,70,66,86,80,78,0', 'Goretzka,8,78,80,80,80,78,0,,,1', 'Olise,17,82,84,86,90,40,2', 'Kane,9,70,93,86,84,46,0,8a6a3a', 'Luis Díaz,14,90,82,78,90,40,1'],
      bench: ['Urbig,40,46,20,66,38,78,0', 'Musiala,10,84,82,84,93,55,0,4a3423', 'Gnabry,7,86,82,78,84,40,2', 'N. Jackson,11,88,80,70,80,36,2', 'Kim Min-jae,3,80,45,72,66,86,0']},
    { id: 'bvb', name: 'Borussia Dortmund', short: 'BVB', kit: [0xfde100, 0x111111, 0xfde100, 0x2bb673], away: [0x111111, 0x111111, 0x111111, 0x2bb673],
      xi: ['Kobel,1,46,20,74,40,86,0', 'Ryerson,26,82,64,78,76,74,0,e0c070', 'Anton,3,72,42,72,64,82,0', 'Schlotterbeck,4,72,55,78,70,84,0', 'Svensson,24,80,60,74,74,74,0,e0c070',
        'J. Bellingham,7,78,72,80,82,72,1,,buzz', 'Nmecha,8,76,74,82,84,72,2,,buzz', 'Brandt,10,72,80,88,86,58,0', 'Adeyemi,27,94,80,72,84,36,2', 'Guirassy,9,78,88,70,78,40,2,,,1', 'Beier,14,86,80,74,80,36,0'],
      bench: ['A. Meyer,33,44,20,62,36,74,0', 'Sabitzer,20,74,80,82,80,72,0', 'Gross,13,66,76,88,80,66,0', 'Süle,25,64,48,72,62,82,0', 'Bensebaini,5,76,62,72,72,76,1,,,1']},
    { id: 'b04', name: 'Bayer Leverkusen', short: 'B04', kit: [0xe32221, 0x111111, 0xe32221, 0xf2c200], away: [0x111111, 0x111111, 0x111111, 0xf2c200],
      xi: ['Flekken,1,44,20,72,40,83,0', 'Arthur,13,84,60,74,76,72,1', 'Quansah,4,76,45,72,64,81,2', 'Tapsoba,12,76,48,74,66,84,2,,buzz', 'Grimaldo,20,80,78,86,82,72,0,,,1',
        'Aleix García,24,66,72,88,80,76,0', 'Andrich,8,70,70,80,74,80,0,,buzz', 'Tillman,10,80,80,82,84,60,0', 'Poku,19,88,74,74,82,36,2', 'Schick,14,72,86,70,78,40,0,,,1', 'Hofmann,7,74,80,84,82,52,0'],
      bench: ['Blaswich,28,44,20,64,36,78,0', 'Kofane,35,82,78,62,72,34,2', 'Badé,5,80,40,64,60,82,2', 'Ben Seghir,11,84,78,80,86,36,1', 'Echeverri,30,84,76,80,86,36,0']},
  ]},
  { id: 'fr', name: 'Franța', flag: '🇫🇷', clubs: [
    { id: 'psg', name: 'Paris Saint-Germain', short: 'PSG', kit: [0x0a2b5c, 0x0a2b5c, 0xc8102e, 0xf2c200], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0xf2c200],
      xi: ['Chevalier,30,48,20,74,40,85,0', 'Hakimi,2,93,74,82,84,78,1', 'Marquinhos,5,74,50,76,70,87,0,,,1', 'Pacho,51,78,40,70,62,85,2,,buzz', 'Nuno Mendes,25,92,66,78,84,80,2',
        'Vitinha,17,76,80,90,90,72,0', 'João Neves,87,80,70,86,88,80,0', 'Fabián Ruiz,8,70,80,86,82,74,0,,,1', 'Doué,14,88,82,82,90,40,2,,afro', 'Dembélé,10,90,90,84,92,40,2', 'Kvaratskhelia,7,88,84,82,92,40,0'],
      bench: ['Safonov,39,46,20,64,36,80,0', 'Barcola,29,92,80,76,86,36,2', 'Gonçalo Ramos,9,78,84,70,76,40,0', 'Zaïre-Emery,33,80,74,82,84,76,2', 'L. Hernández,21,76,50,72,68,84,0']},
    { id: 'om', name: 'Olympique Marseille', short: 'OM', kit: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0x1f1f1f], away: [0x2fa4dc, 0x2fa4dc, 0x2fa4dc, 0x1f1f1f],
      xi: ['Rulli,1,44,20,68,40,84,0', 'Weah,22,86,66,74,78,70,2', 'Balerdi,5,72,48,70,64,82,0', 'Aguerd,21,70,45,70,62,82,1,,,1', 'Emerson,33,76,62,78,74,74,0',
        "O'Riley,17,74,78,84,82,70,0,c9853a", 'Højbjerg,23,68,72,84,78,80,0,,buzz', 'Vermeeren,18,72,68,84,82,76,0,e0c070', 'Greenwood,10,84,88,82,86,40,1', 'Aubameyang,97,86,86,74,80,36,2,,bald,1', 'Paixão,14,88,76,76,84,36,1'],
      bench: ['De Lange,12,44,20,60,36,74,0', 'Gouiri,9,78,82,80,84,40,1', 'Pavard,28,70,58,76,70,82,0', 'Kondogbia,19,70,66,78,72,80,2', 'Nadir,26,80,70,74,80,40,1']},
  ]},
  { id: 'ro', name: 'România', flag: '🇷🇴', clubs: [
    { id: 'fcsb', name: 'FCSB', short: 'FCSB', kit: [0xd4011a, 0x00309a, 0xd4011a, 0xf2c200], away: [0x00309a, 0x00309a, 0x00309a, 0xf2c200],
      xi: ['Târnovanu,32,44,20,64,38,77,0', 'Crețu,2,72,58,70,68,70,0', 'Ngezana,30,74,40,62,58,74,2', 'M. Popescu,4,64,42,64,58,73,0', 'Radunović,33,74,52,68,66,68,0',
        'Șut,8,70,62,74,72,72,0', 'Olaru,27,70,76,78,76,62,0', 'Edjouma,6,76,62,72,74,70,2', 'Miculescu,11,82,70,70,76,40,0', 'Bîrligea,9,80,76,62,70,38,0', 'Cisotti,31,76,72,74,78,38,0'],
      bench: ['Zima,99,44,20,60,36,72,0', 'Alhassan,28,72,58,68,70,70,2', 'Tănase,10,70,76,76,76,40,0', 'Thiam,93,82,72,62,72,34,2', 'Dawa,3,68,40,60,56,72,2']},
    { id: 'ucv', name: 'Universitatea Craiova', short: 'UCV', kit: [0x0047ab, 0xf2f2f2, 0x0047ab, 0xf2c200], away: [0xf2f2f2, 0x0047ab, 0xf2f2f2, 0xf2c200],
      xi: ['L. Popescu,1,44,20,62,38,76,0', 'Romanchuk,3,74,48,66,62,72,0', 'Screciu,4,68,48,68,64,74,0', 'Badelj,24,68,44,62,58,74,0', 'Bancu,11,76,60,74,70,68,0',
        'Mekvabishvili,6,70,58,72,70,72,0', 'Crețu (U),8,68,62,74,72,70,0', 'Băluță,18,72,68,72,74,62,0', 'Mora,7,82,70,70,78,40,1', 'Al Hamlawi,9,78,78,62,70,36,1,,,1', 'Băiaram,10,84,74,70,80,36,0'],
      bench: ['Lung jr.,12,44,20,60,36,72,0', 'Mitriță,28,78,76,76,80,36,0', 'Cicâldău,20,66,72,76,74,60,0', 'Etim,19,80,70,62,72,36,2', 'Stevanović,2,72,50,66,64,70,0']},
    { id: 'cfr', name: 'CFR Cluj', short: 'CFR', kit: [0x7b1e30, 0xf2f2f2, 0x7b1e30, 0x111111], away: [0xf2f2f2, 0x7b1e30, 0xf2f2f2, 0x111111],
      xi: ['Hindrich,22,44,20,62,38,75,0', 'Ilie,2,72,50,66,62,70,0', 'Kurtić,5,64,42,62,56,72,0', 'Cristea,6,66,42,62,58,72,0', 'Camora,45,72,54,70,66,66,0,,,1',
        'Bordeianu,8,64,62,74,70,66,0,,,1', 'Djokovic,10,64,66,76,72,62,0', 'Fică,23,72,66,70,74,50,0', 'Cordea,7,78,70,70,76,38,0', 'Munteanu,9,82,80,64,74,36,0', 'Postolachi,11,80,72,66,76,36,0'],
      bench: ['Mbaye,1,44,20,58,36,72,2', 'Biliboc,20,74,66,70,72,40,0', 'Bîlici,4,64,40,60,56,70,0', 'Gîdea,16,74,58,64,66,56,0', 'Muhar,17,74,60,64,68,50,0']},
  ]},
  { id: 'pt', name: 'Portugalia', flag: '🇵🇹', clubs: [
    { id: 'slb', name: 'Benfica', short: 'SLB', kit: [0xe30613, 0xf2f2f2, 0xe30613, 0x2bb673], away: [0x111111, 0x111111, 0x111111, 0x2bb673],
      xi: ['Trubin,1,46,20,66,38,83,0', 'Dedić,17,80,60,72,72,74,0', 'António Silva,4,72,45,74,66,82,0', 'Otamendi,30,62,50,70,62,82,0,,,1', 'Dahl,26,80,56,72,72,74,0,e0c070',
        'Barreiro,18,76,66,74,74,76,0', 'Ríos,20,72,66,80,78,78,1', 'Aursnes,8,74,66,80,78,76,0,e0c070', 'Aktürkoğlu,17,86,78,76,84,38,0', 'Pavlidis,14,78,84,70,76,38,0,,,1', 'Sudakov,10,78,80,84,86,48,0'],
      bench: ['Samuel Soares,24,44,20,60,36,74,0', 'Ivanović,9,80,78,64,74,34,0', 'Prestianni,25,84,72,74,84,34,0', 'Bah,6,82,58,70,72,76,2', 'Schjelderup,21,84,74,74,82,36,0']},
    { id: 'fcp', name: 'FC Porto', short: 'FCP', kit: [0x0050a0, 0xf2f2f2, 0x0050a0, 0xf2c200], away: [0xf2f2f2, 0x0050a0, 0xf2f2f2, 0xf2c200],
      xi: ['Diogo Costa,99,48,20,74,40,85,0', 'Alberto Costa,20,82,58,72,74,74,0', 'Bednarek,5,70,45,66,60,82,0', 'Kiwior,4,72,48,74,66,81,0', 'Francisco Moura,74,82,58,74,74,72,0',
        'Froholdt,8,76,70,80,80,72,0,e0c070', 'Varela,16,70,64,82,76,78,1', 'Gabri Veiga,10,74,82,84,84,60,0', 'Borja Sainz,17,86,78,76,84,36,0', 'Samu Aghehowa,9,82,82,64,74,36,2', 'Pepê,11,86,76,78,84,50,1'],
      bench: ['Cláudio Ramos,14,44,20,60,36,74,0', 'Deniz Gül,27,78,76,62,70,34,0', 'Rodrigo Mora,86,78,76,80,86,36,0', 'Pérez,3,70,40,64,60,78,0', 'William Gomes,7,86,72,72,82,34,2']},
    { id: 'scp', name: 'Sporting CP', short: 'SCP', kit: [0x008057, 0xf2f2f2, 0x008057, 0xf2c200], away: [0x111111, 0x111111, 0x111111, 0xf2c200],
      xi: ['Rui Silva,1,44,20,66,38,82,0', 'Fresneda,22,82,56,72,72,72,0', 'Diomande,26,82,45,68,64,84,2', 'Debast,6,70,50,78,70,80,0', 'Maxi Araújo,20,84,66,74,78,72,0',
        'Hjulmand,42,72,66,82,78,80,0,,,1', 'Morita,5,72,68,84,80,74,0', 'Trincão,17,82,80,80,86,40,0', 'Quenda,7,88,74,76,86,40,2', 'Luis Suárez,97,78,84,68,76,36,1', 'Pedro Gonçalves,8,78,82,84,86,48,0'],
      bench: ['Kovačević,13,44,20,60,36,74,0', 'Ioannidis,89,76,82,66,74,34,0', 'Geny Catamo,10,84,72,72,80,40,2', 'Inácio,25,72,48,74,64,80,0', 'Kochorashvili,14,72,62,76,74,72,0']},
  ]},
  { id: 'nl', name: 'Olanda', flag: '🇳🇱', clubs: [
    { id: 'aja', name: 'Ajax', short: 'AJA', kit: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0x1f1f1f], away: [0x0b2b5c, 0x0b2b5c, 0x0b2b5c, 0x1f1f1f],
      xi: ['Jaros,1,44,20,64,38,80,0', 'Gaaei,3,80,56,72,72,74,1', 'Šutalo,37,72,45,70,62,80,0', 'Baas,4,72,48,72,64,78,0', 'Wijndal,5,78,56,74,72,72,0',
        'Klaassen,18,72,74,80,78,66,0,e0c070', 'Taylor,8,74,72,80,80,72,0', 'Mokio,24,76,64,78,80,72,2', 'Berghuis,23,74,80,84,84,40,0', 'Weghorst,25,66,80,66,70,40,0,e0c070,,1', 'Godts,11,86,76,74,84,36,0'],
      bench: ['Pasveer,22,44,20,62,36,76,0', 'Dolberg,9,76,80,70,76,36,0', 'Fitz-Jim,28,76,66,76,78,66,2', 'Rosa,2,82,54,68,70,72,2', 'Edvardsen,7,82,74,76,82,36,0']},
    { id: 'psv', name: 'PSV Eindhoven', short: 'PSV', kit: [0xe2001a, 0xf2f2f2, 0xe2001a, 0x2bb673], away: [0x111111, 0x111111, 0x111111, 0x2bb673],
      xi: ['Kovář,32,46,20,64,38,80,0', 'Mauro Júnior,17,82,60,76,78,72,1', 'Obispo,4,72,45,70,62,80,0', 'Flamingo,6,74,48,72,64,80,2', 'Dest,8,86,60,76,80,70,1',
        'Veerman,23,70,76,86,80,68,0,e0c070', 'Schouten,22,68,62,82,74,78,0', 'Saibari,34,82,78,78,82,54,1', 'Perišić,5,80,78,80,80,62,0', 'Pepi,9,78,80,64,74,34,1', 'Til,7,80,80,80,84,50,0'],
      bench: ['Drommel,16,44,20,60,36,74,0', 'Bajraktarević,19,82,72,74,84,36,0', 'Man,27,84,74,72,82,36,0', 'Sildillia,3,80,50,66,66,74,2', 'Wanner,10,76,76,80,84,40,0']},
  ]},
  { id: 'tr', name: 'Turcia', flag: '🇹🇷', clubs: [
    { id: 'gs', name: 'Galatasaray', short: 'GS', kit: [0xa90432, 0xfdb912, 0xa90432, 0x2bb673], away: [0xfdb912, 0xa90432, 0xfdb912, 0x2bb673],
      xi: ['Çakır,1,46,20,64,38,82,0', 'Singo,90,82,50,66,68,80,2', 'Sánchez,6,70,48,66,60,82,1,,,1', 'Bardakcı,42,68,50,68,62,80,0', 'Jakobs,4,80,56,72,72,72,2',
        'Sara,20,74,78,84,82,60,1', 'Torreira,34,72,62,80,76,80,0,,long', 'Lemina,99,72,62,76,76,78,2', 'Barış Alper,53,86,76,70,80,46,0', 'Osimhen,45,90,88,68,80,36,2,,bald', 'Sané,10,90,82,80,86,40,2'],
      bench: ['Günay,19,44,20,60,36,76,0', 'İcardi,9,66,86,66,74,34,0,,,1', 'Yılmaz,7,84,74,70,80,40,0', 'Sallai,11,82,72,72,76,56,0', 'Gündoğan,8,64,80,88,84,64,0,,,1']},
    { id: 'fb', name: 'Fenerbahçe', short: 'FB', kit: [0x1c2c5b, 0xfde100, 0x1c2c5b, 0x2bb673], away: [0xfde100, 0x1c2c5b, 0xfde100, 0x2bb673],
      xi: ['Ederson,31,48,22,86,42,86,1,,buzz,1', 'Semedo,2,84,56,74,78,74,2', 'Škriniar,37,72,45,68,62,85,0,,,1', 'Söyüncü,4,70,48,64,60,80,0,,,1', 'Brown,18,80,56,72,72,72,2',
        'Asensio,21,74,84,84,84,50,0', 'Ndidi,8,70,62,76,72,82,2,,buzz', 'Kanté,17,80,66,80,80,86,2,,bald', 'Nené,7,84,74,74,82,40,1', 'En-Nesyri,19,82,82,62,72,40,1', 'Talisca,94,76,82,74,78,42,1,,,1'],
      bench: ['Livaković,40,46,20,66,38,80,0', 'Džeko,9,62,82,74,76,40,0,,,1', 'Fred,35,72,70,80,80,74,1', 'Oosterwolde,24,78,45,68,62,78,2', 'Kahveci,10,76,78,80,82,48,0']},
  ]},
  { id: 'sa', name: 'Arabia Saudită', flag: '🇸🇦', clubs: [
    { id: 'nsr', name: 'Al-Nassr', short: 'NSR', kit: [0xfde100, 0x0033a0, 0xfde100, 0x2bb673], away: [0x0033a0, 0x0033a0, 0x0033a0, 0x2bb673],
      xi: ['Bento,24,46,20,64,38,82,1', 'Sultan Al-Ghannam,2,78,54,72,70,72,1', 'Simakan,3,82,45,66,62,82,2', 'Iñigo Martínez,26,66,50,80,66,82,0', 'Boushal,12,76,52,66,66,70,1',
        'Brozović,77,70,74,88,80,74,0,,,1', 'Al-Khaibari,19,72,60,72,70,74,1', 'Otávio,25,76,76,84,84,60,1,,,1', 'Mané,10,88,84,80,86,44,2,,buzz', 'Cristiano Ronaldo,7,80,93,80,84,34,0', 'Coman,29,90,76,78,86,36,2'],
      bench: ['Al-Aqidi,1,44,20,60,36,74,1', 'João Félix,79,80,82,82,86,38,0', 'Durán,9,80,82,62,74,36,1', 'Ghareeb,8,84,72,70,80,38,1', 'Laporte,27,70,52,80,68,84,0,,,1']},
    { id: 'hil', name: 'Al-Hilal', short: 'HIL', kit: [0x1653a3, 0xf2f2f2, 0x1653a3, 0xf2c200], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0xf2c200],
      xi: ['Bounou,37,46,20,72,40,86,1,,,1', 'Cancelo,20,82,72,86,84,74,0,,,1', 'Koulibaly,3,72,42,64,58,84,2,,bald,1', 'Hernández,4,82,52,70,64,82,0', 'Renan Lodi,6,80,60,76,74,72,1',
        'Rúben Neves,8,64,80,88,78,76,0,,,1', 'Kanno,28,70,62,74,72,74,1', 'Milinković-Savić,22,70,82,84,82,74,0', 'Malcom,77,86,82,80,86,40,1', 'Darwin Núñez,9,90,82,66,76,40,1', 'Leonardo,11,84,76,74,82,36,1'],
      bench: ['Al-Owais,21,44,20,60,36,76,1', 'Mitrović,9,66,86,64,72,40,0,,,1', 'Salem Al-Dawsari,29,80,80,80,84,40,1', 'Theo Hernández,19,90,72,78,80,76,0,,,1', 'Al-Bulaihi,5,66,40,60,54,76,1']},
  ]},
  { id: 'us', name: 'SUA', flag: '🇺🇸', clubs: [
    { id: 'mia', name: 'Inter Miami', short: 'MIA', kit: [0xf7b5cd, 0x231f20, 0xf7b5cd, 0x2bb673], away: [0x231f20, 0x231f20, 0x231f20, 0x2bb673],
      xi: ['Ustari,19,44,20,62,38,76,0', 'Weigandt,57,76,50,68,66,70,0', 'Falcón,37,68,42,62,56,72,0', 'Micael,6,74,44,62,58,74,1', 'Jordi Alba,18,80,66,84,78,68,0',
        'De Paul,7,74,76,84,82,72,0,,,1', 'Busquets,5,52,62,86,76,74,0,,,1', 'Segovia,8,80,72,74,78,50,0', 'Allende,21,84,80,74,82,36,0', 'Luis Suárez,9,58,84,82,76,36,0', 'Messi,10,74,88,92,94,34,0,4a3423,,1'],
      bench: ['Ríos Novo,34,44,20,58,36,72,0', 'Silvetti,11,82,70,70,76,36,0', 'Fray,32,72,58,74,70,62,0', 'Avilés,4,70,40,60,54,72,0', 'Cremaschi,30,74,66,74,74,62,0']},
  ]},
  { id: 'br', name: 'Brazilia', flag: '🇧🇷', clubs: [
    { id: 'fla', name: 'Flamengo', short: 'FLA', kit: [0xc8102e, 0xf2f2f2, 0x111111, 0x2bb673], away: [0xf2f2f2, 0xf2f2f2, 0xf2f2f2, 0x2bb673],
      xi: ['Rossi,1,44,20,64,38,80,0', 'Varela,2,74,54,70,68,72,1', 'Léo Ortiz,3,68,48,72,64,78,1', 'Léo Pereira,4,68,48,70,62,78,0', 'Alex Sandro,6,74,58,74,70,74,1,,,1',
        'Arrascaeta,10,74,82,88,86,50,0', 'Jorginho,21,60,66,86,76,74,0', 'Saúl,8,68,74,80,78,72,0', 'Luiz Araújo,7,82,76,74,82,40,1', 'Pedro,9,72,86,74,78,34,1', 'Samuel Lino,16,86,76,74,84,40,2'],
      bench: ['Matheus Cunha,25,44,20,58,36,72,1', 'Bruno Henrique,27,82,78,70,78,36,2', 'Plata,19,86,74,72,82,36,2', 'Carrascal,15,72,74,80,82,50,1', 'Danilo,13,70,52,76,70,80,1,,,1']},
    { id: 'pal', name: 'Palmeiras', short: 'PAL', kit: [0x006437, 0xf2f2f2, 0x006437, 0xf2c200], away: [0xf2f2f2, 0x006437, 0xf2f2f2, 0xf2c200],
      xi: ['Weverton,21,44,20,66,38,80,1,,,1', 'Giay,4,78,54,70,70,70,0', 'Gustavo Gómez,15,62,52,64,56,82,0,,,1', 'Murilo,26,72,46,66,60,78,1', 'Piquerez,22,76,62,74,70,72,0',
        'Andreas Pereira,8,72,78,82,80,64,1', 'Aníbal Moreno,5,70,60,76,72,76,0', 'Mauricio,18,76,74,78,80,52,1', 'Facundo Torres,17,82,78,78,84,40,0', 'Vitor Roque,9,86,82,64,80,34,1', 'Flaco López,42,76,80,66,74,36,0'],
      bench: ['Carlos Miguel,1,44,20,60,36,74,2', 'Ramón Sosa,19,86,72,70,80,36,1', 'Allan,40,80,70,72,78,40,2', 'Bruno Fuchs,3,70,44,62,56,76,1', 'Lucas Evangelista,30,70,68,78,74,64,1']},
  ]},
  { id: 'ar', name: 'Argentina', flag: '🇦🇷', clubs: [
    { id: 'boc', name: 'Boca Juniors', short: 'BOC', kit: [0x103f79, 0x103f79, 0x103f79, 0x2bb673], away: [0xfde100, 0x103f79, 0xfde100, 0x2bb673],
      xi: ['Marchesín,1,44,20,64,38,78,0', 'Advíncula,17,82,58,70,72,72,2', 'Ayrton Costa,32,70,42,62,58,76,0', 'Di Lollo,40,66,40,60,54,74,0', 'Blanco,23,72,52,68,66,70,0',
        'Paredes,5,62,72,86,76,74,0', 'Battaglia,8,64,58,72,68,76,0,,,1', 'Zenón,22,80,72,74,80,48,0', 'Palacios,36,80,70,72,78,40,0', 'Merentiel,16,78,78,62,72,36,0', 'Cavani,10,66,82,70,74,40,0,,long,1'],
      bench: ['Brey,13,44,20,58,36,72,0', 'Zeballos,7,84,72,70,80,34,0', 'Herrera,30,72,62,74,72,66,0', 'Rojo,6,62,48,62,56,76,0,,,1', 'Velasco,33,82,70,70,78,36,0']},
    { id: 'riv', name: 'River Plate', short: 'RIV', kit: [0xf2f2f2, 0x111111, 0xf2f2f2, 0x2bb673], away: [0xc8102e, 0x111111, 0xc8102e, 0x2bb673],
      xi: ['Armani,1,44,20,62,38,78,0,,,1', 'Montiel,4,74,62,74,70,74,0', 'Martínez Quarta,28,74,48,66,60,80,0', 'Pezzella,6,62,46,66,58,78,0,,,1', 'Acuña,21,74,60,78,74,72,0,,,1',
        'Enzo Pérez,24,56,62,80,72,70,0', 'Castaño,5,70,60,76,72,74,1', 'Juanfer Quintero,10,66,82,88,84,40,1', 'Colidio,11,82,74,70,80,36,0', 'Driussi,15,76,78,72,78,36,0', 'Subiabre,38,82,74,72,82,36,0'],
      bench: ['Centurión,41,44,20,58,36,72,0', 'Borja,9,74,80,62,70,34,1', 'Galarza,26,78,64,72,76,50,0', 'Rivero,13,68,40,60,54,74,0', 'Lanzini,8,70,74,80,82,48,0']},
  ]},
  { id: 'leg', name: 'Legende', flag: '⭐', clubs: [
    { id: 'legw', name: 'Legende Mondiale', short: 'LEG', kit: [0xd4af37, 0x111111, 0xd4af37, 0x6a1b9a], away: [0x111111, 0xd4af37, 0x111111, 0x6a1b9a],
      xi: ['Buffon,1,50,22,74,44,92,0,,,1', 'Cafu,2,90,70,82,82,86,2,,bald', 'Beckenbauer,5,78,74,90,84,92,0,c9a060', 'Maldini,3,82,56,80,76,95,0,3a2a1c,long', 'Roberto Carlos,6,94,88,84,84,84,1,,bald',
        'Zidane,10,78,90,94,96,70,0,,bald', 'Xavi,6,70,74,96,92,70,0', 'Ronaldinho,80,86,88,92,97,40,1,,long', 'Pelé,10,92,96,90,96,50,2,,buzz', 'Ronaldo Nazário,9,97,96,82,95,40,1,,bald', 'Maradona,10,86,92,94,98,40,1,,afro'],
      bench: ['Yashin,1,48,20,70,40,92,0', 'Cruyff,14,88,90,92,95,50,0,c9a060,long', 'Henry,14,95,92,84,90,40,2,,bald', 'Beckham,7,80,86,95,84,62,0,e0c070', 'Iniesta,8,76,80,94,95,62,0,,bald']},
    { id: 'legro', name: 'Legende România', short: 'ROU', kit: [0xfcd116, 0x002b7f, 0xce1126, 0x2bb673], away: [0x002b7f, 0x002b7f, 0x002b7f, 0x2bb673],
      xi: ['Duckadam,1,46,20,64,40,88,0,,,1', 'Dan Petrescu,2,82,78,84,80,80,0', 'Belodedici,4,74,52,82,76,88,0', 'Gică Popescu,6,72,70,84,78,88,0', 'Chivu,3,78,72,82,76,86,0',
        'Dorinel Munteanu,8,74,78,84,80,76,0', 'Lupescu,5,70,70,80,76,80,0', 'Hagi,10,82,94,95,96,50,0,3a2a1c', 'Lăcătuș,7,90,82,78,86,40,0,3a2a1c', 'Mutu,10,84,90,84,90,40,0', 'Ilie Dumitrescu,11,86,86,84,88,40,0'],
      bench: ['Stelea,12,46,20,62,38,84,0,,bald', 'Răducioiu,9,84,86,74,82,38,0', 'Viorel Moldovan,19,82,86,70,80,38,0', 'Cosmin Contra,2,90,74,80,80,80,0', 'Bölöni,8,72,82,86,84,66,0,,,1']},
  ]},
];

export function findClub(id) {
  for (const c of COUNTRIES) for (const k of c.clubs) if (k.id === id) return { country: c, club: k };
  return null;
}
const dist = (a, b) => Math.hypot(((a >> 16) & 255) - ((b >> 16) & 255), ((a >> 8) & 255) - ((b >> 8) & 255), (a & 255) - (b & 255));
// echipa gata de joc (ca in TEAMS); daca tricourile seamana prea mult, al doilea joaca in echipamentul de deplasare
export function buildTeam(club, vsColor) {
  const kit = vsColor != null && dist(club.kit[0], vsColor) < 120 ? club.away : club.kit;
  const players = club.xi.map(P), bench = club.bench.map(P);
  bench[0].gk = 1;
  return { id: club.id, name: club.name.toUpperCase(), short: club.short, color: kit[0], shorts: kit[1], socks: kit[2], gk: kit[3], players, bench };
}
export function clubRating(club) {
  const r = club.xi.map(P).map((d, i) => (i === 0 ? d.def * 0.85 + d.pas * 0.15 : (d.spd + d.sho + d.pas + d.dri + d.def) / 5 + 6));
  return Math.round(r.reduce((a, b) => a + b, 0) / r.length);
}
