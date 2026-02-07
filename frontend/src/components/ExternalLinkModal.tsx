import { motion } from 'framer-motion';
import { ExternalLink, AlertTriangle, X, Shield } from 'lucide-react';

interface Props {
  url: string;
  siteName: string;
  onClose: () => void;
}

export default function ExternalLinkModal({ url, siteName, onClose }: Props) {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-amber-600">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Leaving Cliq</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-3">You're about to visit an external website:</p>

        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <p className="text-base font-semibold text-slate-800">{siteName}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{domain}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 bg-slate-50 px-3 py-2 rounded-lg">
          <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>
            Cliq is not responsible for content on external sites. Always verify the URL before
            entering personal information.
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Stay here
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <ExternalLink className="w-4 h-4" />
            Continue
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
