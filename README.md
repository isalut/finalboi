# Bank of India — Cash Equalisation System

## Updates Included
- **Auto-scroll + Result Pop-up:** Clicking **Check Cash** scrolls directly to the top and opens a clear result pop-up modal immediately.
- **Plain-English Comparison Statements:**
  - Morning > Evening: *"Evening cash is ₹X less than the morning cash."*
  - Evening > Morning: *"Evening cash is ₹X more than the morning cash."*
  - Balanced: *"The cash is balanced."*
- **All 13 Notes & Coins:** ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5 Notes + ₹20, ₹10, ₹5, ₹2, ₹1 Coins.

## Build Commands
```bash
npm install
npx cap add android
npx cap sync android
cd android
gradlew assembleDebug
```
