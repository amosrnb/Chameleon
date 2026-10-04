# Chameleon — Konzept

> Stand: 02.10.2026 · Status: **Konzeptphase, noch nichts davon ist implementiert.**
>
> **Chameleon** ist eine App zum **Lernen für Schüler und Studierende**. Dieses Dokument
> beschreibt die Grundstruktur der App, ihre Werkzeuge, die technische Basis und die noch
> offenen Fragen. Es ist die verbindliche Grundlage für die Umsetzung: Neue Entscheidungen
> werden an den Leitsätzen unten gemessen und hier nachgetragen.

## Ziel

Wissen aus Unterricht, Vorlesung und Hausaufgaben soll **dauerhaft und geordnet**
erhalten bleiben, in einer **Wissensbibliothek**, die über die Schul- und Studienjahre
mitwächst. Der Kern-Ablauf: Material erfassen → verstehen → einarbeiten → üben → planen →
Fortschritt sehen.

## Die zwei Grundsteine: Workstation und Filemanager

Chameleon besteht aus **zwei Grundsteinen**. Alles andere baut darauf auf.

```
┌─────────────────────────┐      ┌──────────────────────────────┐
│  🛠 WORKSTATION          │      │  🗂 FILEMANAGER               │
│  „Was mache ich?"       │      │  „Wo liegt es?"              │
│                         │      │                              │
│  Notizen                │      │  🗓 Schuljahr 2026/27         │
│  Todos                  │ ◄──► │    📘 Mathe                  │
│  Karteikarten           │      │      📁 Analysis             │
│  Kalender               │      │        ✏️ Mitschrift 03.10.   │
│  Zeiterfassung          │      │        🃏 Deck: Regeln        │
│  …                      │      │        📄 Arbeitsblatt.pdf    │
│                         │      │  📚 Wissensbibliothek        │
└─────────────────────────┘      └──────────────────────────────┘
          dieselben Daten, zwei Blickwinkel
```

- **Workstation:** alle Werkzeuge (Teil B). Sie zeigt Elemente nach *Tätigkeit*, quer
  durch alle Ordner.
- **Filemanager:** ein Ordnerbaum wie Google Drive. Er zeigt Elemente nach ihrem *Ort*.
  Hier liegen auch Fächer, Projekte, Zeiträume und die Wissensbibliothek.
- Beide greifen auf **dieselben Daten** zu. Nichts wird doppelt gespeichert.

Details siehe A.1.

## Die vier Leitsätze

Jede Entscheidung in Chameleon wird an diesen Leitsätzen gemessen:

1. **Kontext statt Raten.** Wie sich ein Element verhält, ergibt sich aus seinem Ort und
   seiner Entstehung (Ordner, Stundenplan), nicht aus Vermutungen der KI.
2. **Du entscheidest, wann etwas fertig ist.** Chameleon erinnert nur.
3. **Die KI schlägt vor, sie ändert nie stillschweigend.** Jede KI-Änderung wird als
   Vorschlag gezeigt und muss bestätigt werden.
4. **Originale bleiben unverändert.** Die Bibliothek wird aus ihnen abgeleitet,
   Änderungen an Originalen werden nachverfolgt.

---

# Teil A — Grundstruktur

## A.1 Die zwei Grundsteine: Workstation und Filemanager

| Bereich | Frage | Inhalt |
|---|---|---|
| **Workstation** | „Was mache ich?" | Werkzeuge: Notizen, Todos, Karteikarten, Kalender … (Teil B) |
| **Filemanager** | „Wo liegt es?" | Ordnerbaum wie Google Drive, beliebig tief verschachtelt |

Beide Bereiche zeigen **dieselben Daten**, nur aus zwei Blickwinkeln. Ein Todo, das in
`Mathe/Analysis` angelegt wird, erscheint auch im Todo-Werkzeug (filterbar nach Ordner),
und umgekehrt.

**Jedes Element hat genau einen Ort** im Filemanager. Zusätzlich darf es beliebig
verlinkt werden.

## A.2 Arten von Elementen

