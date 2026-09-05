# LocalRoast: Review-Maßnahmen und Rezeptanforderung

Stand: 5. September 2026

Dieses Dokument beschreibt die konkreten Maßnahmen aus dem Code-Review und die neue fachliche Anforderung, Kaffeefilter und Filterpapier pro Rezept zu erfassen.

## Prioritäten

- **P1:** blockiert Build, Kernfunktion oder sicheren Betrieb
- **P2:** wichtig für Datenqualität, Betriebssicherheit und Deployment
- **P3:** technische Qualität und Wartbarkeit

## 1. Fehlender `Navbar`-Import (P1)

**Problem:** `src/app/layout.tsx` rendert `Navbar`, importiert die Komponente aber nicht. Das Webprojekt kann deshalb nicht erfolgreich kompiliert werden.

**Lösung:**

- In `src/app/layout.tsx` den Import `import { Navbar } from "@/components/navbar";` ergänzen.
- Einen CI-Schritt mit `npm run build` einrichten, damit fehlende Imports vor einem Deployment erkannt werden.

**Erledigt, wenn:** Der Produktions-Build läuft ohne TypeScript-Fehler durch und die Navigation erscheint auf Startseite und Dashboard.

## 2. Dynamische Route-Parameter unter Next.js 16 (P1)

**Problem:** Die Handler in `src/app/api/recipes/[id]/route.ts` behandeln `params` synchron. In Next.js 16 ist `params` ein Promise.

**Lösung:**

- In GET, PUT und DELETE `params` als `Promise<{ id: string }>` typisieren.
- Am Anfang jedes Handlers `const { id } = await params;` ausführen.
- Danach ausschließlich die lokale Variable `id` verwenden.
- Einen API-Test für GET, PUT und DELETE mit einer realen Rezept-ID ergänzen.

**Erledigt, wenn:** Alle drei Handler bauen unter Next.js 16 und liefern für vorhandene, fremde und unbekannte IDs die erwarteten Statuscodes.

## 3. Fehlende Seiten zum Erstellen und Bearbeiten von Rezepten (P1)

**Problem:** Das Dashboard verlinkt auf `/dashboard/new` und `/dashboard/recipe/[id]`, aber beide Seiten fehlen.

**Lösung:**

- `src/app/dashboard/new/page.tsx` mit einem Formular zum Erstellen eines Rezepts anlegen.
- `src/app/dashboard/recipe/[id]/page.tsx` zum Anzeigen und Bearbeiten eines Rezepts anlegen.
- Eine wiederverwendbare Komponente `RecipeForm` für beide Seiten erstellen.
- Speichern, Löschen, Ladezustand, Validierungsfehler und Bestätigungsdialog für das Löschen abbilden.
- Nach erfolgreichem Speichern zum Rezept oder Dashboard navigieren und die betroffenen Daten aktualisieren.

**Erledigt, wenn:** Ein angemeldeter Benutzer ein Rezept vollständig anlegen, öffnen, ändern und löschen kann, ohne auf eine 404-Seite zu gelangen.

## 4. Unsicheres Entwicklungs-Login (P1)

**Problem:** Die festen Zugangsdaten `test@example.com` / `password` sind unabhängig von der Umgebung aktiv. Der zurückgegebene Benutzer mit ID `1` wird zudem nicht in der Datenbank angelegt und kann deshalb keine konsistenten Rezeptbeziehungen erzeugen.

**Lösung:**

- Den Credentials-Provider in Produktion vollständig deaktivieren.
- Falls er lokal benötigt wird, nur bei `NODE_ENV === "development"` registrieren.
- Einen Entwicklungsbenutzer über ein Prisma-Seed-Skript anlegen und dessen echte ID verwenden.
- Für eine spätere echte Passwortanmeldung Passwörter ausschließlich mit Argon2id oder bcrypt hashen, Rate-Limits und Account-Sperren vorsehen.
- Beim Anwendungsstart notwendige Variablen wie `NEXTAUTH_SECRET`, Provider-ID und Provider-Secret validieren; Provider ohne vollständige Konfiguration nicht registrieren.
- Den Typ-Cast `PrismaAdapter(prisma) as any` beseitigen, indem NextAuth und Prisma-Adapter auf eine kompatible Auth.js-Version vereinheitlicht werden.

