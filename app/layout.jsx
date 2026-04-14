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
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-4ZNYTJ659Z"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4ZNYTJ659Z');
          `}
        </Script>
      </body>
    </html>
  )
}
