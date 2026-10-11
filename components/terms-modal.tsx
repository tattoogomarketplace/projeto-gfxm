"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/hooks/use-i18n";

export default function TermsModal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-white/10 p-8 rounded-2xl max-w-lg w-full text-white"
      >
        <h2 className="text-2xl font-bold mb-4">{t('terms.requiredTitle')}</h2>
        <p className="text-zinc-400 mb-6 text-sm">
          {t('terms.body')}
        </p>
        
        <label className="flex items-center gap-3 mb-8 cursor-pointer">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => setChecked(e.target.checked)}
            className="w-5 h-5 accent-orange-500"
          />
          <span className="text-sm">{t('terms.iAccept')}</span>
        </label>

        <button
          disabled={!checked}
          onClick={onAccept}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            checked 
              ? "bg-orange-500 hover:bg-orange-600 text-white" 
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {t('terms.confirmAccept')}
        </button>
      </motion.div>
    </div>
  );
}