| Art | Beispiele | Darstellung im Filemanager |
|---|---|---|
| **Container** | Ordner, Fach, Projekt, Zeitraum | als Ordner |
| **Dokumente** | Notiz, Kartendeck, Canvas, hochgeladenes Material (PDF, Foto, Folien, Word) | wie Dateien |
| **Kleinteile** | Todo, Hausaufgabe, Termin, Prüfung, einzelne Karteikarte | **nicht** als Dateien, sondern in der Übersicht des Ordners |

**Übersicht:** Jeder Ordner zeigt oben die offenen Todos und die nächsten Termine aus
sich selbst *und allen Unterordnern*, darunter die Dateien. Ein Fach-Ordner wird so
automatisch zur Fach-Seite.

Hochgeladenes Material ist ein eigenes Dokument. Das Original bleibt erhalten, daraus
erzeugte Notizen verweisen darauf.

## A.3 Ordnertypen

Es gibt **ein** Konzept, den Ordner. Er kann einen Typ bekommen, der zusätzliche
Funktionen freischaltet. Der Typ lässt sich nachträglich ändern.

**Alle Ordner:** verschachteln, umbenennen, verschieben, Farbe/Icon, Übersicht,
archivieren/Papierkorb, Einarbeitungs-Einstellung (A.5.3), später Teilen.

| Typ | Zusätzliche Funktionen |
|---|---|
| 📁 **Ordner** | nichts, nur zum Sortieren |
| 📘 **Fach** (für Studierende „Kurs"/„Modul") | Farbe vererbt sich an den Inhalt, Stundenplan-Zeiten (→ Kalender), Lehrer/Dozent, Prüfungen mit Stoff, Lernstand, optional Noten, Verknüpfung zu einem Bibliotheksgebiet |
| 🎯 **Projekt** | Ziel, Abgabedatum, Fortschritt aus Todos, Meilensteine, später Mitglieder |
| 🗓 **Zeitraum** (Schuljahr, Halbjahr, Semester) | Start/Ende, eigener Stundenplan, als Ganzes archivierbar |

- **Kein eigener Typ „Thema“:** Unterordner eines Fachs sind die Themen.
- **Die Prüfung ist ein Kleinteil** (ein besonderer Termin) in einem Fach. Sie verweist auf
  Ordner, Dokumente und Wissensseiten als Stoff.
- **Fach-Vorlage:** Beim Anlegen eines Fachs kann eine Standardstruktur übernommen werden,
  z. B. `HA`, `Aufgaben`, `Notizen`, `Arbeitsblätter`, mit passenden
  Einarbeitungs-Einstellungen.

```
🗓 Schuljahr 2026/27
   📘 Mathe
      📁 Analysis
      📁 Stochastik
      🎯 Projekt: Statistik-Umfrage
   📘 Bio
🗓 Schuljahr 2025/26        (archiviert)
📁 Privat
📚 Bibliothek               (eigener Wurzelbereich, siehe A.4)
```

## A.4 Arbeitsbereich und Wissensbibliothek

Unterricht läuft **zeitlich** ab, Wissen ist aber **thematisch** geordnet. Deshalb gibt
es zwei Ebenen:

- **Arbeitsbereich** (Zeiträume, Fächer, Ordner): Alltag, Mitschriften, Arbeitsblätter,
  Hausaufgaben. Er darf unordentlich sein und wird am Ende eines Zeitraums archiviert.
- **Wissensbibliothek** (eigener Wurzelbereich im Filemanager): thematisch geordnet und
  dauerhaft, sie wird **nie archiviert**. Wissen aus Klasse 10, 11 und 12 sammelt sich an
  einem Ort.

Jedes Fach im Arbeitsbereich ist mit einem Bibliotheksgebiet verknüpft
(z. B. `Mathe 26/27` → `📚 Mathematik`).

### Aufbau eines Themas in der Bibliothek

Ein gemeinsamer Themenbaum. Jedes Thema hat zwei Teile:

```
📚 Mathematik / Analysis / Ableitungen
   ├─ 📂 Quellen        ← Teil 1: Rohdateien, thematisch geordnet
   │    ✏️ Mitschrift 03.10. (Kl. 10)
   │    📄 Arbeitsblatt Ableitungen.pdf
   │    ✏️ Mitschrift 14.02. (Kl. 11)
   └─ 📖 Wissensseite   ← Teil 2: von der KI erstellt
        Abschnitt „Kettenregel"  → Quelle: Mitschrift 14.02.
        🃏 Karten an Abschnitten
```

- **Quellen sind Verknüpfungen, keine Kopien.** Die Datei behält ihren Ort im
  Arbeitsbereich und ist in der Bibliothek zusätzlich unter ihrem Thema sichtbar, auch
  wenn der Zeitraum archiviert ist. Ein Dokument kann zu mehreren Themen gehören.
- **Jeder Abschnitt einer Wissensseite nennt seine Quellen.** Man kann vom Abschnitt
  direkt zum Original springen.
- **Wissensseiten dürfen selbst bearbeitet werden.** Eigene Änderungen werden als „von
  dir“ markiert. Die KI überschreibt sie beim nächsten Einarbeiten nicht (Leitsatz 3).

## A.5 Die Wissenspipeline

```
Erfassen → Nachbereiten (offen) → Fertig → Einarbeiten (KI-Vorschlag, bestätigen) → Festigen → Anwenden
```

### A.5.1 Erfassen

- Die Art eines Dokuments ergibt sich aus dem Kontext (Leitsatz 1). Wer während einer
  Stunde laut Stundenplan eine Notiz öffnet, bekommt „Mitschrift Mathe, 03.10." im
  richtigen Ordner vorgeschlagen. Ein Upload wird zu Material.
- Während des Unterrichts lassen sich Lücken schnell markieren („❓ fehlt noch“).

### A.5.2 Nachbereiten

- Unfertige Mitschriften bleiben **offen**, das ist der Normalzustand.
- Die KI kann Lücken füllen, **nur als Vorschlag**, z. B. aus dem Arbeitsblatt desselben
  Tages. Übernommene Ergänzungen sind als KI-ergänzt markiert.

### A.5.3 Was wird eingearbeitet? (Einarbeitungs-Einstellung)

- **Ordner** haben die Einstellung „In Bibliothek einarbeiten“:
  ✅ ja / ⛔ nein / ↳ wie übergeordneter Ordner.
- **Dokumente** haben dieselbe Einstellung. Was am Dokument eingestellt ist, gilt vor der
  Einstellung des Ordners (Einzelfreigabe oder Ablehnung).
- Neue Unterordner übernehmen die Einstellung ihres übergeordneten Ordners. Neue Ordner
  ohne übergeordneten Ordner stehen auf ⛔: Die Bibliothek bekommt nur, was bewusst
  freigegeben wird.
- Beim **Verschieben** gilt die Regel des neuen Ordners. Bereits Eingearbeitetes bleibt
  eingearbeitet und verlinkt.

```
📘 Physik                    ↳
   📁 HA                     ⛔
   📁 Aufgaben               ⛔
   📁 Notizen                ✅
      ✏️ Mitschrift 03.10.    ↳ ✅ → offen → Inbox
      ✏️ Klausurtermine       ⛔ (für dieses Dokument abgelehnt)
   📁 Arbeitsblätter         ✅
```

### A.5.4 Status eines einzuarbeitenden Dokuments

```
 ✏️ offen ──► ✅ fertig ──► 📚 eingearbeitet ──► ⚠️ geändert ─┐
    │                               ▲                         │
    └──► ⛔ abgelehnt                └─────────────────────────┘
```

- **Inbox:** zeigt alle Dokumente, die eingearbeitet werden sollen und **offen** oder
  **geändert** sind. Aktionen: *Fertig*, *Ablehnen*, *Später*. Dazu gibt es
  Sammelaktionen und eine Gruppierung nach Fach, damit die Inbox nicht überläuft.
- **„Fertig“ startet die Einarbeitung sofort.** Der KI-Vorschlag wird direkt zum
  Bestätigen angezeigt.
