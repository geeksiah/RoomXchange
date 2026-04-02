# RoomXchange Submission Copy

This file collects draft copy and URLs for Google Play and App Store submissions.

Important:

- These drafts are based on the current RoomXchange codebase and production environment values.
- Review the final wording in the store consoles before submitting.
- This is product and policy guidance, not legal advice.

## Public URLs

- Website / marketing URL: `https://roomxchange.netlify.app`
- Privacy policy URL: `https://roomxchange.netlify.app/privacy-policy`
- Account deletion / privacy choices URL: `https://roomxchange.netlify.app/delete-account`
- Support URL: `https://roomxchange.netlify.app#support`
- Support email: `support@roomxchange.com`

## Google Play

### Suggested store listing

- App name: `RoomXchange`
- Category: `House & Home`
- Short description:

  `Browse rooms and apartments, compare listings, and contact owners.`

- Full description:

  `RoomXchange helps you discover rooms and apartments, compare prices and amenities, view map-based locations, save alerts, and contact property owners from your phone.

  Use RoomXchange to:
  - Explore room and apartment listings
  - Filter by price, area, and property type
  - View photos, pricing, and key property details
  - Explore listings on a map
  - Save alerts for the places you want to track
  - Manage your own listings and profile
  - Receive optional notifications about new activity
  - Unlock owner contact access through secure web checkout

  RoomXchange is designed for property discovery and communication. Any subscription or owner-contact unlock flow is completed on the web, while the mobile app focuses on browsing, alerts, messaging, and listing management.`

### Listing asset checklist

- App icon source: `apps/mobile/src/assets/icon-primary-bg.png`
- App icon status: `1024x1024` and suitable to export as the required `512x512` Play Store icon
- Feature graphic status: `Not currently in repo`
- Feature graphic spec: `1024x500`, PNG or JPEG, no alpha
- Suggested feature graphic direction: `Use the RoomXchange coral brand colour, the icon, and one or two large UI crops that show listing discovery and maps. Keep any text minimal and centred away from the edges.`
- Phone screenshots status: `No Play-ready screenshots currently in repo`
- Recommended phone screenshot set:
  - `Home / discovery feed`
  - `Map view with listing pins`
  - `Listing details page`
  - `Filters or saved alerts screen`
- Recommended screenshot size: `1080x1920` portrait PNG or JPEG
- Large-screen screenshots: `Optional unless you want to actively market tablet and Chromebook support`

### Contact and policy fields

- Privacy policy URL: `https://roomxchange.netlify.app/privacy-policy`
- Account deletion web resource: `https://roomxchange.netlify.app/delete-account`
- Website: `https://roomxchange.netlify.app`
- Support email: `support@roomxchange.com`

### Suggested policy answers

- App contains user-generated content: `Yes`
- Users can contact each other: `Yes`
- Moderation / reporting available: `Yes`
- Ads shown in the app: `No`
- In-app purchases inside the mobile app: `No`
- Subscription or payment flow exists: `Yes, but it is web-only`

### Data safety draft

Use these as a starting point and confirm them against the final production behavior.

- Personal info collected: `Name, phone number, optional email address`
- User content collected: `Profile photo, listing details, listing photos, messages, support or report text`
- App activity / settings collected: `Saved alerts, notification preferences, subscription state`
- Identifiers collected: `User ID, push token`
- Purchases collected: `Subscription status and payment reference metadata`
- Precise device location collected: `No`
- Contacts collected: `No`
- Audio files collected: `No`
- Health / fitness data collected: `No`
- Financial card numbers collected: `No`
- Data encrypted in transit: `Yes`
- Account deletion available: `Yes, in app and via web resource`

### Content rating notes

Likely points you will need to disclose in the questionnaire:

- Users can view user-generated property listings.
- Users can send messages and interact with other users.
- Listing and search flows include map-based location context.
- Users can report content.
- The app does not focus on violence, gambling, sexual content, drugs, or profanity.

## App Store Connect

### Suggested product page copy

- App name: `RoomXchange`
- Subtitle:

  `Find rooms and contact owners`

- Promotional text:

  `Browse room and apartment listings, save alerts, and contact owners after secure web checkout.`

- Description:

  `RoomXchange is a mobile marketplace for discovering rooms and apartments with less guesswork. Explore property listings, compare prices and amenities, view map-based location details, save alerts, and manage your own profile and listings from one place.

  The app is designed for fast discovery and straightforward communication. Browse available spaces, narrow results by location and budget, and stay updated with optional notifications.

  RoomXchange keeps subscription checkout on the web and uses the mobile app for browsing, messaging, and listing management.`

- Keywords:

  `room,rent,apartment,housing,property,listings,tenant,accra,ghana`

### App information fields

- Support URL: `https://roomxchange.netlify.app#support`
- Marketing URL: `https://roomxchange.netlify.app`
- Privacy policy URL: `https://roomxchange.netlify.app/privacy-policy`
- User privacy choices URL: `https://roomxchange.netlify.app/delete-account`

### App Review notes draft

`RoomXchange is a property marketplace. The iOS app does not process payments in-app. Any optional subscription or owner-contact unlock flow happens on the web only, outside the app, through external checkout. The app supports optional push notifications, map-based listing discovery, profile and listing management, and user-to-user messaging. Account deletion help is available in the app at Profile > About app > Open account deletion page.`

### App privacy prep

Based on the current codebase, these are the main data categories to review in App Store Connect:

- Contact info: `Name, phone number, optional email address`
- User content: `Listing photos, profile photo, listing text, messages, reports`
- Identifiers: `User ID, push token`
- Purchases: `Subscription status and payment reference metadata`
- Diagnostics: `Only disclose if you add a crash or analytics SDK`
- Tracking: `No tracking SDK is currently evident in this codebase`

## Notes for reviewers

- Mobile app payments: `Web-only`
- Native maps: `Yes`
- Push notifications: `Optional`
- Background location: `No`
- Privacy policy and deletion URLs should be publicly reachable before submission.
