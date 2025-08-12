import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  show: boolean
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20"
          >
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
              >
                <Loader2 className="w-6 h-6 text-white" />
              </motion.div>
              
              <motion.h3
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-semibold text-gray-800"
              >
                Scanning for games...
              </motion.h3>
              
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-600 text-center max-w-xs"
              >
                Please wait while we detect your Steam games and scan your library.
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