- **Geändert:** Wird ein eingearbeitetes Original später ergänzt, schlägt Chameleon vor,
  nur die Änderungen nachzutragen.

### A.5.5 Einarbeiten

Der KI-Vorschlag enthält:
- Zu welchem Thema bzw. welchen Themen das Dokument gehört (→ Quellen)
- Was neu ist, was bereits in der Wissensseite steht und was nicht übernommen wird
  (z. B. Organisatorisches)
- Optional abgeleitete Kleinteile („Test am Freitag“ → Termin anlegen?)

Die Änderungen an der Wissensseite erscheinen als Vorschau. Man kann sie bestätigen,
anpassen oder ablehnen. Von dir bearbeitete Stellen bleiben unberührt.

### A.5.6 Festigen und Anwenden

- Karteikarten und Übungsfragen hängen an **Abschnitten** einer Wissensseite. Der
  Abschnitt ist die kleinste Einheit des Wissens.
- Der Lernstand wird pro Abschnitt erfasst und auf Thema und Fach hochgerechnet. Er ist
  in der Wissensseite sichtbar.
- **Hausaufgaben** sind eine besondere Art von Todo. Sie sind standardmäßig bis zur
  nächsten Stunde des Fachs fällig, und man kann ein Ergebnis anhängen.
- **Prüfungen** verweisen auf Wissensseiten als Stoff, daraus entsteht später der
  Lernplan.

---

# Teil B — Werkzeuge der Workstation

Jedes Werkzeug arbeitet auf den Elementen aus Teil A. Was ein Werkzeug anlegt, bekommt
einen Ort im Filemanager. Was im Filemanager liegt, erscheint im passenden Werkzeug.

## B.1 Notizen

- Rich-Text-Editor mit Überschriften, Listen, Checklisten, Zitat, Callout/Merkkasten,
  Toggle/Aufklappbereich, Codeblock mit Syntax-Hervorhebung, Trennlinie, Hervorhebung,
  Unterstreichen/Durchstreichen
- Slash-Menü (`/`) zum Einfügen von Blöcken
- Block-Griff mit „Umwandeln in …“ und Block-Menü, Auswahl-Werkzeugleiste
- Tabellen: Spaltenbreite per Maus und Touch ändern, wachsende/scrollende Tabellen,
  Kompaktmodus für schmale Inhalte (Zahlen), ausgegraute Kopfspalte, Menü über die Kopfzeile
- Bilder (größenveränderbar) und Dateianhänge; Vorschau für PDF, Word (`.docx`) und
  PowerPoint (`.pptx`) direkt in der Notiz
- Canvas-Boards als Einbettung in Notizen
- Gliederung (Outline-Panel), Notizsuche
- Vorlagen: mitgelieferte Lernvorlagen (z. B. Mitschrift, Zusammenfassung, Referat) und
  selbst gespeicherte
- Export als PDF und Word
- Archiv und Papierkorb
- Auto-Save
- Notizen haben eine **Art** (z. B. Mitschrift, Notiz, Wissensseite), die sich aus dem
  Kontext ergibt (A.5.1), sowie die Einarbeitungs-Einstellung und den Status aus A.5
- Abschnitte von Wissensseiten haben **stabile IDs**, damit Karten, Quellen und Lernstand
  daran hängen können

## B.2 KI-Import (Einstieg in die Wissenspipeline)

- Bilder, PDFs, Word- und PowerPoint-Dateien hochladen → strukturierte Lernnotizen
  (verdichtet statt Wort für Wort abgeschrieben), inklusive Merkkästen
- Das Original wird als **Material** gespeichert, die erzeugte Notiz verweist darauf
  (Leitsatz 4)
