export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout provides a clean slate for authentication pages,
  // without the main app's sidebar or navigation.
  // The root layout at `src/app/layout.tsx` provides the `<html>`, `<body>`,
  // and theme providers.
  return <main>{children}</main>;
}
