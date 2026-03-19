import { CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ThankYou() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)] p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-w-lg flex-col items-center gap-6 text-center"
      >
        <div className="relative flex h-24 w-24 items-center justify-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.9, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 rounded-full bg-emerald-100"
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="absolute inset-[10px] rounded-full border border-emerald-200 bg-white shadow-sm"
          />
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_12px_30px_rgba(5,150,105,0.22)]"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.28 }}
            >
              <CheckCircle2 size={28} />
            </motion.div>
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1.32], opacity: [0.16, 0.07, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border border-emerald-300"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground">Thank you!</h1>
          <p className="max-w-md text-[17px] leading-8 text-muted-foreground">
            Your interview has been submitted successfully. The hiring team will review your answers and get back to you shortly.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
