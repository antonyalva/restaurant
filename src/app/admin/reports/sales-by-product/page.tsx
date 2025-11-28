'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesByProductPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/admin/reports/all-sales?tab=productos')
    }, [router])

    return <div className="p-8">Redirigiendo...</div>
}
