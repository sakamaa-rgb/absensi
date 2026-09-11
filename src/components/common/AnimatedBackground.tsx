import React from 'react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-slate-50/80">
      {/* Subtle tech grid/dots pattern */}
      <div className="absolute inset-0 bg-tech-dots opacity-50" />

      {/* DESKTOP (Window) - Rich Floating Fluid Gradient Mesh (GPU Accelerated) */}
      <div className="hidden md:block absolute inset-0 overflow-hidden">
        {/* Floating Gradient Blob 1 - Soft Blue / Indigo */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-blue-300/40 via-indigo-200/35 to-sky-200/30 rounded-full blur-3xl animate-blob-1" />

        {/* Floating Gradient Blob 2 - Cyan / Emerald */}
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-200/40 via-blue-200/30 to-emerald-200/25 rounded-full blur-3xl animate-blob-2" />

        {/* Floating Gradient Blob 3 - Violet / Rose */}
        <div className="absolute -bottom-32 left-1/4 w-[650px] h-[650px] bg-gradient-to-tr from-indigo-200/35 via-purple-200/30 to-pink-200/25 rounded-full blur-3xl animate-blob-3" />

        {/* Center Subtle Aurora Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* MOBILE (Smartphones) - Ultra-Lightweight Ambient Gradient (Zero Lag, No Heavy GPU Blur Filter) */}
      <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none opacity-70">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-blue-200/35 rounded-full blur-xl" />
        <div className="absolute top-1/2 -right-16 w-80 h-80 bg-indigo-200/30 rounded-full blur-xl" />
        <div className="absolute -bottom-16 left-1/3 w-64 h-64 bg-cyan-200/25 rounded-full blur-xl" />
      </div>
    </div>
  );
};

