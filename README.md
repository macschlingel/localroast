# LocalRoast

[![CI](https://github.com/macschlingel/localroast/actions/workflows/ci.yml/badge.svg)](https://github.com/macschlingel/localroast/actions/workflows/ci.yml)

LocalRoast ist eine Rezeptverwaltung für Pour-over-Kaffee mit Anbindung an ESP32-Geräte. Rezepte können im Web angelegt, bearbeitet und veröffentlicht werden. Ein registriertes Gerät kann die freigegebenen Rezepte sicher über HTTPS abrufen und lokal zwischenspeichern.

Der aktuelle Funktionsumfang konzentriert sich auf Rezeptverwaltung und Rezept-Synchronisation. Eine automatische Brühsteuerung, Waagenintegration oder BLE-Anbindung ist noch nicht Bestandteil der Anwendung.

## Funktionen

- Rezepte mit Kaffee, Wassermenge, Temperatur, Mahlgrad, Mühle und Brühschritten verwalten
- Kaffeefilter und Filterpapier pro Rezept erfassen
- Rezepte öffentlich oder privat speichern
- Anmeldung über GitHub oder Google; lokaler Development-Login nur in Entwicklungsumgebungen
- ESP32-Geräte im Dashboard registrieren, umbenennen, deaktivieren und API-Schlüssel rotieren
- API-Schlüssel werden nicht im Klartext gespeichert, sondern nur als SHA-256-Hash
- Gerätezugriffe und Schlüsseländerungen auditieren
- ESP32-Rezeptabruf mit Rate-Limit, HTTPS, Payload-Validierung und Offline-Cache
- Automatische Tests, Typecheck, Linting, Produktions-Build und Firmware-Build in GitHub Actions

## Projektstruktur

```text
.
├── web/                         # Next.js-Webanwendung und Prisma-Datenmodell
│   ├── src/app/                 # Seiten und API-Routen
│   ├── src/components/          # React-Komponenten
│   ├── src/lib/                 # Authentifizierung, Validierung, Gerätezugriff
│   └── prisma/                  # Schema, Migrationen und Seed
├── firmware/                    # ESP32-Firmware auf Basis von PlatformIO
├── docs/                        # Code-Review und fachliche Anforderungen
└── .github/workflows/ci.yml     # Automatisierte Prüfungen
```

## Voraussetzungen

- Node.js 20 oder neuer
- npm
- PostgreSQL
- Für die Firmware: PlatformIO und ein kompatibles ESP32-Board

## Webanwendung lokal starten

```bash
cd web
cp .env.example .env
```

Anschließend mindestens `DATABASE_URL` und `NEXTAUTH_SECRET` in `web/.env` setzen. Für den lokalen Development-Login zusätzlich `DEV_LOGIN_EMAIL` und `DEV_LOGIN_PASSWORD` eintragen.

```bash
npm ci
npx prisma migrate deploy
npm run db:seed       # optional: legt den Development-Benutzer an
npm run dev
```

Die Anwendung ist danach unter [http://localhost:3000](http://localhost:3000) erreichbar.

### Umgebungsvariablen

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge |
| `NEXTAUTH_SECRET` | Geheimnis für NextAuth-Sessions |
| `NEXTAUTH_URL` | Öffentliche URL der Webanwendung, z. B. `http://localhost:3000` |
| `DEV_LOGIN_EMAIL` | E-Mail des Development-Logins |
| `DEV_LOGIN_PASSWORD` | Passwort des Development-Logins |
| `GITHUB_ID` / `GITHUB_SECRET` | Optional: GitHub-OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional: Google-OAuth |

OAuth-Provider werden nur aktiviert, wenn jeweils beide Zugangsdaten gesetzt sind. Der lokale Credentials-Login ist ausschließlich bei `NODE_ENV=development` aktiv und darf nicht als Produktions-Login verwendet werden.

## Datenbank

Neue Migrationen in einer bestehenden Umgebung ausrollen:

```bash
cd web
npx prisma migrate deploy
npx prisma generate
```

Für die lokale Entwicklung kann der Seed ausgeführt werden:

```bash
npm run db:seed
```

Das Datenmodell enthält Benutzer, Rezepte, Brühschritte, Geräte und Geräte-Audit-Einträge. Ein Gerät erhält seinen API-Schlüssel nur einmal bei der Erstellung oder Rotation. Der Klartext-Schlüssel muss sicher auf dem Gerät hinterlegt werden.

## Rezeptmodell

Ein Rezept enthält unter anderem:

- Titel und optionale Beschreibung
- Kaffeemenge und Wassermenge
- Wassertemperatur
- Mühle und Mahlgrad
- Kaffeefilter und Filterpapier
- Sichtbarkeit (`öffentlich` oder `privat`)
- Eine geordnete Liste von Brühschritten mit Zeit, Wassermenge und Notiz

Die Eingaben werden serverseitig validiert. Ein Rezept darf zwischen 1 und 30 Brühschritte enthalten; Schrittpositionen müssen eindeutig sein.

## API

Die Web-API liegt unter `/api`:

| Route | Zweck | Authentifizierung |
| --- | --- | --- |
| `GET /api/recipes` | Eigene Rezepte und öffentliche Rezepte auflisten | Session optional |
| `POST /api/recipes` | Rezept anlegen | Session erforderlich |
| `GET /api/recipes/:id` | Einzelnes Rezept lesen | Öffentliches Rezept oder eigene Session |
| `PUT /api/recipes/:id` | Rezept aktualisieren | Eigentümer-Session |
| `DELETE /api/recipes/:id` | Rezept löschen | Eigentümer-Session |
| `GET /api/devices` | Eigene Geräte auflisten | Session erforderlich |
| `POST /api/devices` | Gerät registrieren und API-Schlüssel ausstellen | Session erforderlich |
| `POST /api/devices/:id/rotate` | API-Schlüssel rotieren | Eigentümer-Session |
| `DELETE /api/devices/:id` | Gerät deaktivieren | Eigentümer-Session |
| `GET /api/esp32/recipes` | Öffentliche Rezepte für ein Gerät abrufen | `X-API-Key` erforderlich |

Der ESP32-Endpunkt liefert höchstens 50 Rezepte und akzeptiert nur gültige, veröffentlichte Rezepte. Jeder erfolgreiche Abruf wird dem Geräte-Audit hinzugefügt.

## ESP32-Firmware

Die Firmware liegt in `firmware/` und nutzt PlatformIO.

```bash
platformio run -d firmware
platformio run -d firmware -t upload
platformio device monitor -d firmware
```

Vor dem Flashen muss in `firmware/src/main.cpp` das passende Root-CA-Zertifikat für den HTTPS-Server hinterlegt werden. Die Firmware verweigert unsichere HTTPS-Verbindungen ohne konfiguriertes Zertifikat.

Nach dem Erstellen eines Geräts im Dashboard werden die Zugangsdaten über die serielle Schnittstelle bei 115200 Baud provisioniert:

```text
ssid=MEIN_WLAN
password=MEIN_PASSWORT
api_url=https://example.org/api/esp32/recipes
api_key=lrk_...
```

Die Firmware verbindet sich mit dem WLAN, ruft die Rezepte regelmäßig ab und speichert den zuletzt gültigen Datensatz im NVS. Bei einem vorübergehenden Netzwerkausfall bleibt der lokale Cache erhalten. Filter und Filterpapier werden zusammen mit dem Rezept ausgegeben.

## Qualitätssicherung

Alle Web-Prüfungen:

```bash
cd web
npm run prisma:validate
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Firmware-Build:

```bash
platformio run -d firmware
```

Die CI-Pipeline führt diese Prüfungen für Webanwendung und Firmware automatisch aus. Test-Fixtures für die ESP32-Payload liegen unter `firmware/test/test_payload/`.

## Sicherheitshinweise

- Niemals `web/.env`, API-Schlüssel oder private Zertifikate committen.
- Geräte-Schlüssel nach einer Kompromittierung sofort rotieren oder das Gerät deaktivieren.
- In Produktion immer ein starkes `NEXTAUTH_SECRET`, HTTPS und echte OAuth-Zugangsdaten verwenden.
- Das Root-CA-Zertifikat der Firmware muss zum Server-Zertifikat passen; keine Zertifikatsprüfung abschalten.
- Das aktuelle Rate-Limit ist pro laufendem Webprozess im Speicher. Für mehrere Instanzen sollte es durch einen gemeinsamen Store wie Redis ersetzt werden.

## Bekannte Grenzen und nächste Ausbaustufen

- Noch keine Live-Anbindung einer Waage oder anderer BLE-Geräte
- Noch keine automatische Brühsteuerung
- Das ESP32-Gerät zeigt synchronisierte Rezepte derzeit über die serielle Ausgabe an
- Für eine horizontale Skalierung wird ein verteilter Rate-Limit-Store benötigt

Die vollständige Maßnahmenliste und die fachliche Filter-/Filterpapier-Anforderung stehen in [`docs/code-review-massnahmen-und-filter-anforderung.md`](docs/code-review-massnahmen-und-filter-anforderung.md).
