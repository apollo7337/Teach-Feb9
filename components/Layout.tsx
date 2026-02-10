
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <header className="w-full h-14 apple-blur fixed top-0 z-50 border-b border-gray-200/50 flex items-center justify-center px-6">
        <div className="max-w-4xl w-full flex justify-between items-center">
          <span className="text-lg font-semibold tracking-tight text-[#1d1d1f]">TeacherIntro <span className="text-blue-600">AI</span></span>
          <nav className="flex gap-6 text-sm font-medium text-[#86868b]">
            <span className="hover:text-[#1d1d1f] cursor-pointer transition-colors">Workspace</span>
            <span className="hover:text-[#1d1d1f] cursor-pointer transition-colors">Resources</span>
          </nav>
        </div>
      </header>
      <main className="mt-24 mb-12 px-4 max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {children}
      </main>
    </div>
  );
};
