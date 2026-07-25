import React, { useEffect, useState } from 'react';

interface TooltipBoxProps {
  activeTip: { text: string; rect: DOMRect } | null;
  onClose: () => void;
}

export const TooltipBox: React.FC<TooltipBoxProps> = ({ activeTip, onClose }) => {
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!activeTip) {
      setCoords(null);
      return;
    }

    const { rect } = activeTip;
    const W = Math.min(260, window.innerWidth - 16);
    const left = Math.round(Math.min(Math.max(8, rect.left + rect.width / 2 - W / 2), window.innerWidth - W - 8));
    const below = rect.bottom + 8;
    // Approximating box height ~100px
    const fits = below + 100 < window.innerHeight - 8;
    const top = Math.round(fits ? below : Math.max(8, rect.top - 108));

    setCoords({ top, left, width: W });
  }, [activeTip]);

  useEffect(() => {
    const handleScroll = () => onClose();
    const handleResize = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose]);

  if (!activeTip || !coords) return null;

  return (
    <div
      id="tipBox"
      style={{
        position: 'fixed',
        zIndex: 120,
        maxWidth: `${coords.width}px`,
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className="bg-[#0B1B3A] dark:bg-[#1d2f4d] text-white rounded-xl p-3 text-[12.5px] leading-relaxed font-medium shadow-2xl border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {activeTip.text}
    </div>
  );
};
