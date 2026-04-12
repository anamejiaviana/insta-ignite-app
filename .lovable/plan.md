

# Fix: CSS @import Order Warning

## Problem
In `src/index.css`, the `@import url(...)` for Google Fonts is on line 5, after the `@tailwind` directives (lines 1-3). CSS spec requires `@import` to come before all other statements. This produces a repeated warning in the dev server logs.

## Solution
Move the `@import url(...)` line to the very top of `src/index.css`, before the `@tailwind` directives.

**File: `src/index.css`**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  ...
```

One file, one line move. No other changes needed.

