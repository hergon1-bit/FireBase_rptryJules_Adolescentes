
import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = '2xl' }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose}></div>
      <div className={`relative bg-surface rounded-lg shadow-xl transform transition-all sm:my-8 w-full ${sizeClasses[size]} mx-4`}>
        <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-text-primary" id="modal-title">
                {title}
              </h3>
              <div className="mt-4 text-text-secondary">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
