import { Font } from "@react-pdf/renderer"

// Register Thai hyphenation handler to avoid awkward hyphen breaks
Font.registerHyphenationCallback((word) => [word])

let fontRegisterPromise: Promise<void> | null = null

function getFontUrl(fileName: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/fonts/${fileName}`
  }
  return `/fonts/${fileName}`
}

/**
 * Robust Thai font registration for @react-pdf/renderer.
 * Uses client-side fetch + base64 data URI loader in browser to ensure TTF binary is
 * fully parsed in-memory without truncation, vowel shifting, or race conditions.
 * In Node, resolves to absolute file system paths.
 * Declares all font weights (normal, bold, 400, 700) to guarantee stable bounding boxes.
 */
export async function registerPdfFonts(): Promise<void> {
  if (fontRegisterPromise) return fontRegisterPromise

  fontRegisterPromise = (async () => {
    try {
      if (typeof window !== "undefined") {
        const origin = window.location.origin || ""
        const [regRes, boldRes] = await Promise.all([
          fetch(`${origin}/fonts/THSarabunNew.ttf`),
          fetch(`${origin}/fonts/THSarabunNew-Bold.ttf`),
        ])

        if (regRes.ok && boldRes.ok) {
          const [regBuffer, boldBuffer] = await Promise.all([
            regRes.arrayBuffer(),
            boldRes.arrayBuffer(),
          ])

          const toBase64 = (buffer: ArrayBuffer) => {
            let binary = ""
            const bytes = new Uint8Array(buffer)
            const len = bytes.byteLength
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            return window.btoa(binary)
          }

          const regBase64 = `data:font/ttf;base64,${toBase64(regBuffer)}`
          const boldBase64 = `data:font/ttf;base64,${toBase64(boldBuffer)}`

          Font.register({
            family: "THSarabunNew",
            fonts: [
              {
                src: regBase64,
                fontWeight: "normal",
                fontStyle: "normal",
              },
              {
                src: regBase64,
                fontWeight: 400,
                fontStyle: "normal",
              },
              {
                src: regBase64,
                fontWeight: 400,
                fontStyle: "italic",
              },
              {
                src: boldBase64,
                fontWeight: "bold",
                fontStyle: "normal",
              },
              {
                src: boldBase64,
                fontWeight: 700,
                fontStyle: "normal",
              },
              {
                src: boldBase64,
                fontWeight: 700,
                fontStyle: "italic",
              },
            ],
          })
          return
        }
      }

      // Fallback for Node environment or direct path loader
      Font.register({
        family: "THSarabunNew",
        fonts: [
          {
            src: getFontUrl("THSarabunNew.ttf"),
            fontWeight: "normal",
            fontStyle: "normal",
          },
          {
            src: getFontUrl("THSarabunNew.ttf"),
            fontWeight: 400,
            fontStyle: "normal",
          },
          {
            src: getFontUrl("THSarabunNew.ttf"),
            fontWeight: 400,
            fontStyle: "italic",
          },
          {
            src: getFontUrl("THSarabunNew-Bold.ttf"),
            fontWeight: "bold",
            fontStyle: "normal",
          },
          {
            src: getFontUrl("THSarabunNew-Bold.ttf"),
            fontWeight: 700,
            fontStyle: "normal",
          },
          {
            src: getFontUrl("THSarabunNew-Bold.ttf"),
            fontWeight: 700,
            fontStyle: "italic",
          },
        ],
      })
    } catch (err) {
      console.warn("[PDF Font Register] Registration fallback notice:", err)
    }
  })()

  return fontRegisterPromise
}

// Initial synchronous registration as immediate fallback
try {
  Font.register({
    family: "THSarabunNew",
    fonts: [
      {
        src: getFontUrl("THSarabunNew.ttf"),
        fontWeight: "normal",
        fontStyle: "normal",
      },
      {
        src: getFontUrl("THSarabunNew.ttf"),
        fontWeight: 400,
        fontStyle: "normal",
      },
      {
        src: getFontUrl("THSarabunNew.ttf"),
        fontWeight: 400,
        fontStyle: "italic",
      },
      {
        src: getFontUrl("THSarabunNew-Bold.ttf"),
        fontWeight: "bold",
        fontStyle: "normal",
      },
      {
        src: getFontUrl("THSarabunNew-Bold.ttf"),
        fontWeight: 700,
        fontStyle: "normal",
      },
      {
        src: getFontUrl("THSarabunNew-Bold.ttf"),
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  })
} catch {
  // Ignore initial synchronous register errors in SSR
}