- Eingebettete Bilder aus Word- und PowerPoint-Dateien gehen mit an die KI
- Eigene Anweisungen an die KI vor dem Import
- Lange Dokumente werden in Teilen verarbeitet, damit nichts verloren geht
- Automatischer neuer Versuch bei Rate-Limits des KI-Anbieters
- Rückfall auf OCR (z. B. Tesseract) mit Begründung, wenn die KI nicht verfügbar ist
- Bei fehlerhaften KI-Antworten bleiben die bereits importierten Inhalte erhalten
- Rückgängig entfernt die importierten Notizen
- Anbieterneutraler Serverendpunkt, standardmäßig **Mistral**, alternativ **Groq**.
  Mistral als EU-Anbieter ist ein DSGVO-Argument gegenüber Schulen und Eltern.

## B.3 Karteikarten

Ein **Kernwerkzeug** von Chameleon.

- Decks sind **Dokumente** im Filemanager, mit Farbe und Reihenfolge
- Karten mit Vorder- und Rückseite, optional mit Bildern
- Karten hängen an **Abschnitten von Wissensseiten** (A.5.6). Von der Karte springt man zur
  Erklärung.
- Wiederholung nach SM-2 (Fälligkeit, Intervall, Leichtigkeitsfaktor)
- Selbst antworten vor dem Aufdecken
- Bewertung Richtig/Falsch (statt vier Stufen wie bei Anki), Fortschrittsbalken in der
  Lernsitzung
- Karten aussetzen

## B.4 Todos

- Status offen / in Arbeit / erledigt, Subtasks, Fälligkeit, Einplanen im Kalender
- Wiederkehrende Todos
- Ansicht „Alle Todos“, Filter (auch nach Ordner), Inline-Bearbeitung, Detail-Seitenleiste
- Abhak-Animation
- Todos gehören zu einem **Ordner** und erscheinen in dessen Übersicht (A.2)
- Besondere Art **Hausaufgabe** (A.5.6)

## B.5 Kalender

- Tag-, Wochen- und Monatsansicht, Drag & Drop (Todos einplanen, Blöcke verschieben)
- Wiederkehrende Termine (täglich/wöchentlich/monatlich/jährlich/benutzerdefiniert,
  Wochentagsauswahl, Enddatum)
- Getrackte Zeit dezent im Kalender einblenden
- **Stundenplan-Zeiten** aus Fächern erscheinen automatisch
- Besondere Terminart **Prüfung** (A.3)

## B.6 Zeiterfassung

- Timer (Stoppuhr und Countdown mit Zieldauer), Timer-Chip in der Kopfzeile
- Lernzeit pro Todo, Fach und Thema

## B.7 Lernstand (Auswertung)

- Kennzahlen, 12-Wochen-Aktivitäts-Heatmap, Zeitverteilung
- Lernstand pro Fach und Thema (aus A.5.6). Wie genau diese Ansicht aussieht, ist offen.

## B.8 Inbox

- Überfällig / heute fällig / anstehende Termine, schnelles Einplanen und Verschieben
- **Nachbereiten-Liste** der Wissenspipeline (A.5.4)

## B.9 Canvas

- Eigene Zeichenfläche: Stift, Linie, Pfeil, Rechteck, Ellipse, Text, Sticky Notes,
  Verbinder zwischen Elementen, Radierer, Hand- und Auswahlwerkzeug
- Boards sind Dokumente im Filemanager und lassen sich in Notizen einbetten

## B.10 Horizons (offen)

- Planungsseiten mit frei anlegbaren Spalten (z. B. Tag/Woche/Monat/Jahr), Drag & Drop
  von Todos zwischen Spalten, Projektziele
- Ob Horizons in Chameleon enthalten ist, ist noch nicht entschieden (Teil E).

---

# Teil C — App-weite Funktionen und technische Basis

## C.1 App-weite Funktionen

- Kommando-Palette (Cmd/Ctrl + K) mit Fuzzy-Suche
- Quick-Add (Todo, Termin, Notiz) inklusive Wiederholung
- Seitenleiste auf dem Desktop, Bottom-Navigation auf dem Handy
- Hell-/Dunkelmodus (tiefschwarzer Dark Mode), einstellbare Akzentfarbe
- Fehlerbildschirm statt leerer Seite, wenn eine Ansicht abstürzt
- Demo-Datensatz zum Ausprobieren
- Englische Oberfläche

