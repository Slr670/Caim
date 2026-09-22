"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? ""

  const [showPassword, setShowPassword] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (error) {
      emailInputRef.current?.focus()
    }
  }, [error])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Simulate login server action
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsPending(false)

    // Demonstration validation logic
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน")
    } else if (!email.includes("@")) {
      setError("รูปแบบอีเมลไม่ถูกต้อง")
    } else if (password.length < 6) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    } else {
      // Valid mock login
      setError("ระบบสาธิต (Demo): บัญชีผู้ใช้นี้ยังไม่ได้เปิดใช้งานในระบบจริง")
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
            placeholder=""
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
              placeholder=""
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
