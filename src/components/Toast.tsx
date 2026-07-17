import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "../store/player";

export function Toast() {
  const toast = usePlayer((s) => s.toast);
  const setToast = usePlayer((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast, setToast]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="glass-strong fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-xl"
        >
          {toast}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
