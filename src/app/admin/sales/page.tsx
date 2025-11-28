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
import { Badge } from '@/components/ui/badge'
import {
    Calendar as CalendarIcon,
    Download,
    Filter,
    Search,
    ArrowLeft,
    ShoppingBag,
    DollarSign,
    TrendingUp,
    CalendarDays,
    Banknote,
    CreditCard,
    QrCode,
    X
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface Order {
    id: string
    created_at: string
    order_number: string
    total: number
    subtotal: number
    tax: number
    payment_method: 'cash' | 'card' | 'qr'
    cashier: {
        full_name: string | null
        email: string
    } | null
    order_items: { id: string }[]
}

export default function SalesHistoryPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: subDays(new Date(), 7),
        to: new Date(),
    })
    const [paymentMethod, setPaymentMethod] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [quickFilter, setQuickFilter] = useState<string>('last7')

    useEffect(() => {
        fetchOrders()
    }, [dateRange])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    cashier:profiles(full_name, email),
                    order_items(id)
                `)
                .order('created_at', { ascending: false })

            if (dateRange.from) {
                query = query.gte('created_at', startOfDay(dateRange.from).toISOString())
            }
            if (dateRange.to) {
                query = query.lte('created_at', endOfDay(dateRange.to).toISOString())
            }

            const { data, error } = await query

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching orders:', error)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }

    // Apply client-side filters
    const filteredOrders = orders.filter(order => {
        const matchesMethod = paymentMethod === 'all' || order.payment_method === paymentMethod
        const matchesSearch = searchTerm === '' ||
            (order.cashier?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesMethod && matchesSearch
    })

    // Calculations
    const totalOrders = filteredOrders.length
    const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0

    const salesByMethod = {
        cash: filteredOrders.filter(o => o.payment_method === 'cash'),
        card: filteredOrders.filter(o => o.payment_method === 'card'),
        qr: filteredOrders.filter(o => o.payment_method === 'qr'),
    }

    const calculateStats = (methodOrders: Order[]) => {
        const total = methodOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        const count = methodOrders.length
        const percentage = totalSales > 0 ? (total / totalSales) * 100 : 0
        return { total, count, percentage }
    }

    const cashStats = calculateStats(salesByMethod.cash)
    const cardStats = calculateStats(salesByMethod.card)
    const qrStats = calculateStats(salesByMethod.qr)

    // Quick Filters Logic
    const applyQuickFilter = (filter: string) => {
        setQuickFilter(filter)
        const today = new Date()
        switch (filter) {
            case 'today':
                setDateRange({ from: today, to: today })
                break
            case 'yesterday':
                const yesterday = subDays(today, 1)
                setDateRange({ from: yesterday, to: yesterday })
                break
            case 'last7':
                setDateRange({ from: subDays(today, 7), to: today })
                break
            case 'month':
                setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })
                break
        }
    }

    const exportCSV = () => {
        const headers = ['Fecha/Hora', 'Orden #', 'Cajero', 'Método', 'Items', 'Subtotal', 'Impuestos', 'Total']
        const rows = filteredOrders.map(order => [
            format(new Date(order.created_at), "yyyy-MM-dd HH:mm:ss"),
            order.order_number,
            order.cashier?.full_name || order.cashier?.email || 'N/A',
            order.payment_method,
            order.order_items?.length || 0,
            (order.subtotal || 0).toFixed(2),
            (order.tax || 0).toFixed(2),
            (order.total || 0).toFixed(2)
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `ventas_${format(new Date(), "yyyy-MM-dd")}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const formatCurrency = (amount: number) => `S/. ${amount.toFixed(2)}`

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historial de Ventas</h1>
                    <p className="text-gray-500 mt-1">Consulta y analiza tus ventas por período</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>

            {/* Filters Section */}
            <Card>
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-500" />
                            <h3 className="font-semibold">Filtros</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-900"
                            onClick={() => {
                                setPaymentMethod('all')
                                setSearchTerm('')
                                applyQuickFilter('last7')
                            }}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Limpiar
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['today', 'yesterday', 'last7', 'month'].map((filter) => (
                            <Button
                                key={filter}
                                variant={quickFilter === filter ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => applyQuickFilter(filter)}
                                className={quickFilter === filter ? 'bg-gray-900 text-white' : ''}
                            >
                                {filter === 'today' && 'Hoy'}
                                {filter === 'yesterday' && 'Ayer'}
                                {filter === 'last7' && 'Últimos 7 días'}
                                {filter === 'month' && 'Este mes'}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fecha Inicio</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange.from && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dateRange.from}
                                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fecha Fin</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange.to && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dateRange.to}
                                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Método de Pago</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="cash">Efectivo</SelectItem>
                                    <SelectItem value="card">Tarjeta</SelectItem>
                                    <SelectItem value="qr">QR / Digital</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Cajero o # Orden..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Total Órdenes</span>
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-blue-600" />
                                <span className="text-2xl font-bold">{totalOrders}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Ventas Totales</span>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <span className="text-2xl font-bold">{formatCurrency(totalSales)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Ticket Promedio</span>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                <span className="text-2xl font-bold">{formatCurrency(averageTicket)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Período</span>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-orange-600" />
                                <span className="text-sm font-semibold">
                                    {dateRange.from ? format(dateRange.from, "dd/MM") : '-'} - {dateRange.to ? format(dateRange.to, "dd/MM") : '-'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Method Breakdown */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Desglose por Método de Pago</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Cash */}
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-900 dark:text-green-100">Efectivo</p>
                                    <p className="text-sm text-green-700 dark:text-green-300">{cashStats.count} órdenes</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(cashStats.total)}</p>
                                <p className="text-xs text-green-600 dark:text-green-400">{cashStats.percentage.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* Card */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-blue-900 dark:text-blue-100">Tarjeta</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">{cardStats.count} órdenes</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(cardStats.total)}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">{cardStats.percentage.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* QR */}
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-purple-900 dark:text-purple-100">QR / Digital</p>
                                    <p className="text-sm text-purple-700 dark:text-purple-300">{qrStats.count} órdenes</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(qrStats.total)}</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">{qrStats.percentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold">Órdenes ({filteredOrders.length})</h3>
                        <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700 border-none" onClick={exportCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha/Hora</TableHead>
                                    <TableHead>Cajero</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="text-right">Impuestos</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            Cargando ventas...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                            No se encontraron ventas en este período
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(order.created_at), "dd/MM/yyyy")}</span>
                                                    <span className="text-xs text-gray-500">{format(new Date(order.created_at), "HH:mm:ss")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {order.cashier?.full_name || order.cashier?.email?.split('@')[0] || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {order.payment_method === 'cash' && <Banknote className="w-4 h-4 text-green-600" />}
                                                    {order.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                                                    {order.payment_method === 'qr' && <QrCode className="w-4 h-4 text-purple-600" />}
                                                    <span className="capitalize">{order.payment_method}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{order.order_items?.length || 0}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.subtotal || 0)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.tax || 0)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(order.total || 0)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Completed
                                                </Badge>
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
