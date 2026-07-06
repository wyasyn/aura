import './globals.css';

export const metadata = {
  title: 'Aura',
  description: 'AI skin intelligence for personalized skincare guidance.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
