# Bodyassist CRM

A mobile-friendly Customer Relationship Management app for Bodyassist sales representatives.

## Features
- **Dashboard**: Quick overview of recent visits.
- **New Visit Entry**: Record details, order info, validation photos, and quick actions.
- **History**: Review past logs (persisted via Local Storage).

## How to Run

1. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```

3. **Open the App**:
   Visit [http://localhost:3000](http://localhost:3000) in your browser.
   
   > **Mobile Testing**: To test the mobile responsiveness, open Chrome DevTools (F12) and toggle the Device Toolbar (Ctrl+Shift+M).

## Technical Details
- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS v4
- **Icons**: Lucide React
- **Persistence**: LocalStorage (Prototype)
