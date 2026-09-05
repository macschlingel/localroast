This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## LocalRoast setup

Copy `.env.example` to `.env`, set `DATABASE_URL` and `NEXTAUTH_SECRET`, then install and initialize the database:

```bash
npm ci
npx prisma migrate deploy
npm run dev
```

The development credentials provider is enabled only when `NODE_ENV=development` and `DEV_LOGIN_PASSWORD` is set. OAuth providers are enabled only when both their client ID and secret are configured.

Run the checks locally with:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

The full remediation plan and the filter/paper requirement are documented in [`../docs/code-review-massnahmen-und-filter-anforderung.md`](../docs/code-review-massnahmen-und-filter-anforderung.md).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
