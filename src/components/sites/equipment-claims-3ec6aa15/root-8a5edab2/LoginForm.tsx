"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { CircleAlert, Eye, EyeOff, KeyRound, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (error) {
      emailInputRef.current?.focus()
    }
  }, [error])

  function fillDemoCredentials() {
    setEmail("indykantanat@gmail.com")
    setPassword("Claim-U8yIjast-2569")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    // Simulate authentication verification
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsPending(false)

    // Mock Authentication Logic
    const cleanEmail = email.trim().toLowerCase()
    const isAuthorized =
      (cleanEmail === "indykantanat@gmail.com" && password === "Claim-U8yIjast-2569") ||
      (cleanEmail === "admin@forth.co.th" && password === "123456")

    if (isAuthorized) {
      router.push(next || "/dashboard")
    } else {
      if (!cleanEmail || !password) {
        setError("กรุณากรอกอีเมลและรหัสผ่าน")
      } else if (!cleanEmail.includes("@")) {
        setError("รูปแบบอีเมลไม่ถูกต้อง")
      } else {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง (ทดสอบด้วย: indykantanat@gmail.com / Claim-U8yIjast-2569)")
      }
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Image
          src="/images/logo-forth-07_8-mobile.png"
          alt="Forth Corporation"
          width={282}
          height={84}
          priority
          className="h-9 w-auto"
        />
        <div className="mt-4 border-t border-border pt-3.5">
          <p className="text-xs tracking-wide text-muted-foreground">
            ระบบบริหารงานเคลมอุปกรณ์
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            เข้าสู่ระบบ
          </h1>
        </div>
      </div>

      {/* Demo helper card */}
      <div className="flex flex-col gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs text-foreground">
        <div className="flex items-center justify-between font-medium text-brand">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="size-3.5" /> บัญชีเข้าใช้งานระบบ
          </span>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          >
            <Sparkles className="size-3" /> กรอกอัตโนมัติ
          </button>
        </div>
        <div className="flex flex-col gap-1 text-muted-foreground text-[11px]">
          <div>อีเมล: <code className="font-mono text-foreground font-semibold">indykantanat@gmail.com</code></div>
          <div>รหัสผ่าน: <code className="font-mono text-foreground font-semibold">Claim-U8yIjast-2569</code></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            name="email"
            ref={emailInputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="admin@forth.co.th"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={!!error}
            className="h-10"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={!!error}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ
        </p>

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full"
          disabled={isPending}
        >
          {isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          เข้าสู่ระบบ
        </Button>
      </form>
    </div>
  )
}
