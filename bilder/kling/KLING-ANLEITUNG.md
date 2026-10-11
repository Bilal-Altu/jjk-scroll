# Vier Clips in Kling – Schritt für Schritt

## Variante NUR STARTBILD (Gratis-Tarif, kein Endbild-Feld)

Je Clip nur EIN Bild hochladen. Die Übergänge zwischen den Clips baut die Seite selbst.

| Clip | Bild hochladen | Speichern als |
|---|---|---|
| 4 (zuerst testen) | clip4-start.jpg | clip4-nobara.mp4 |
| 1 | clip1-start-UND-ende.jpg | clip1-sukuna.mp4 |
| 2 | clip2-start.jpg | clip2-gojo.mp4 |
| 3 | clip2-ende_clip3-start.jpg | clip3-auge.mp4 |

Clip 4 · Nobara
```
She swings the raised hammer down in one fast, powerful arc and strikes the iron nail in the straw doll on the left. At the moment of impact a burst of blue-black energy and sparks explodes from the nail, rain droplets scatter and her hair whips back from the shockwave. Static camera, the framing stays the same, no cuts.
```

Clip 1 · Sukuna
```
Static camera. Crimson mist drifts slowly across the shrine, embers float upward, the lantern flames flicker, his red eyes glow and pulse faintly, the black scarf moves slightly in the wind. He stays still and calm, only a slow ominous breath. No camera movement.
```

Clip 2 · Gojo
```
He slowly pulls the black blindfold further down with one finger, his ice-blue eyes ignite and glow brighter, strands of white hair drift in a light wind, blue energy particles float around him. He keeps looking straight into the camera with a faint smirk. Slow, smooth camera push-in. No cuts.
```

Clip 3 · Auge
```
Extreme close-up. The glowing blue iris slowly swirls like a galaxy, tiny stars drift inside it, the pupil slowly widens and the light pulses brighter. Very slow camera push-in toward the pupil. The eye does not blink. No cuts.
```

---

## Variante MIT ENDBILD (bezahlter Tarif)

Die Bilder in diesem Ordner sind schon im richtigen Format (16:9).

## Einstellungen (für alle vier gleich)

1. Kling öffnen → **Video** → **Image to Video**
2. Ein Modell wählen, bei dem es das Feld **„End Frame“ / „Endbild“** gibt (z. B. Kling 2.1 im **Professional**-Modus).
   Fehlt das Feld, ein anderes Modell wählen. Ohne Endbild funktioniert es nicht.
3. Startbild und Endbild hochladen (siehe Tabelle)
4. Prompt und Negativ-Prompt einfügen
5. Länge **5 s**, Qualität **Professional / High**
6. Pro Clip **2 Versuche**, den saubersten nehmen. Verzieht sich ein Gesicht oder verdoppelt sich eine Hand: verwerfen.
7. Herunterladen und genau so benannt in den Ordner `jjk-scroll/bilder/video/` legen

| Clip | Startbild | Endbild | Speichern als |
|---|---|---|---|
| 1 | clip1-start-UND-ende.jpg | **dasselbe Bild** | clip1-sukuna.mp4 |
| 2 | clip2-start.jpg | clip2-ende_clip3-start.jpg | clip2-gojo-auge.mp4 |
| 3 | clip2-ende_clip3-start.jpg | clip3-ende.jpg | clip3-void.mp4 |
| 4 | clip4-start.jpg | clip4-ende.jpg | clip4-nobara.mp4 |

## Negativ-Prompt (für alle vier)

```
morphing, face distortion, changing face, extra fingers, extra limbs, extra hammer, duplicate character, cut, scene change, flicker, text, watermark, blurry, low quality
```

## Clip 1 · Sukuna (Endlosschleife)

```
Static camera. Crimson mist drifts slowly across the shrine, embers float upward, the lantern flames flicker, his red eyes glow and pulse faintly, the black scarf moves slightly in the wind. He stays still and calm, only a slow ominous breath. No camera movement.
```

## Clip 2 · Gojo → Auge

```
One single continuous shot: a smooth camera push-in, slow at first and then accelerating, straight into his right eye (the eye on the right side of the image) until the eye fills the whole frame. His face does not change, the glowing blue iris becomes brighter, strands of white hair drift past the lens. No cuts.
```

## Clip 3 · Auge → Infinite Void

```
One single continuous shot: the camera keeps pushing into the pupil. The glowing blue iris expands and opens like a portal, and the camera flies through the pupil into an infinite swirling galaxy of stars, nebulae and blue light, accelerating. No cuts.
```

## Clip 4 · Nobaras Hammerschlag

```
She swings the hammer down in one fast, powerful arc and strikes the nail in the straw doll. At the moment of impact a burst of blue-black energy and sparks explodes outward, rain droplets scatter and her hair whips back. Static camera, no cuts.
```

## Wenn etwas nicht klappt

- **Clip 2 oder 3 wird matschig:** im Prompt „slow at first and then accelerating“ streichen und nur „smooth constant camera push-in“ schreiben.
- **Clip 4: Hammer verdoppelt sich oder Arm verbiegt:** neu generieren; hilft das nicht, Länge auf 5 s lassen und „fast“ durch „powerful“ ersetzen.
- Ein Clip will gar nicht: Schick ihn mir trotzdem. Oft reichen mir 2–3 Sekunden davon.
