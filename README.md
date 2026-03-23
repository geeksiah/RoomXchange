# RoomXchange

RoomXchange is a full-stack property marketplace with:

- `apps/mobile`: Expo React Native app with Apple-safe paywall routing.
- `apps/web`: Next.js App Router app for landing, subscription checkout, success sync, and dashboard management.
- `backend`: TypeScript Lambda handlers for auth, listings, uploads, subscriptions, reports, and background jobs.
- `packages/contracts` and `packages/shared`: shared schemas, types, API client, and design tokens.
- `infra/cdk`: AWS CDK deployment for DynamoDB, Cognito, API Gateway, S3, CloudFront, schedules, and Next.js hosting.

## Product rules

- The mobile app is free.
- No in-app purchases.
- No embedded Stripe or Paystack checkout inside mobile.
- `Contact Owner` on mobile sends unsubscribed users to one external web route only.
- Checkout is web-only and verified back into the shared subscription state.

## Local setup

1. Create a clean Node 20 environment.
2. Copy `.env.example` to `.env` and fill the values.
3. Install workspace dependencies.

```bash
npm install
```

4. Start the web app.

```bash
npm run dev:web
```

5. Start the Expo app.

```bash
npm run dev:mobile
```

6. Or start web, mobile, and backend together.

```bash
npm run dev
```

## Environment

The stack expects these values at minimum:

- `ROOMXCHANGE_STAGE`
- `ROOMXCHANGE_PAYSTACK_SECRET_KEY`
- `ROOMXCHANGE_PAYSTACK_PLAN_CODE`
- `ROOMXCHANGE_MAPBOX_PUBLIC_TOKEN`
- `ROOMXCHANGE_API_URL`
- `ROOMXCHANGE_MEDIA_URL`

Optional while your final domain is not ready:

- `ROOMXCHANGE_DOMAIN`
- `ROOMXCHANGE_WEB_URL`

For client apps, also expose:

- `NEXT_PUBLIC_ROOMXCHANGE_API_URL`
- `NEXT_PUBLIC_ROOMXCHANGE_WEB_URL`
- `NEXT_PUBLIC_ROOMXCHANGE_MEDIA_URL`
- `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`
- `EXPO_PUBLIC_ROOMXCHANGE_API_URL`
- `EXPO_PUBLIC_ROOMXCHANGE_WEB_URL`
- `EXPO_PUBLIC_ROOMXCHANGE_MEDIA_URL`
- `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`

## AWS deployment

You can deploy before your custom domain is ready. The stack will still return working AWS URLs, and you can connect a real domain later.

1. Build the Next.js OpenNext bundle.

```bash
cd apps/web
npx open-next build
```

2. Return to the repo root and synth the stack.

```bash
npm run cdk:synth
```

3. Deploy the stack.

```bash
npm run cdk:deploy
```

4. Copy the CDK outputs and feed them back into your env file.

- `ApiUrl` -> `NEXT_PUBLIC_ROOMXCHANGE_API_URL` and `EXPO_PUBLIC_ROOMXCHANGE_API_URL`
- `WebUrl` -> `ROOMXCHANGE_WEB_URL`, `NEXT_PUBLIC_ROOMXCHANGE_WEB_URL`, and `EXPO_PUBLIC_ROOMXCHANGE_WEB_URL`
- `MediaUrl` -> `NEXT_PUBLIC_ROOMXCHANGE_MEDIA_URL` and `EXPO_PUBLIC_ROOMXCHANGE_MEDIA_URL`

5. Rebuild the web bundle and redeploy after you set those output values.

The CDK stack provisions:

- `RoomXchange` DynamoDB single table with operational GSIs.
- Cognito user pool with custom auth challenge Lambdas for phone OTP.
- API Gateway REST API backed by the shared Lambda handler.
- S3 + CloudFront media pipeline for uploads and delivery.
- EventBridge schedules for subscription expiry and stale upload cleanup.
- A CloudFront + Lambda based Next.js runtime sourced from `.open-next`.

## Notes

- The current machine where this repo was scaffolded has broken `npm`/`pnpm` wrapper behavior, so dependency installation and runtime validation were not completed here.
- The remote GitHub repo was not available locally during implementation, so this repo was created from scratch under `c:\Users\abbas\Documents\RoomXchange`.
- A custom domain can be attached later by adding Route53, ACM, and custom domain mappings to the CloudFront and API Gateway endpoints.