## C.2 Technische Basis

- **Stack:** Vite, React, TypeScript, Tailwind CSS, Zustand (persistiert), dnd-kit, Tiptap
  (Editor), Recharts, date-fns, react-router, Phosphor Icons
- **Dateiverarbeitung:** pdf.js, docx / docx-preview, JSZip, Tesseract.js
- **Lokal-first:** Der lokale Store ist die Wahrheit für die Oberfläche. Alle Aktionen sind
  synchron, es gibt keine Ladezustände in den Ansichten, und alles funktioniert offline.
- **Optionaler Sync über Supabase:** Änderungen werden erkannt und gebündelt gesendet bzw.
  geholt. Konflikte: Last-Write-Wins pro Zeile. Gelöschtes wird zunächst als Grabstein
  (`deleted_at`) markiert und nach 30 Tagen endgültig entfernt. Dazu Realtime und Row
  Level Security.
- **Dateispeicher:** Anhänge und Material liegen in Supabase Storage. In Dokumenten stehen
  stabile Verweise statt ablaufender URLs.
- **Anmeldung:** E-Mail + Passwort, Magic Link, Passwort zurücksetzen, Konto löschen,
  lokale Daten beim ersten Anmelden ins Konto übernehmen
- **Plattformen:** Web, Android über Capacitor
- **Hosting:** Vercel, alternativ Self-Hosting mit automatischen Updates
- **Öffentliche Landingpage** für neue Nutzer

---

# Teil D — Ideen für später

Diese Ideen sind noch nicht in die Struktur eingeordnet:

- Karten und Übungsfragen automatisch aus Wissensseiten erzeugen
- **Prüfungs-Planer:** Lernblöcke werden rückwärts vom Prüfungsdatum in den Kalender
  gelegt und passen sich an verpasste Tage an
- Übungsmodi über Karteikarten hinaus: Multiple Choice, Lückentext, „Erklär's mit
  eigenen Worten“ mit KI-Feedback
- „Erklär mir das“ in Notizen: vereinfachen, Beispiel, Übungsfrage
- Foto-Import von Tafelbild und Arbeitsblatt, optimiert fürs Handy
- Lerngruppen: Decks und Notizen teilen
- Motivation: Streaks, Tagesziel, Lernzeit (dezent, nicht kindisch)
- Noten und Notenschnitt pro Fach

---

# Teil E — Offene Fragen

**Struktur**
- Regeln für die Verschachtelung: alles erlaubt oder sanfte Grenzen (z. B. kein Fach in
  einem Fach)?
- Ist der Zeitraum optional? (Tendenz: ja)
- Wie wird der Themenbaum der Bibliothek gegliedert: frei oder fest Gebiet → Thema →
  Wissensseite?
- Wo landen Karten, die direkt in einer Mitschrift erstellt wurden, bevor sie
  eingearbeitet ist? (Tendenz: Sie wandern beim Einarbeiten mit.)
- Welche Werkzeuge gehören in die Workstation? (Horizons ja/nein, Canvas, Gestaltung der
  Lernstand-Ansicht)

**Produkt**
- Zuerst Studierende oder Schüler? (Bisherige Tendenz: zuerst Studierende, weil der Weg
  „Folien → Notizen → Karten“ dort am stärksten ist und Minderjährige eine
  DSGVO-Einwilligung brauchen)
- Monetarisierung: Freemium (z. B. begrenzte KI-Imports), Abo, Schullizenzen?
- iOS-App: Für Schüler wichtig. Capacitor kann iOS, nötig sind aber ein Mac und ein
  Apple-Developer-Account.
- Sprache und Markt: zuerst DACH oder international?

**Technik**
- Datenmodell: Ordnerbaum, Orte, Verknüpfungen, Einarbeitungs-Status, Abschnitts-IDs in
  Notizen (stabil über Bearbeitungen hinweg)
- Sync für Wissensseiten, wenn KI und Nutzer dieselbe Seite ändern: Last-Write-Wins pro
  Zeile ist hier vermutlich zu grob.
