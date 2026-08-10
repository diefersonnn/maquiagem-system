import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gold-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-gold-500 mb-6 shadow-lift">
          <Sparkles size={28} className="text-white" />
        </div>
        <p className="text-6xl font-bold text-stone-900 dark:text-white tracking-tight">404</p>
        <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-200 mt-3">Página não encontrada</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">O endereço que você acessou não existe ou foi movido.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          <ArrowLeft size={16} />
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}