**Erledigt, wenn:** In Produktion existiert kein bekannter Testzugang, jeder Session-Benutzer entspricht einem echten Datenbankbenutzer und die Auth-Konfiguration enthält keine erzwungenen `any`-Typen.

## 5. Unzureichende Rezeptvalidierung (P2)

**Problem:** Die API akzeptiert leere Texte, negative oder nicht-ganzzahlige Werte, doppelte Reihenfolgen und beliebig viele Schritte. Das Schema ist außerdem in POST und PUT dupliziert.

**Lösung:**

- Ein gemeinsames Schema unter `src/lib/validation/recipe.ts` anlegen.
- Titel, Mühle, Mahlgrad und Schrittnamen trimmen und sinnvolle Maximallängen festlegen.
- `step_order` und `time_seconds` als nicht-negative Ganzzahlen validieren.
- Wassermenge und Flussrate als endliche, positive Zahlen validieren.
- Mindestens einen und höchstens 30 Schritte zulassen.
- Eindeutige `step_order`-Werte prüfen und Schritte vor dem Speichern sortieren.
- Für alle Validierungsfehler ein einheitliches JSON-Fehlerformat zurückgeben.
- Datenbankseitig einen eindeutigen Index auf `(recipeId, step_order)` ergänzen.

**Erledigt, wenn:** Ungültige Rezepte werden mit Status 422 und verständlichen Feldfehlern abgelehnt; gültige Schritte werden deterministisch sortiert gespeichert und ausgegeben.

## 6. HTTP-Fehlerbehandlung der ESP32-Firmware (P2)

**Problem:** Die Firmware behandelt jeden positiven HTTP-Code als Erfolg und versucht auch 401-, 404- oder 500-Antworten als Rezeptliste zu parsen.

**Lösung:**

- Nur Statuscodes von 200 bis 299 als Erfolg akzeptieren.
- 401/403 als ungültige Geräteanmeldung behandeln und einen klaren Gerätestatus anzeigen.
- 429 und 5xx mit begrenztem exponentiellem Backoff erneut versuchen.
- Content-Type, JSON-Wurzeltyp und benötigte Felder vor der Übernahme validieren.
- Die Größe der HTTP-Antwort und des JSON-Dokuments begrenzen.
- Das zuletzt erfolgreich geladene Rezept persistent speichern und bei Netzwerkfehlern weiter nutzbar halten.

**Erledigt, wenn:** Fehlerantworten überschreiben keine gültigen lokalen Rezepte und das Gerät kann nach vorübergehenden Serverfehlern selbstständig weiterarbeiten.

## 7. Blockierende WLAN-Verbindung und fehlende Synchronisation (P2)

**Problem:** Bei nicht erreichbarem WLAN bleibt der ESP32 unbegrenzt in `setup()` hängen. Rezepte werden nur einmal nach dem Einschalten geladen und `loop()` enthält keine Betriebslogik.

**Lösung:**

- WLAN, API-Synchronisation und Gerätebetrieb als nicht blockierende Zustandsmaschine implementieren.
- Für Verbindungsversuche ein Timeout und exponentielles Backoff verwenden.
- Rezepte regelmäßig oder über einen expliziten Synchronisationsbefehl aktualisieren.
- WLAN-Konfiguration und API-Endpunkt über Provisionierung/NVS statt als Quellcode-Konstanten verwalten.
- Verbindungs-, Sync- und Fehlerstatus auf Display beziehungsweise serieller Schnittstelle ausgeben.

**Erledigt, wenn:** Das Gerät startet auch ohne WLAN, bleibt mit lokal gespeicherten Rezepten bedienbar und verbindet sich nach Wiederkehr des Netzes automatisch neu.

## 8. API-Schlüssel im Klartext (P2)

**Problem:** Der direkt verwendbare ESP32-Schlüssel wird im Benutzerdatensatz im Klartext gespeichert. Ein Datenbankleck kompromittiert damit alle Gerätezugänge.

