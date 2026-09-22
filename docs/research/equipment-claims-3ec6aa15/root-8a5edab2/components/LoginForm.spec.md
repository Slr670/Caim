# LoginForm Specification

## Overview
- **Target file:** `src/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/LoginForm.tsx`
- **Screenshot:** `docs/design-references/equipment-claims-3ec6aa15/root-8a5edab2/login.png`
- **Interaction model:** Click-driven form interaction with client-side state

## DOM Structure
```tsx
<div className="flex w-full flex-col gap-6">
  <div>
    <Image src="/images/logo-forth-07_8-mobile.png" alt="Forth Corporation" width={282} height={84} priority className="h-9 w-auto" />
    <div className="mt-4 border-t border-border pt-3.5">
      <p className="text-xs tracking-wide text-muted-foreground">ระบบบริหารงานเคลมอุปกรณ์</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
    </div>
  </div>
  <form className="flex flex-col gap-4">
    <input type="hidden" name="next" value="" />
    {error && (
      <p role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    )}
    <div className="flex flex-col gap-2">
      <Label htmlFor="email">อีเมล</Label>
      <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" placeholder="" required aria-invalid={!!error} className="h-10" />
    </div>
    <div className="flex flex-col gap-2">
      <Label htmlFor="password">รหัสผ่าน</Label>
      <div className="relative">
        <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="" required aria-invalid={!!error} className="h-10 pr-10" />
        <button type="button" onClick={togglePassword} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ</p>
    <Button type="submit" size="lg" className="h-10 w-full" disabled={isPending}>
      {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      เข้าสู่ระบบ
    </Button>
  </form>
</div>
```

## Computed Styles

### Card Container
- `border-radius`: `1rem` (16px, `rounded-2xl`)
- `background-color`: `#ffffff`
- `padding`: `1.75rem` (28px on mobile, `2rem` / 32px on `sm:`)
- `box-shadow`: `0 20px 25px -5px rgba(0, 26, 79, 0.2), 0 8px 10px -6px rgba(0, 26, 79, 0.2)`
- `border`: `1px solid #d5d9e0`
- `max-width`: `26rem` (416px, `max-w-104`)

### Typography
- Header Subtitle: `font-size: 0.75rem` (12px), `letter-spacing: 0.025em`, `color: #565656`
- Header Title: `font-size: 1.5rem` (24px), `font-weight: 600`, `letter-spacing: -0.025em`, `color: #1a1f23`
- Input Labels: `font-size: 0.875rem` (14px), `font-weight: 500`, `color: #333333`
- Helper Text: `font-size: 0.875rem` (14px), `color: #565656`
- Submit Button: `font-size: 0.875rem` (14px), `font-weight: 500`, `height: 2.5rem` (40px)

## Assets
- Logo: `/images/logo-forth-07_8-mobile.png` (282x84)
- Icons: `Eye`, `EyeOff`, `CircleAlert`, `Loader2` from `lucide-react`
