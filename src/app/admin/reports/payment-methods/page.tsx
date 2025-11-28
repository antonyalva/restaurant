'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentMethodsPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/admin/reports/all-sales?tab=metodos')
    }, [router])

    return <div className="p-8">Redirigiendo...</div>
}
