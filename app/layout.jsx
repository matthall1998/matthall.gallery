import './globals.css'

export const metadata = {
  title: 'Matt Hall - Gallery',
  description: 'Photography portfolio by Matthew Hall',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
