# LocalRoast Webanwendung

Die vollständige Projektbeschreibung, Einrichtung und API-Dokumentation steht in der [README des Repositories](../README.md).

## Schnellstart

```bash
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run dev
```

Die Anwendung läuft anschließend unter [http://localhost:3000](http://localhost:3000).

## Verfügbare Skripte

```bash
npm run dev              # Entwicklungsserver
npm run build            # Produktions-Build
npm run start            # Produktionsserver
npm run lint             # ESLint
npm run typecheck        # TypeScript-Prüfung
npm test -- --run        # Tests
npm run prisma:validate  # Prisma-Schema prüfen
npm run db:seed          # Development-Daten anlegen
```
