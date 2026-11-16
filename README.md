# Fotbal 3D

Joc de fotbal 3D care rulează în browser, pe calculator și pe telefon. Făcut de distracție, fără nimic de instalat în afară de un browser.

## Cum îl pornești

Pe Mac: dublu-click pe `start.command`. Se deschide singur în browser, iar în fereastra de terminal apare și adresa pentru telefon (telefonul trebuie să fie pe același Wi-Fi).

Pe Windows: dublu-click pe `start.bat`. Se deschide singur în browser. Nu închide fereastra neagră cât timp joci.

Pe orice alt sistem, din folderul jocului:

```
python3 -m http.server 8123
```

apoi deschide `http://localhost:8123`.

## Comenzi

| | Jucător 1 | Jucător 2 |
|---|---|---|
| Mișcare | `W` `A` `S` `D` | săgeți |
| Pasă / schimbă jucătorul | `F` | `K` |
| Pasă în adâncime | `R` | `O` |
| Șut (ține apăsat pentru putere) / deposedare | `G` sau `Space` | `L` |
| Sprint | `Shift` stânga | `Shift` dreapta |
| Pauză | `P` sau `Esc` | |

Pe telefon: joystick în stânga și butoanele PASĂ, ADÂNCIME, ȘUT, SPRINT în dreapta. Ține telefonul pe orizontală.

## Ce are

- Meci 11 la 11, două reprize a câte 3 minute, contra calculatorului (trei niveluri de dificultate) sau în doi pe aceeași tastatură.
- Reguli: faulturi, lovituri libere, penalty, cartonașe, ofsaid, cornere, auturi, schimbarea terenului la pauză.
- Jucători cu atribute diferite (viteză, șut, pase, dribling, deposedare).
- Reluarea golului, radar, statistici la pauză și la final.

## Unde e codul

- `index.html` — pagina, meniul și butoanele de pe ecran.
- `src/data.js` — echipele, jucătorii și atributele lor. Aici schimbi nume și note.
- `src/world.js` — stadionul, mingea și modelul jucătorilor.
- `src/main.js` — regulile jocului, comenzile, inteligența calculatorului.
- `src/audio.js` — sunetele, generate în browser.
- `lib/` — biblioteca Three.js, folosită pentru grafica 3D.

Pentru teste: `?demo` pornește un meci calculator contra calculator, iar `?touch` forțează comenzile de telefon pe calculator.
