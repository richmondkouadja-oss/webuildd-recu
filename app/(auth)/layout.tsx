export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A]">
      {children}
    </div>
  );
}
