import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    window.api?.window?.minimize();
  };

  const handleMaximize = () => {
    window.api?.window?.maximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.api?.window?.close();
  };

  return (
    <div className="title-bar h-8 bg-dark-950/95 backdrop-blur-xl flex items-center justify-between select-none">
      {/* Drag Region - Left Side */}
      <div className="flex-1 h-full flex items-center px-3">
        {/* Traffic Light Style Dots (decorative) */}
        <div className="hidden md:flex items-center gap-1.5 opacity-30">
          <div className="w-2 h-2 rounded-full bg-dark-500" />
          <div className="w-2 h-2 rounded-full bg-dark-500" />
          <div className="w-2 h-2 rounded-full bg-dark-500" />
        </div>
      </div>

      {/* Window Controls - macOS Style */}
      <div className="title-bar-button flex items-center h-full">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="group w-12 h-full flex items-center justify-center
                     text-dark-500 hover:bg-dark-800/80 transition-all duration-200"
        >
          <div className="w-2.5 h-[1.5px] bg-current rounded-full group-hover:bg-white transition-colors" />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="group w-12 h-full flex items-center justify-center
                     text-dark-500 hover:bg-dark-800/80 transition-all duration-200"
        >
          {isMaximized ? (
            <Copy size={10} className="group-hover:text-white transition-colors" />
          ) : (
            <div className="w-2.5 h-2.5 border-[1.5px] border-current rounded-[2px] group-hover:border-white transition-colors" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="group w-12 h-full flex items-center justify-center
                     text-dark-500 hover:bg-red-500 transition-all duration-200"
        >
          <X size={12} className="group-hover:text-white transition-colors" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