**Lösung:**

- Geräte als eigenes Modell einführen, zum Beispiel `Device` mit `id`, `userId`, `name`, `keyHash`, `keyPrefix`, `createdAt`, `lastUsedAt` und `revokedAt`.
- Einen kryptografisch zufälligen Schlüssel erzeugen und nur bei der Erstellung einmal vollständig anzeigen.
- Serverseitig ausschließlich SHA-256-Hash und einen kurzen Präfix zur Identifikation speichern.
- Rotation und Widerruf über das Dashboard ermöglichen.
- Rate-Limiting und Audit-Logging für die Geräte-API ergänzen.
- Schlüssel niemals in Logs oder Fehlermeldungen ausgeben.

**Erledigt, wenn:** Ein Datenbankexport enthält keinen unmittelbar nutzbaren API-Schlüssel und ein einzelnes Gerät kann ohne Auswirkungen auf andere Geräte widerrufen werden.

## 9. Fehlende Prisma-Migrationen (P2)

**Problem:** Die Konfiguration verweist auf `prisma/migrations`, der Ordner enthält jedoch keine Migrationen. Das Datenbankschema ist nicht reproduzierbar.

**Lösung:**

- Eine Initialmigration aus dem aktuellen Schema erzeugen und versionieren.
- Weitere Schemaänderungen ausschließlich über benannte Migrationen einführen.
- Im Deployment `prisma migrate deploy` vor dem Start der Anwendung ausführen.
- Migrationen zuerst gegen eine temporäre Testdatenbank prüfen und regelmäßig Backups testen.

**Erledigt, wenn:** Eine leere PostgreSQL-Datenbank kann allein aus Repository und Umgebungsvariablen auf den aktuellen Stand gebracht werden.

## 10. Unbegrenztes Prisma-Query-Logging (P3)

**Problem:** Jede SQL-Abfrage wird auch in Produktion protokolliert. Das erzeugt unnötige Logs und kann sensible Parameter offenlegen.

**Lösung:**

- In Entwicklung `query`, `warn` und `error` protokollieren.
- In Produktion nur `warn` und `error` aktivieren.
- Strukturierte Fehler mit Request-ID erfassen, aber Zugangsdaten und API-Schlüssel redigieren.

**Erledigt, wenn:** Produktionslogs enthalten keine vollständigen Routineabfragen oder Geheimnisse, Fehler bleiben aber nachvollziehbar.

## 11. Repository- und Qualitätssicherung (P2)

**Problem:** Projektstamm und `web/` enthalten getrennte Git-Strukturen; die Firmware war dadurch nicht gemeinsam versioniert. Automatisierte Tests fehlen vollständig. Mehrere Paket-Tarballs liegen als lokale Artefakte im Webordner.

**Lösung:**

- Ein Monorepo im Projektstamm verwenden und `web/` sowie `firmware/` gemeinsam versionieren.
- Lokale Paket-Tarballs nicht einchecken, sofern sie nicht ausdrücklich Teil einer Offline-Buildstrategie sind.
- CI mit Web-Build, ESLint, TypeScript-Prüfung, Prisma-Schemavalidierung und Firmware-Build einrichten.
- API-Tests für Authentifizierung, Besitzprüfung, öffentliche Rezepte und Validierungsgrenzen ergänzen.
- Tests für die ESP32-Antwortverarbeitung mit gespeicherten JSON-Fixtures hinzufügen.

**Erledigt, wenn:** Ein Commit bildet Web und Firmware vollständig ab und jeder Pull Request wird automatisch gebaut und getestet.

## Neue Anforderung LR-REQ-012: Kaffeefilter und Filterpapier pro Rezept

### Ziel

Ein Rezept soll eindeutig festhalten, mit welchem Kaffeefilter beziehungsweise Dripper und mit welchem Filterpapier es zubereitet wird. Dadurch lässt sich das Rezept reproduzierbar ausführen und korrekt auf die Brühstation übertragen.

### User Story

