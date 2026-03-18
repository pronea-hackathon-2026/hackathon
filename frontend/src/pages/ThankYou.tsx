import { CheckCircle } from 'lucide-react'

export default function ThankYou() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
      <div className="w-20 h-20 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
        <CheckCircle size={40} className="text-emerald-400" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold mb-2">Thank you!</h1>
        <p className="text-muted-foreground max-w-md">
          Your interview has been submitted successfully. The hiring team will review your answers and get back to you shortly.
        </p>
      </div>
    </div>
  )
}
