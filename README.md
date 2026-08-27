# RF Link Budget Calculator

Ein eigenständiger, offline-fähiger Web-Calculator zur Berechnung des Link Budgets von
Funkmikrofon- (RF Mic) und In-Ear-Monitoring-Strecken (IEM) für Live-Beschallung.

Basiert auf der Methodik von Stephen Pavlik ("Avoid RF Dropouts Through Proper Gain
Staging", Sound Design Live, sounddesignlive.com).

## macOS App

Eine native macOS-App (echtes Fenster statt Browser-Tab) gibt es in [`macos/`](macos/README.md) –
fertiges App-Bundle zum Draufziehen in den `Programme`-Ordner oder selbst bauen mit
`macos/build_app.sh`.

## Web-Version

Alternativ einfach `index.html` im Browser öffnen (kein Build, kein Server, keine Abhängigkeiten).

Es gibt zwei Tabs:

- **RF Microphone Link Budget** – für Funkmikrofonstrecken (Sender am Körper/Hand → Empfänger im Rack)
- **IEM Link Budget** – für In-Ear-Monitoring-Strecken (Sender im Rack → Bodypack-Empfänger)

Jedes Eingabefeld aktualisiert das Ergebnis live. Über den Button "Beispiel aus PDF laden"
lassen sich die Rechenbeispiele aus der Vorlage nachvollziehen.

## Formeln

Alle Werte in dB / dBm.

**Sendeleistung → dBm:** `10 * log10(P_mW)`

**Freiraumdämpfung (FSPL):**
`20*log10(Entfernung in m) + 20*log10(Frequenz in MHz) - 27.55`

**Polarisations-Fehlanpassung (Verlust, positiver Wert):**
`-20*log10(cos(Winkel in Grad))`

### RF Microphone Link Budget

```
Empfangspegel =
  TX-Sendeleistung (dBm)
  + TX-Antennengewinn
  - Freiraumdämpfung
  - Polarisations-Fehlanpassung
  + RX-Antennengewinn
  - Kabelverlust (Antenne → Splitter)
  - Steckerverlust (Antenne → Splitter)
  + Splitter Gewinn/Verlust
  - Kabelverlust (Splitter → Empfänger)
  - Steckerverlust (Splitter → Empfänger)
```

### IEM Link Budget

```
Empfangspegel (am Bodypack) =
  TX-Sendeleistung (dBm)
  - Kabelverlust (TX → Combiner)
  - Steckerverlust (TX → Combiner)
  + Combiner Gewinn/Verlust
  - Kabelverlust (Combiner → Sendeantenne)
  - Steckerverlust (Combiner → Sendeantenne)
  + TX-Antennengewinn
  - Polarisations-Fehlanpassung
  - Freiraumdämpfung
  + RX-Antennengewinn (Bodypack)
```

## Kabelverlust aus Kabeltyp + Länge

Bei jedem Kabelverlust-Feld kann per Checkbox "aus Kabeltyp + Länge berechnen"
umgeschaltet werden. Der dB-Wert wird dann automatisch aus Kabeltyp, Länge
und der jeweils eingetragenen Frequenz berechnet (Kabeldämpfung ist
frequenzabhängig) und in das dB-Feld eingetragen; manuelles Bearbeiten ist in
diesem Modus deaktiviert, bis die Checkbox wieder ausgeschaltet wird.

Hinterlegte Kabeltypen (Dämpfung in dB pro 100m bei Referenzfrequenzen,
dazwischen/darüber hinaus interpoliert bzw. extrapoliert über die für
Koaxkabel typische &radic;Frequenz-Näherung). RG-/LMR-/Belden-Werte sind
typische Herstellerangaben (ca.-Werte, aus dB/100ft-Datenblattangaben
umgerechnet); Aircell&nbsp;7/5 stammen direkt aus dem
SSB-Electronic-Datenblatt:

| Kabeltyp                | ca. dB/100m @ 400 MHz | ca. dB/100m @ 900 MHz |
|--------------------------|------------------------|-------------------------|
| RG58                     | 32.5                    | 51.5                    |
| RG8X (Mini-8)            | 19.4                    | 30.5                    |
| RG213 / RG8              | 14.4                    | 23.6                    |
| Belden 9913 / 9913F7     | 7.9                     | 12.1                    |
| LMR-195                  | 25.9                    | 39.7                    |
| LMR-240                  | 16.1                    | 24.6                    |
| LMR-400                  | 8.2                     | 12.8                    |
| Aircell 7                | 12.4                    | 19.3                    |
| Aircell 5                | 18.3                    | 27.9                    |

Für den tatsächlich verbauten Kabeltyp/die genaue Charge im Zweifel das
Datenblatt des Herstellers prüfen — bei RG-/LMR-/Belden-Kabeln sind die
hinterlegten Werte branchenübliche Näherungen, keine Garantiewerte.

## Signalbewertung

Die Ergebnisanzeige orientiert sich an den in der Vorlage genannten Referenzwerten
-40 dBm / -70 dBm / -90 dBm:

| Empfangspegel      | Bewertung    |
|--------------------|--------------|
| ≥ -40 dBm          | Exzellent    |
| -40 bis -70 dBm     | Gut          |
| -70 bis -90 dBm     | Grenzwertig  |
| < -90 dBm          | Kritisch     |

## Einschränkungen

Die Berechnung berücksichtigt **keine** zusätzlichen Verluste durch Körperabschattung
(body loss), Fading oder Antennen-Fehlanpassung. In der Praxis werden dafür oft
zusätzlich 20–30 dB Sicherheitsreserve empfohlen.
