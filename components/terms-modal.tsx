"use client";
import { useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { shouldDismissFromPan, useNativeGestures } from "@/hooks/use-native-gestures";

export default function TermsModal({ onAccept, onClose }: { onAccept: () => void; onClose?: () => void }) {
  const [checked, setChecked] = useState(false);
  const { triggerHaptic } = useHapticFeedback();
  const close = onClose || (() => undefined);
  const gestures = useNativeGestures(close, true);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismissFromPan(info)) {
      triggerHaptic("light");
      close();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6" {...gestures}>
      <motion.div 
        initial={{ opacity: 0, y: 64 }}
        animate={{ opacity: 1, y: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        className="bg-zinc-950 border border-white/10 p-8 rounded-t-3xl sm:rounded-2xl max-w-lg w-full text-white"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25 sm:hidden" />
        <h2 className="text-2xl font-bold mb-4">Termos de Uso GFXM</h2>
        <p className="text-zinc-400 mb-6 text-sm">
          Ao prosseguir, você concorda com nossos termos de uso, políticas de privacidade 
          e com o código de conduta da plataforma. O uso inadequado resultará em banimento permanente.
        </p>
        
        <label className="flex min-h-11 items-center gap-3 mb-8 cursor-pointer">
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
          onClick={() => {
            triggerHaptic("success");
            onAccept();
          }}
          className={`w-full min-h-11 py-3 rounded-lg font-bold transition-all ${
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
