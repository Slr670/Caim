# Behaviors & Interaction Patterns - Equipment Claims

## Interaction Model
- **Interaction Model:** Click-driven and Form-interaction with client-side state transitions.

## Key Behaviors

### 1. Entrance Animation
- Card container enters with:
  `animate-in fade-in slide-in-from-bottom-2 duration-500`
- Smooth subtle slide up from 8px and fade from 0 opacity.

### 2. Password Visibility Toggle
- **Trigger:** Click on toggle button inside password field
- **Before (Default):**
  - Input type: `"password"`
  - Icon: `Eye` (`<Eye className="size-4" />`)
  - `aria-label="แสดงรหัสผ่าน"`
- **After (Visible):**
  - Input type: `"text"`
  - Icon: `EyeOff` (`<EyeOff className="size-4" />`)
  - `aria-label="ซ่อนรหัสผ่าน"`

### 3. Form Submission & Loading State
- **Trigger:** Form submit (Click on button `เข้าสู่ระบบ` or Enter key)
- **State during submission (Pending):**
  - Button disabled: `disabled={isPending}`
  - Loading spinner: `<Loader2 className="size-4 animate-spin" aria-hidden />` prefixed before text `เข้าสู่ระบบ`

### 4. Error State & Validation
- **Trigger:** Invalid login credentials
- **Feedback:**
  - Alert banner appears above email field:
    `flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive`
  - Icon: `<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />`
  - Input fields gain: `aria-invalid="true"` (red border ring indicator)
  - Auto-focus transferred back to email field on error.

### 5. Responsive Behavior
- **Desktop (1440px):** Card centered in viewport, `max-w-104` (416px), padding `p-8`
- **Tablet (768px):** Card centered, `p-7` to `sm:p-8`
- **Mobile (390px):** Card centered with horizontal padding `px-4`, `p-7` inside card
