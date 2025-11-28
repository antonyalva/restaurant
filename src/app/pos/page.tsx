'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Coffee, Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Wallet, LogOut, Wifi, WifiOff, Lock, Store, Lightbulb, FileText, Banknote, QrCode, TriangleAlert, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSyncStore } from '@/store/useSyncStore'

interface Product {
    id: string
    name: string
    base_price: number
    category_id: string
    image_url: string | null
}

interface Category {
    id: string
    name: string
    icon: string
}

interface ShiftTotals {
    totalOrders: number
    totalSales: number
    cashSales: number
    cardSales: number
    qrSales: number
    initialCash: number
    expectedCash: number
}

export default function POSPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { items, addItem, updateQuantity, removeItem, clearCart, getSubtotal, getTax, getTotal } = useCartStore()
    const { isOnline, setOnlineStatus, getPendingCount } = useSyncStore()

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showCheckout, setShowCheckout] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr'>('cash')
    const [amountPaid, setAmountPaid] = useState('')
    const [processing, setProcessing] = useState(false)

    // Shift State
    const [isShiftOpen, setIsShiftOpen] = useState<boolean | null>(null) // null = loading
    const [currentShift, setCurrentShift] = useState<any>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [userProfile, setUserProfile] = useState<any>(null)

    // Open Shift Modal
    const [showOpenShiftModal, setShowOpenShiftModal] = useState(false)
    const [initialCash, setInitialCash] = useState('')

    // Close Shift Modal
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false)
    const [shiftTotals, setShiftTotals] = useState<ShiftTotals | null>(null)
    const [finalCash, setFinalCash] = useState('')
    const [closingNotes, setClosingNotes] = useState('')

    useEffect(() => {
        checkAuthAndShift()
        loadData()

        const handleOnline = () => setOnlineStatus(true)
        const handleOffline = () => setOnlineStatus(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const checkAuthAndShift = async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
            router.push('/login')
            return
        }
        setCurrentUser(data.session.user)

        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()
        setUserProfile(profile)

        try {
            const { data: shift } = await supabase
                .from('shifts')
                .select('*')
                .eq('cashier_id', data.session.user.id)
                .eq('status', 'open')
                .single()

            if (shift) {
                setIsShiftOpen(true)
                setCurrentShift(shift)
            } else {
                setIsShiftOpen(false)
                setCurrentShift(null)
            }
        } catch (error) {
            setIsShiftOpen(false)
            setCurrentShift(null)
        }
    }

    const loadData = async () => {
        const [{ data: cats }, { data: prods }] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order'),
            supabase.from('products').select('*').eq('is_active', true)
        ])

        setCategories(cats || [])
        setProducts(prods || [])
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // --- Shift Management ---

    const handleOpenShift = async () => {
        if (!initialCash || isNaN(Number(initialCash))) {
            toast({ title: 'Error', description: 'Monto inválido', variant: 'destructive' })
            return
        }

        setProcessing(true)
        try {
            const { data, error } = await supabase
                .from('shifts')
                .insert({
                    cashier_id: currentUser.id,
                    initial_cash: Number(initialCash),
                    status: 'open',
                    start_time: new Date().toISOString()
                })
                .select()
                .single()

            if (error) throw error

            setIsShiftOpen(true)
            setCurrentShift(data)
            setShowOpenShiftModal(false)
            toast({ title: 'Caja Aperturada', description: `Inicio: S/. ${Number(initialCash).toFixed(2)}` })
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } finally {
            setProcessing(false)
        }
    }

    const prepareCloseShift = async () => {
        if (!currentShift) return

        setProcessing(true)
        try {
            // Fetch orders for this shift
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('cashier_id', currentUser.id)
                .gte('created_at', currentShift.start_time)

            if (error) throw error

            const totals: ShiftTotals = {
                totalOrders: orders?.length || 0,
                totalSales: 0,
                cashSales: 0,
                cardSales: 0,
                qrSales: 0,
                initialCash: Number(currentShift.initial_cash),
                expectedCash: 0
            }

            orders?.forEach(order => {
                const total = Number(order.total)
                totals.totalSales += total
                if (order.payment_method === 'cash') totals.cashSales += total
                if (order.payment_method === 'card') totals.cardSales += total
                if (order.payment_method === 'qr') totals.qrSales += total
            })

            totals.expectedCash = totals.initialCash + totals.cashSales
            setShiftTotals(totals)
            setShowCloseShiftModal(true)
        } catch (error: any) {
            toast({ title: 'Error al calcular totales', description: error.message, variant: 'destructive' })
        } finally {
            setProcessing(false)
        }
    }

    const handleCloseShift = async () => {
        if (!finalCash || isNaN(Number(finalCash))) {
            toast({ title: 'Error', description: 'Ingresa el efectivo real en caja', variant: 'destructive' })
            return
        }

        setProcessing(true)
        try {
            const { error } = await supabase
                .from('shifts')
                .update({
                    end_time: new Date().toISOString(),
                    final_cash: Number(finalCash),
                    expected_cash: shiftTotals?.expectedCash,
                    status: 'closed',
                    notes: closingNotes
                })
                .eq('id', currentShift.id)

            if (error) throw error

            setIsShiftOpen(false)
            setCurrentShift(null)
            setShowCloseShiftModal(false)
            setFinalCash('')
            setClosingNotes('')
            toast({ title: 'Caja Cerrada', description: 'El turno ha finalizado correctamente.' })
        } catch (error: any) {
            toast({ title: 'Error al cerrar caja', description: error.message, variant: 'destructive' })
        } finally {
            setProcessing(false)
        }
    }

    // --- POS Logic ---

    const handleAddToCart = (product: Product) => {
        if (!isShiftOpen) return
        addItem({
            productId: product.id,
            productName: product.name,
            quantity: 1,
            basePrice: product.base_price,
            variantPrice: 0,
            modifiers: []
        })
        toast({ title: 'Añadido', description: product.name })
    }

    const handleCheckout = async () => {
        if (items.length === 0) return

        setProcessing(true)
        try {
            const total = getTotal()
            const subtotal = getSubtotal()
            const tax = getTax()
            const orderNumber = `${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

            const orderData = {
                order_number: orderNumber,
                cashier_id: currentUser.id,
                total,
                subtotal,
                tax,
                payment_method: paymentMethod,
                amount_paid: paymentMethod === 'cash' ? Number(amountPaid) : total,
                change_amount: paymentMethod === 'cash' ? Number(amountPaid) - total : 0,
                synced: isOnline
            }

            const { data: order, error } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single()

            if (error) throw error

            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId,
                quantity: item.quantity,
                unit_price: item.basePrice + item.variantPrice,
                subtotal: item.subtotal
            }))

            await supabase.from('order_items').insert(orderItems)

            toast({ title: '¡Venta completada!', description: `Total: S/. ${total.toFixed(2)}` })
            clearCart()
            setShowCheckout(false)
            setAmountPaid('')
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } finally {
            setProcessing(false)
        }
    }

    const filteredProducts = products.filter(p => {
        const matchesCategory = !selectedCategory || p.category_id === selectedCategory
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    // Calculate difference for close shift
    const cashDifference = shiftTotals && finalCash ? Number(finalCash) - shiftTotals.expectedCash : 0
    const hasDiscrepancy = Math.abs(cashDifference) > 0.01

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Coffee className="w-8 h-8 text-amber-600" />
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">POS Cafeteria</h1>
                            <span className="text-xs text-gray-500 mt-1">Hola, {currentUser?.email?.split('@')[0]}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isShiftOpen === false && (
                            <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                                <Lock className="w-3 h-3" />
                                Caja Cerrada
                            </Badge>
                        )}
                        {!isOnline && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <WifiOff className="w-3 h-3" />
                                Offline {getPendingCount() > 0 && `(${getPendingCount()} pendientes)`}
                            </Badge>
                        )}
                        {isOnline && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Wifi className="w-3 h-3" />
                                Online
                            </Badge>
                        )}

                        {isShiftOpen === false ? (
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => setShowOpenShiftModal(true)}
                            >
                                <Store className="w-4 h-4 mr-2" />
                                Aperturar Caja
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={prepareCloseShift}
                            >
                                <Lock className="w-4 h-4 mr-2" />
                                Cerrar Caja
                            </Button>
                        )}

                        {userProfile?.role === 'admin' && (
                            <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Volver
                            </Button>
                        )}

                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Main Content Area */}
                <div className="flex-1 p-6 relative">
                    {/* Shift Closed Overlay */}
                    {isShiftOpen === false && (
                        <div className="absolute inset-0 z-10 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Lock className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Caja Cerrada</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-8">
                                    Debes aperturar la caja para comenzar a vender y registrar transacciones.
                                </p>
                                <Button
                                    size="lg"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg"
                                    onClick={() => setShowOpenShiftModal(true)}
                                >
                                    Aperturar Caja
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Products Area */}
                    <div className={isShiftOpen === false ? 'filter blur-sm pointer-events-none select-none' : ''}>
                        <div className="mb-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Buscar productos..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 py-6 text-lg"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant={selectedCategory === null ? 'default' : 'outline'}
                                    onClick={() => setSelectedCategory(null)}
                                    className={selectedCategory === null ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                >
                                    Todos
                                </Button>
                                {categories.map((cat) => (
                                    <Button
                                        key={cat.id}
                                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={selectedCategory === cat.id ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                    >
                                        {cat.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <ScrollArea className="h-[calc(100vh-280px)]">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map((product) => (
                                    <Card
                                        key={product.id}
                                        className="cursor-pointer hover:shadow-lg transition-shadow"
                                        onClick={() => handleAddToCart(product)}
                                    >
                                        <CardContent className="p-4 space-y-2">
                                            <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 rounded-lg flex items-center justify-center">
                                                <Coffee className="w-12 h-12 text-amber-700 dark:text-amber-300" />
                                            </div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                                                {product.name}
                                            </h3>
                                            <p className="text-2xl font-bold text-amber-600">
                                                S/. {product.base_price.toFixed(2)}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Cart Sidebar */}
                <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Orden Actual
                        </h2>
                        {items.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearCart}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        {items.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Carrito vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <Card key={index}>
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-sm">{item.productName}</h4>
                                                    {item.variantName && (
                                                        <p className="text-xs text-gray-500">{item.variantName}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeItem(index)}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateQuantity(index, item.quantity - 1)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateQuantity(index, item.quantity + 1)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <p className="font-bold text-amber-600">S/. {item.subtotal.toFixed(2)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="mt-4 space-y-3">
                        <Separator />
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                <span className="font-medium">S/. {getSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Impuesto (18%)</span>
                                <span className="font-medium">S/. {getTax().toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg">
                                <span className="font-bold">Total</span>
                                <span className="font-bold text-amber-600">S/. {getTotal().toFixed(2)}</span>
                            </div>
                        </div>
                        <Button
                            className="w-full h-14 text-lg bg-amber-600 hover:bg-amber-700"
                            disabled={items.length === 0 || !isShiftOpen}
                            onClick={() => setShowCheckout(true)}
                        >
                            <CreditCard className="w-5 h-5 mr-2" />
                            Cobrar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Checkout Dialog */}
            <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finalizar Venta</DialogTitle>
                        <DialogDescription>
                            Total a pagar: S/. {getTotal().toFixed(2)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Button
                                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => setPaymentMethod('cash')}
                            >
                                <Wallet className="w-4 h-4 mr-2" />
                                Efectivo
                            </Button>
                            <Button
                                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => setPaymentMethod('card')}
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Tarjeta
                            </Button>
                            <Button
                                variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => setPaymentMethod('qr')}
                            >
                                <QrCode className="w-4 h-4 mr-2" />
                                QR
                            </Button>
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monto recibido</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    placeholder="0.00"
                                    className="text-lg"
                                />
                                {Number(amountPaid) > 0 && (
                                    <p className="text-sm text-gray-600">
                                        Cambio: S/. {(Number(amountPaid) - getTotal()).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}

                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleCheckout}
                            disabled={processing || (paymentMethod === 'cash' && Number(amountPaid) < getTotal())}
                        >
                            {processing ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Open Shift Modal */}
            <Dialog open={showOpenShiftModal} onOpenChange={setShowOpenShiftModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Store className="w-5 h-5" />
                            Apertura de Caja
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa el monto inicial en efectivo con el que comenzarás tu turno.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Efectivo Inicial</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={initialCash}
                                onChange={(e) => setInitialCash(e.target.value)}
                                placeholder="0.00"
                                className="text-lg"
                                autoFocus
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 items-start">
                            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <span className="font-semibold">Consejo:</span> Cuenta cuidadosamente el efectivo antes de aperturar la caja.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOpenShiftModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleOpenShift}
                            disabled={processing || !initialCash}
                        >
                            {processing ? 'Aperturando...' : 'Aperturar Caja'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Shift Modal */}
            <Dialog open={showCloseShiftModal} onOpenChange={setShowCloseShiftModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <FileText className="w-5 h-5" />
                            Cierre de Caja - Reporte Z
                        </DialogTitle>
                        <DialogDescription>
                            Revisa el resumen de ventas y cuenta el efectivo en caja.
                        </DialogDescription>
                    </DialogHeader>

                    {shiftTotals && (
                        <div className="space-y-6 py-2">
                            {/* Summary Card */}
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Resumen del Turno</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Total de Órdenes:</span>
                                    <span className="font-medium">{shiftTotals.totalOrders}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-b pb-2">
                                    <span>Ventas Totales:</span>
                                    <span>S/. {shiftTotals.totalSales.toFixed(2)}</span>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Banknote className="w-4 h-4 text-green-600" /> Efectivo:
                                        </span>
                                        <span>S/. {shiftTotals.cashSales.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <CreditCard className="w-4 h-4 text-blue-600" /> Tarjeta:
                                        </span>
                                        <span>S/. {shiftTotals.cardSales.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <QrCode className="w-4 h-4 text-purple-600" /> QR:
                                        </span>
                                        <span>S/. {shiftTotals.qrSales.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cash Calculation */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Cálculo de Efectivo</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-800 dark:text-blue-200">Efectivo Inicial:</span>
                                    <span>S/. {shiftTotals.initialCash.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-b border-blue-200 dark:border-blue-800 pb-2">
                                    <span className="text-blue-800 dark:text-blue-200">+ Ventas en Efectivo:</span>
                                    <span>S/. {shiftTotals.cashSales.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-1">
                                    <span className="text-blue-900 dark:text-blue-100">Efectivo Esperado:</span>
                                    <span className="text-blue-700 dark:text-blue-300">S/. {shiftTotals.expectedCash.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Final Cash Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Efectivo Real en Caja</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={finalCash}
                                    onChange={(e) => setFinalCash(e.target.value)}
                                    placeholder="0.00"
                                    className="text-lg"
                                />
                            </div>

                            {/* Discrepancy Alert */}
                            {finalCash && hasDiscrepancy && (
                                <div className={`p-4 rounded-lg flex gap-3 items-start ${cashDifference < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                    {cashDifference < 0 ? (
                                        <TriangleAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="space-y-1">
                                        <p className={`font-bold ${cashDifference < 0 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                                            {cashDifference < 0 ? 'Faltante: ' : 'Sobrante: '}
                                            S/. {Math.abs(cashDifference).toFixed(2)}
                                        </p>
                                        <p className={`text-sm ${cashDifference < 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                            {cashDifference < 0
                                                ? 'Falta efectivo. Por favor verifica el conteo y agrega notas si es necesario.'
                                                : 'Hay más efectivo del esperado. Por favor verifica.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Notas (Opcional)</label>
                                <Textarea
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    placeholder="Agrega cualquier observación sobre el cierre de caja..."
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseShiftModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={handleCloseShift}
                            disabled={processing || !finalCash}
                        >
                            {processing ? 'Cerrando...' : 'Cerrar Caja'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
