'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ArrowLeft, Gift, Trophy, Users, Settings } from 'lucide-react'

interface Customer {
    id: string
    name: string
    phone: string
    phone_number: string
    points: number
}

export default function LoyaltyDashboardPage() {
    const router = useRouter()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [activeRules, setActiveRules] = useState(0)
    const [pendingRewards, setPendingRewards] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch customers
            const { data: customersData, error: customersError } = await supabase
                .from('loyalty_cards')
                .select('*')
                .order('created_at', { ascending: false })

            if (customersError) throw customersError
            setCustomers(customersData || [])

            // Fetch active rules count
            const { data: rulesData, error: rulesError } = await supabase
                .from('loyalty_rules')
                .select('id')
                .eq('is_active', true)

            if (rulesError) throw rulesError
            setActiveRules(rulesData?.length || 0)

            // Calculate pending rewards (customers with points > 0)
            const pending = customersData?.filter(c => c.points > 0).length || 0
            setPendingRewards(pending)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.phone_number?.includes(searchTerm)
    )

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Fidelidad</h1>
                        <p className="text-gray-500 mt-1">Monitoreo de recompensas y clientes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Volver
                    </Button>
                    <Button
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => router.push('/admin/loyalty/rules')}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Reglas
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Recompensas Pendientes</p>
                                <p className="text-3xl font-bold">{pendingRewards}</p>
                                <p className="text-xs text-gray-400 mt-1">Premios por canjear</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Gift className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Reglas Activas</p>
                                <p className="text-3xl font-bold">{activeRules}</p>
                                <p className="text-xs text-gray-400 mt-1">Campañas en curso</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Trophy className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Clientes</p>
                                <p className="text-3xl font-bold">{customers.length}</p>
                                <p className="text-xs text-gray-400 mt-1">Registrados en base de datos</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Customers Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4">Estado de Clientes</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar por nombre, DNI o teléfono..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Recompensas Pendientes</TableHead>
                                    <TableHead>Detalle Premios</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell>
                                    </TableRow>
                                ) : filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            No se encontraron clientes
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{customer.name || 'Sin Nombre'}</span>
                                                    {customer.phone_number && (
                                                        <span className="text-xs text-gray-500">{customer.phone_number}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{customer.phone || '-'}</TableCell>
                                            <TableCell>
                                                <span className="text-gray-500">-</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-gray-500">-</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
