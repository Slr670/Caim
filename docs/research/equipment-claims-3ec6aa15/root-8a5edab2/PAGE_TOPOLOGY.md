# Page Topology - Equipment Claims Login Page

## Structure Overview
The login page is a full-viewport centered card interface with layered visual backgrounds.

```
<main> (relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10)
  ├── <div> (absolute inset-x-0 bottom-0 h-[118%])
  │     └── <Image> (src="/images/IMG_8154_enhanced_2x.png", fill, object-cover object-bottom)
  ├── <div> (absolute inset-0 bg-[linear-gradient(to_bottom,...)])
  └── <div> (animate-in fade-in slide-in-from-bottom-2 relative w-full max-w-104 duration-500)
        └── <div.card> (rounded-2xl bg-card p-7 shadow-xl shadow-brand-navy/20 ring-1 ring-border sm:p-8)
              └── <Suspense fallback={<LoginSkeleton />}>
                    └── <LoginForm>
                          ├── Header Area
                          │     ├── Logo: <Image src="/images/logo-forth-07_8-mobile.png" width={282} height={84} />
                          │     └── Divider & Titles (border-t border-border pt-3.5)
                          │           ├── Subtitle: "ระบบบริหารงานเคลมอุปกรณ์" (text-xs tracking-wide text-muted-foreground)
                          │           └── Title: "เข้าสู่ระบบ" (mt-1 text-2xl font-semibold tracking-tight)
                          └── Form Area (<form className="flex flex-col gap-4">)
                                ├── Hidden input "next"
                                ├── (Optional) Error Alert Banner
                                ├── Email Field Group (<Label>, <Input type="email">)
                                ├── Password Field Group (<Label>, <Input type="password">, toggle button with Eye/EyeOff)
                                ├── Helper Text: "ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ" (text-sm text-muted-foreground)
                                └── Submit Button: "เข้าสู่ระบบ" (Button type="submit" size="lg" h-10 w-full)
```

## Z-Index & Layering
1. Background Image layer (`z-0`)
2. Navy Gradient overlay (`z-0`)
3. Center Card container (`relative z-10`)
