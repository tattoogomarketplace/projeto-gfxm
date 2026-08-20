"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TermsModal({ onAccept }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-white/10 p-8 rounded-2xl max-w-lg w-full text-white"
      >
        <h2 className="text-2xl font-bold mb-4">Termos de Uso GFXM</h2>
        <p className="text-zinc-400 mb-6 text-sm">
          Ao prosseguir, você concorda com nossos termos de uso, políticas de privacidade 
          e com o código de conduta da plataforma. O uso inadequado resultará em banimento permanente.
        </p>
        
        <label className="flex items-center gap-3 mb-8 cursor-pointer">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => setChecked(e.target.checked)}
            className="w-5 h-5 accent-orange-500"
          />
          <span className="text-sm">Li e aceito os termos.</span>
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
          Confirmar Aceite
        </button>
      </motion.div>
    </div>
  );
}
