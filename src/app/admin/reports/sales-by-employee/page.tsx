'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesByEmployeePage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/admin/reports/all-sales?tab=empleados')
    }, [router])

    return <div className="p-8">Redirigiendo...</div>
}
