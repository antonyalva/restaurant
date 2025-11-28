'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function CashRegisterPage() {
    const router = useRouter()

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Apertura y Cierre de Caja</h1>
                    <p className="text-gray-500 mt-1">Análisis de operaciones de caja</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>

            <Card>
                <CardContent className="p-12 text-center">
                    <p className="text-gray-500">Reporte de apertura y cierre de caja próximamente</p>
                </CardContent>
            </Card>
        </div>
    )
}
