import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
export type ModalAlign   = 'center' | 'top';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width for the card. Default: '2xl' */
  maxWidth?: ModalMaxWidth;
  /** 'center' vertically centers short modals; 'top' pins them near the top for long/tabbed content. Default: 'center' */
  align?: ModalAlign;
}

const MAX_W: Record<ModalMaxWidth, string> = {
  sm:    'max-w-sm',
  md:    'max-w-md',
  lg:    'max-w-lg',
  xl:    'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  maxWidth = '2xl',
  align = 'center',
}: ModalProps) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Scroll + centering wrapper */}
      <div
        className={`fixed inset-0 z-[110] flex justify-center p-4 overflow-y-auto ${
          align === 'top' ? 'items-start pt-10' : 'items-center'
        }`}
        onClick={onClose}
      >
        {/* Modal card */}
        <div
          className={`relative w-full ${MAX_W[maxWidth]} my-8 rounded-2xl shadow-2xl border`}
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};
