import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, QrCode, Download,
  Check, Copy, Share2, ShieldCheck,
  Building2, Bike, Heart
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  type PwaRole,
  PWA_PORTALS,
  getPwaInstallUrl,
  promptNativePwaInstall,
  canPromptNativeInstall,
  setPwaManifestForRole
} from '../utils/pwaManager';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: PwaRole;
}

const ROLE_ICONS: Record<PwaRole, React.ElementType> = {
  customer: Heart,
  business: Building2,
  rider: Bike
};

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'customer'
}) => {
  const [activeRole, setActiveRole] = useState<PwaRole>(initialRole);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [canInstallNative, setCanInstallNative] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Sync initialRole when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveRole(initialRole);
    }
  }, [isOpen, initialRole]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Check native install availability
  useEffect(() => {
    setCanInstallNative(canPromptNativeInstall());

    const handleInstallable = () => setCanInstallNative(true);
    const handleInstalled = () => {
      setInstallSuccess(true);
      setCanInstallNative(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  // Generate QR code for the active role URL
  useEffect(() => {
    if (!isOpen) return;

    // Dynamically update head manifest so installing on current device matches tab
    setPwaManifestForRole(activeRole);

    const targetUrl = getPwaInstallUrl(activeRole);
    QRCode.toDataURL(targetUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#262626',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, activeRole]);

  const handleCopy = () => {
    const targetUrl = getPwaInstallUrl(activeRole);
    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleNativeInstall = async () => {
    const installed = await promptNativePwaInstall();
    if (installed) {
      setInstallSuccess(true);
    }
  };

  if (!isOpen) return null;

  const currentPortal = PWA_PORTALS[activeRole];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl sm:rounded-[2rem] w-full max-w-[680px] overflow-hidden shadow-2xl border border-accent-brown/10 relative flex flex-col my-auto max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 id="pwa-modal-title" className="text-lg sm:text-xl font-black text-accent-brown tracking-tight leading-tight">
                  Get the App
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Scan the code to use Hi-Vet on your phone
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* 3 Portal Tabs */}
          <div className="p-3 sm:p-4 bg-slate-50/80 border-b border-slate-100 shrink-0">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-200/60 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl" role="tablist">
              {(['customer', 'business', 'rider'] as PwaRole[]).map((role) => {
                const cfg = PWA_PORTALS[role];
                const RoleIcon = ROLE_ICONS[role];
                const isSelected = activeRole === role;

                return (
                  <button
                    key={role}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveRole(role)}
                    className={`py-2 sm:py-2.5 px-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-accent-brown shadow-sm font-black'
                        : 'text-slate-600 hover:text-accent-brown hover:bg-white/50'
                    }`}
                  >
                    <RoleIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isSelected ? 'text-brand' : 'opacity-70'}`} />
                    <span className="truncate">{cfg.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="p-4 sm:p-7 overflow-y-auto flex flex-col md:flex-row gap-5 sm:gap-7 items-center md:items-start justify-between">
            {/* Left: QR Code Card */}
            <div className="w-full md:w-[240px] shrink-0 flex flex-col items-center text-center">
              <div className="p-3 sm:p-4 bg-white rounded-2xl border border-accent-brown/10 shadow-sm relative group">
                <div className="relative">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${currentPortal.title}`}
                      className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg block mx-auto aspect-square object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-medium text-xs">
                      Loading code...
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Safe direct link</span>
              </div>
            </div>

            {/* Right: Info, Instructions & Actions */}
            <div className="flex-1 w-full space-y-3.5 sm:space-y-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-accent-brown tracking-tight">
                  {currentPortal.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-1">
                  {currentPortal.description}
                </p>
              </div>

              {/* Install Instructions Box */}
              <div className="bg-[#FAF9F6] border border-accent-brown/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                <p className="text-xs font-bold text-accent-brown">
                  How to install on your phone:
                </p>

                <div className="space-y-2 text-xs text-slate-700 font-normal leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Open your phone camera and point it at the code.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Tap the link that opens on your phone.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Tap <strong>Share</strong> <Share2 className="w-3 h-3 inline text-slate-500" /> and pick <strong>"Add to Home Screen"</strong> (iPhone) or tap <strong>"Install app"</strong> (Android).
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {canInstallNative && (
                  <button
                    onClick={handleNativeInstall}
                    className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs sm:text-sm hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on this device</span>
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  className="flex-1 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {installSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>App installed successfully!</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PwaInstallModal;