Als Benutzer möchte ich für jedes Rezept den verwendeten Kaffeefilter und das verwendete Filterpapier erfassen, sehen und ändern können, damit Mahlgrad, Durchfluss und Brühzeit dem tatsächlichen Brüh-Setup zugeordnet sind.

### Fachliche Felder

- **Kaffeefilter (`coffee_filter`):** Bezeichnung des Drippers beziehungsweise Filterhalters, zum Beispiel `Hario V60 02`, `Kalita Wave 185` oder `Origami M`.
- **Filterpapier (`filter_paper`):** Hersteller, Produkt und Größe des Papiers, zum Beispiel `Hario V60 02 weiß, Japan` oder `Cafec Abaca 2–4 Cups`.

Für die erste Version werden beide Werte als Freitext mit maximal 120 Zeichen gespeichert. Eine normalisierte Produktdatenbank oder Auswahlliste ist nicht Bestandteil dieser Anforderung, kann aber später ergänzt werden.

### Datenmodell und Migration

- `Recipe` um `coffee_filter String?` und `filter_paper String?` erweitern.
- Die Felder in der ersten Migration nullable anlegen, damit bestehende Rezepte gültig bleiben.
- Für neu erstellte und erneut gespeicherte Rezepte beide Felder in UI und API verpflichtend machen.
- Bestehende leere Werte in der Oberfläche als `Nicht angegeben` darstellen.
- Nach einer optionalen Datenbereinigung können die Datenbankfelder in einer späteren Migration verpflichtend werden.

### API

- POST und PUT für Rezepte akzeptieren und validieren `coffee_filter` und `filter_paper`.
- GET für einzelne und mehrere Rezepte gibt beide Felder zurück.
- Die ESP32-Route gibt beide Felder ebenfalls zurück.
- Führende und nachfolgende Leerzeichen werden entfernt; leere Werte und Texte über 120 Zeichen werden für neue beziehungsweise bearbeitete Rezepte mit Status 422 abgelehnt.

Beispiel:

```json
{
  "title": "V60 Ethiopia",
  "grinder": "Comandante C40",
  "grind_size": "24 Klicks",
  "coffee_filter": "Hario V60 02",
  "filter_paper": "Cafec Abaca 2–4 Cups",
  "is_public": false,
  "steps": [
    {
      "step_order": 1,
      "name": "Bloom",
      "volume_ml": 60,
      "time_seconds": 45,
      "flow_rate_ml_per_sec": 2
    }
  ]
}
```

### Benutzeroberfläche

- Das Formular zum Erstellen und Bearbeiten enthält zwei beschriftete Pflichtfelder: `Kaffeefilter` und `Filterpapier`.
- Beide Werte werden auf der Rezeptdetailseite angezeigt.
- Das Dashboard zeigt mindestens den Kaffeefilter auf der Rezeptkarte; das Filterpapier kann auf der Detailseite stehen.
- Validierungsfehler werden direkt am betroffenen Feld angezeigt.

### ESP32

- Die Firmware übernimmt beide Werte beim Rezept-Sync.
- Vor dem Start eines Brühvorgangs zeigt die Brühstation Filter und Filterpapier in der Rezeptübersicht oder Detailansicht an.
- Ältere gespeicherte Rezepte ohne diese Felder bleiben lesbar und zeigen `Nicht angegeben`.

### Akzeptanzkriterien

1. Ein neues Rezept kann ohne Kaffeefilter oder Filterpapier nicht gespeichert werden.
2. Beide Werte bleiben nach Speichern, Neuladen und erneutem Bearbeiten unverändert erhalten.
3. Beide Werte erscheinen in den Web-API- und ESP32-API-Antworten.
4. Bestehende Rezepte ohne die neuen Felder können weiterhin geöffnet werden.
5. Beim Bearbeiten eines bestehenden Rezepts müssen die fehlenden Angaben vor dem Speichern ergänzt werden.
6. Unberechtigte Benutzer können die Angaben privater Rezepte weder lesen noch ändern.
7. API- und UI-Tests decken gültige Werte, leere Werte, zu lange Werte und bestehende Legacy-Rezepte ab.
