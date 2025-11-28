'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Shift {
    id: string
    cashier_id: string
    start_time: string
    end_time: string | null
    initial_cash: number
    final_cash: number | null
    expected_cash: number | null
    status: 'open' | 'closed'
    cashier?: {
        full_name: string | null
        email: string
    }
}

export default function ShiftsPage() {
    const router = useRouter()
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchShifts()
    }, [])

    const fetchShifts = async () => {
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select(`
                    *,
                    cashier:profiles(full_name, email)
                `)
                .order('start_time', { ascending: false })

            if (error) throw error

            setShifts(data || [])
        } catch (error) {
            console.error('Error fetching shifts:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-'
        return `S/. ${amount.toFixed(2)}`
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-'
        return format(new Date(dateString), "d MMM HH:mm", { locale: es })
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historial de Turnos</h1>
                    <p className="text-gray-500 mt-1">Gestiona y revisa los turnos de caja</p>
                </div>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Panel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todos los Turnos</CardTitle>
                    <CardDescription>Haz clic en cualquier fila para ver el detalle completo del turno</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Cajero</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead>Efectivo Inicial</TableHead>
                                    <TableHead>Efectivo Final</TableHead>
                                    <TableHead>Esperado</TableHead>
                                    <TableHead>Diferencia</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            Cargando turnos...
                                        </TableCell>
                                    </TableRow>
                                ) : shifts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            No hay turnos registrados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    shifts.map((shift) => {
                                        const difference = shift.final_cash && shift.expected_cash
                                            ? shift.final_cash - shift.expected_cash
                                            : null

                                        return (
                                            <TableRow
                                                key={shift.id}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/admin/shifts/${shift.id}`)}
                                            >
                                                <TableCell>
                                                    <Badge
                                                        variant={shift.status === 'open' ? 'default' : 'secondary'}
                                                        className={shift.status === 'open' ? 'bg-green-500 hover:bg-green-600' : ''}
                                                    >
                                                        {shift.status === 'open' ? 'Activo' : 'Cerrado'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {shift.cashier?.full_name || shift.cashier?.email?.split('@')[0] || 'Desconocido'}
                                                </TableCell>
                                                <TableCell>{formatDate(shift.start_time)}</TableCell>
                                                <TableCell>{formatDate(shift.end_time)}</TableCell>
                                                <TableCell>{formatCurrency(shift.initial_cash)}</TableCell>
                                                <TableCell>{formatCurrency(shift.final_cash)}</TableCell>
                                                <TableCell>{formatCurrency(shift.expected_cash)}</TableCell>
                                                <TableCell>
                                                    {difference !== null ? (
                                                        <span className={difference < 0 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                                            {formatCurrency(difference)}
                                                        </span>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            router.push(`/admin/shifts/${shift.id}`)
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Ver Detalle
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
