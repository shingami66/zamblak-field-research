import { Navigation } from "./Navigation";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Right Side (RTL Start) - Branding & Logo */}
          <div className="flex items-center gap-4">
            {/* Logo Plate */}
            <div className="bg-background rounded-xl p-2 w-12 h-12 flex items-center justify-center shadow-sm">
              <span className="text-primary font-bold text-xl">Z</span>
            </div>

            {/* Text Branding */}
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              زمبلك للأبحاث الميدانية
            </h1>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex flex-1 justify-start">
            <Navigation />
          </div>

          {/* Left Side (RTL End) - User / Actions (Placeholder for now) */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
              {/* User Avatar Placeholder */}
              U
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
