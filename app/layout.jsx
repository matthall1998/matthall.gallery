import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'matthall.gallery',
  description: 'Photography portfolio by Matthew Hall',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

  return (
    <html lang="en">
      <body>
        {children}
        {umamiScriptUrl && umamiWebsiteId && (
          <Script
            strategy="afterInteractive"
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
          />
        )}
        {googleAnalyticsId && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`}
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(googleAnalyticsId).replace(/</g, '\\u003c')});
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
