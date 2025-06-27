# Performance Optimizations

This document outlines all the performance optimizations implemented to reduce duplicate API calls and improve overall application performance.

## Issues Identified

1. **Multiple API calls on Orders page** - 3 separate calls on every load
2. **Duplicate pricing data fetching** - No caching, multiple calls to same endpoints
3. **React StrictMode causing duplicate calls** - Development mode mounting components twice
4. **Poor dependency management in useEffect hooks** - Causing unnecessary re-renders and API calls
5. **Multiple admin auth checks** - Redundant authentication calls on admin pages
6. **No pagination** - Loading all data at once causing performance issues

## Optimizations Implemented

### 1. Custom Hooks with Deduplication

#### `useOrders` Hook (`src/hooks/useOrders.ts`)

- **Purpose**: Centralized orders management with deduplication
- **Features**:
  - Single API call with pagination (50 items per page)
  - Client-side filtering for "My Orders" vs "All Orders"
  - Optimistic updates for better UX
  - `isLoadingRef` and `hasInitializedRef` to prevent duplicate calls
  - Memoized functions to prevent unnecessary re-renders

#### `usePricing` Hook (`src/hooks/usePricing.ts`)

- **Purpose**: Centralized pricing data management with caching
- **Features**:
  - 5-minute in-memory cache via `src/lib/pricing.ts`
  - Deduplication using refs to prevent multiple simultaneous calls
  - Utility hooks for available items, tiers, and item prices
  - Cache clearing functionality for admin updates

#### `useAdminAuth` Hook (`src/hooks/useAdminAuth.ts`)

- **Purpose**: Centralized admin authentication with deduplication
- **Features**:
  - Single auth check per session
  - Proper dependency management to prevent recreation
  - Automatic redirect handling
  - Error state management

#### `useProfile` Hook (`src/hooks/useProfile.ts`)

- **Purpose**: Profile management with deduplication
- **Features**:
  - Prevents duplicate profile updates
  - Centralized session management
  - Proper error handling and messaging

### 2. API Optimizations

#### Orders API (`src/api/orders/route.ts`)

- **Enhanced with**:
  - Pagination support (`page`, `limit` parameters)
  - Combined user data in single response
  - Filtering capabilities
  - Proper error handling

#### Pricing Cache (`src/lib/pricing.ts`)

- **Features**:
  - 5-minute in-memory cache
  - Automatic cache invalidation
  - Utility functions: `getPricingData()`, `formatPrice()`, `clearPricingCache()`
  - Proper error handling and fallbacks

### 3. Component Optimizations

#### Orders Page (`src/app/orders/page.tsx`)

- **Optimizations**:
  - Single API call instead of 3 separate calls
  - Client-side filtering for tabs
  - Pagination with "Load More" functionality
  - Memoized calculations for expensive operations
  - Optimistic updates for order operations

#### Create Order Page (`src/app/orders/create/page.tsx`)

- **Optimizations**:
  - Uses cached pricing data
  - Memoized order summary calculations
  - Efficient form state management

#### Pricing Management Page (`src/app/admin/pricing/page.tsx`)

- **Optimizations**:
  - Uses `useAdminAuth` hook to prevent multiple auth calls
  - Cached pricing data
  - Memoized calculations for admin operations

#### Profile Page (`src/app/profile/page.tsx`)

- **Optimizations**:
  - Uses `useProfile` hook for deduplication
  - Simplified form handling
  - Proper session management

### 4. Technical Improvements

#### Deduplication Patterns

- **`isLoadingRef`**: Prevents multiple simultaneous API calls
- **`hasInitializedRef`**: Ensures initialization happens only once
- **Empty dependency arrays**: Used where appropriate to prevent unnecessary re-runs
- **Proper useCallback usage**: Prevents function recreation on every render

#### Caching Strategy

- **In-memory caching**: 5-minute cache for pricing data
- **Session-based caching**: Admin auth status cached per session
- **Client-side filtering**: Reduces server load by filtering data locally

#### Error Handling

- **Consistent error states**: All hooks provide error information
- **Graceful fallbacks**: Proper loading states and error messages
- **Console logging**: Detailed error logging for debugging

## Performance Metrics Improved

1. **API Calls Reduced**:

   - Orders page: 3 calls → 1 call
   - Pricing pages: Multiple calls → Cached responses
   - Admin pages: Multiple auth calls → Single cached auth

2. **Data Transfer Optimized**:

   - Pagination: 50 items per page instead of all data
   - Combined responses: User data included in orders response
   - Cached responses: Pricing data cached for 5 minutes

3. **User Experience Enhanced**:
   - Optimistic updates: Immediate UI feedback
   - Loading states: Proper loading indicators
   - Error handling: Clear error messages

## Development vs Production

- **React StrictMode**: All hooks handle double-mounting in development
- **Cache TTL**: 5-minute cache appropriate for production use
- **Error Logging**: Console errors for development debugging

## Future Optimizations

1. **Server-side caching**: Redis or similar for pricing data
2. **Real-time updates**: WebSocket for live order updates
3. **Infinite scrolling**: Replace "Load More" with infinite scroll
4. **Service worker**: Cache static pricing data offline
5. **Database optimization**: Add proper indexes for order queries
