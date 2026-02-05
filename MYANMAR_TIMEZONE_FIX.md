# Myanmar Timezone Fix & Device Policy Implementation

## 🇲🇲 Myanmar Timezone Fix

### Problem
The original date calculations used server timezone (UTC) which caused incorrect expiry dates for Myanmar users. Myanmar Standard Time (MMT) is UTC+6:30, so dates were calculated 6.5 hours earlier than expected.

### Solution
Created `lib/myanmar-time.ts` with utilities that:
- Convert dates to Myanmar timezone (UTC+6:30) for calculations
- Ensure consistent day-based expiry regardless of server timezone
- Store dates in UTC in database but calculate based on Myanmar time
- Display dates in Myanmar locale and timezone

### Key Functions
- `calculateExpiry(planDays)` - Calculate expiry based on Myanmar timezone
- `extendExpiry(currentExpiry, planDays)` - Extend expiry in Myanmar timezone
- `formatMyanmarDate(date)` - Format dates for Myanmar display
- `isExpiredInMyanmar(date)` - Check expiry in Myanmar timezone
- `nowInMyanmar()` - Get current Myanmar time

### Files Updated
- `app/api/customers/route.ts` - Uses Myanmar timezone for new customers
- `app/api/customers/[id]/renew/route.ts` - Uses Myanmar timezone for renewals
- `app/api/cron/expire/route.ts` - Uses Myanmar timezone for expiry checks
- `app/dashboard/DashboardClient.tsx` - Displays dates in Myanmar timezone

## 🔒 1 Key = 1 Device Policy

### Implementation
Since Outline doesn't natively block multiple devices, we enforce the policy by:

1. **Key Lifecycle Management**: Only 1 active key per customer
   - On renewal: Delete old key → Create new key → Update database
   - Atomic operations ensure no duplicate keys

2. **Device Locking/Unlocking**: Control access via data limits
   - **Lock**: Set data limit to 0 (blocks all traffic)
   - **Unlock**: Remove data limit (allows normal usage)

### New Components
- `app/components/DevicePolicyManager.tsx` - React component for lock/unlock UI
- `app/api/customers/[id]/lock/route.ts` - API to lock device (set limit to 0)
- `app/api/customers/[id]/unlock/route.ts` - API to unlock device (remove limit)

### Features
- Modal interface in dashboard for device management
- Visual feedback for lock/unlock operations
- Audit logging for all policy actions
- Confirmation dialogs for safety

### Usage
1. In the dashboard, click the 🔒 icon next to any active customer
2. Use "Lock Device" to block access (data limit = 0)
3. Use "Unlock Device" to restore access (remove data limit)
4. All actions are logged in the audit trail

## 🚀 Benefits

### Myanmar Timezone Fix
- ✅ Accurate expiry dates for Myanmar users
- ✅ Consistent day-based calculations
- ✅ Proper locale formatting (en-MM)
- ✅ Server timezone independence

### Device Policy
- ✅ Enforces 1 key per customer
- ✅ Granular device access control
- ✅ Non-destructive locking (reversible)
- ✅ Complete audit trail
- ✅ User-friendly interface

## 🔧 Technical Details

### Myanmar Timezone Offset
```typescript
const MYANMAR_OFFSET_MS = 6.5 * 60 * 60 * 1000; // +6:30 UTC
```

### Date Calculation Flow
1. Get current time in Myanmar timezone
2. Set to start of day for consistent expiry times
3. Add plan days
4. Convert back to UTC for database storage

### Device Policy Flow
1. **Lock**: PUT `/access-keys/{id}/data-limit` with `limit.bytes=0`
2. **Unlock**: DELETE `/access-keys/{id}/data-limit`
3. Log action in audit trail
4. Update UI state

This implementation ensures accurate date handling for Myanmar users while providing flexible device access control through Outline's data limit API.