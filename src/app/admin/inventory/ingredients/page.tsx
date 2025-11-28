'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Package, AlertTriangle, Save, Search, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Ingredient {
    id: string
    name: string
    current_stock: number
    unit: string
    min_stock_level: number
    cost_per_unit: number
}

interface StockLog {
    id: string
    created_at: string
    change_amount: number
    reason: string
    ingredient: { name: string }
    order_id: string | null
    order: { cashier: { full_name: string } } | null
}

export default function InventoryPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [logs, setLogs] = useState<StockLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal States
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
    const [isUpdateOpen, setIsUpdateOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

    // Purchase Form
    const [purchaseData, setPurchaseData] = useState({
        ingredient_id: '',
        quantity: '',
        cost: '',
        supplier: ''
    })

    // Update Form
    const [stockAdjustment, setStockAdjustment] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        await Promise.all([loadIngredients(), loadLogs()])
        setLoading(false)
    }

    const loadIngredients = async () => {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('name')

        if (error) {
            console.error('Error loading ingredients:', error)
        } else {
            setIngredients(data || [])
        }
    }

    const loadLogs = async () => {
        const { data, error } = await supabase
            .from('stock_logs')
            .select(`
                *,
                ingredient:ingredients(name),
                order:orders(
                    cashier:profiles(full_name)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            console.error('Error loading logs:', error)
        } else {
            setLogs(data || [])
        }
    }

    const handlePurchase = async () => {
        if (!purchaseData.ingredient_id || !purchaseData.quantity) {
            toast({ title: 'Error', description: 'Completa los campos requeridos', variant: 'destructive' })
            return
        }

        try {
            const quantity = parseFloat(purchaseData.quantity)
            const cost = parseFloat(purchaseData.cost) || 0

            // 1. Update Stock
            const { error: updateError } = await supabase.rpc('increment_stock', {
                row_id: purchaseData.ingredient_id,
                quantity: quantity
            })

            if (updateError) {
                // Fallback if RPC doesn't exist (manual update)
                const ing = ingredients.find(i => i.id === purchaseData.ingredient_id)
                if (ing) {
                    await supabase
                        .from('ingredients')
                        .update({ current_stock: ing.current_stock + quantity })
                        .eq('id', ing.id)
                }
            }

            // 2. Log Movement
            await supabase.from('stock_logs').insert({
                ingredient_id: purchaseData.ingredient_id,
                change_amount: quantity,
                reason: `Compra: ${purchaseData.supplier || 'General'}`
            })

            // 3. Update Cost (Weighted Average could be implemented here, simplified for now)
            if (cost > 0) {
                await supabase
                    .from('ingredients')
                    .update({ cost_per_unit: cost })
                    .eq('id', purchaseData.ingredient_id)
            }

            toast({ title: 'Compra registrada', description: 'Stock actualizado correctamente' })
            setIsPurchaseOpen(false)
            setPurchaseData({ ingredient_id: '', quantity: '', cost: '', supplier: '' })
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const handleUpdateStock = async () => {
        if (!selectedIngredient || !stockAdjustment) return

        try {
            const adjustment = parseFloat(stockAdjustment)
            const newStock = selectedIngredient.current_stock + adjustment

            await supabase
                .from('ingredients')
                .update({ current_stock: newStock })
                .eq('id', selectedIngredient.id)

            await supabase.from('stock_logs').insert({
                ingredient_id: selectedIngredient.id,
                change_amount: adjustment,
                reason: 'Ajuste Manual'
            })

            toast({ title: 'Stock actualizado' })
            setIsUpdateOpen(false)
            setStockAdjustment('')
            setSelectedIngredient(null)
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    // KPIs
    const totalProducts = ingredients.length
    const totalValue = ingredients.reduce((acc, curr) => acc + (curr.current_stock * (curr.cost_per_unit || 0)), 0)
    const lowStockCount = ingredients.filter(i => i.current_stock <= i.min_stock_level).length

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventario</h1>
                    <p className="text-gray-500 mt-1">Gestiona el stock y registra movimientos</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsPurchaseOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Compra
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Total Productos</span>
                            <span className="text-3xl font-bold">{totalProducts}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Valor del Inventario</span>
                            <span className="text-3xl font-bold">S/ {totalValue.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Stock Bajo</span>
                            <span className="text-3xl font-bold text-orange-600">{lowStockCount}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="stock" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="stock">Stock Actual</TabsTrigger>
                    <TabsTrigger value="history">Historial de Movimientos</TabsTrigger>
                </TabsList>

                {/* Stock Tab */}
                <TabsContent value="stock" className="mt-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="relative w-72">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Buscar producto..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Costo Unit.</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredIngredients.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>S/ {item.cost_per_unit?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell>
                                                    <span className={item.current_stock <= item.min_stock_level ? "text-orange-600 font-bold" : "text-blue-600 font-bold"}>
                                                        {item.current_stock} {item.unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {item.current_stock <= item.min_stock_level && (
                                                        <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50">
                                                            Bajo Stock
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedIngredient(item)
                                                            setIsUpdateOpen(true)
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Cantidad</TableHead>
                                            <TableHead>Motivo</TableHead>
                                            <TableHead>Usuario</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                <TableCell className="font-medium">{log.ingredient?.name}</TableCell>
                                                <TableCell>
                                                    {log.change_amount > 0 ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                                                            <ArrowUpRight className="w-3 h-3 mr-1" /> Entrada
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                                                            <ArrowDownLeft className="w-3 h-3 mr-1" /> Salida
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                                </TableCell>
                                                <TableCell>{log.reason}</TableCell>
                                                <TableCell className="text-gray-500">
                                                    {log.order?.cashier?.full_name || 'Sistema/Admin'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Purchase Modal */}
            <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Compra</DialogTitle>
                        <DialogDescription>Ingresa los detalles de la compra para aumentar el stock.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Producto</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={purchaseData.ingredient_id}
                                onChange={(e) => setPurchaseData({ ...purchaseData, ingredient_id: e.target.value })}
                            >
                                <option value="">Seleccionar producto...</option>
                                {ingredients.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={purchaseData.quantity}
                                    onChange={(e) => setPurchaseData({ ...purchaseData, quantity: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Costo Unitario (S/)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={purchaseData.cost}
                                    onChange={(e) => setPurchaseData({ ...purchaseData, cost: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Proveedor (Opcional)</Label>
                            <Input
                                placeholder="Nombre del proveedor"
                                value={purchaseData.supplier}
                                onChange={(e) => setPurchaseData({ ...purchaseData, supplier: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPurchaseOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePurchase} className="bg-blue-600 hover:bg-blue-700">Registrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Modal */}
            <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajuste Manual: {selectedIngredient?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cantidad a ajustar (+/-)</Label>
                            <Input
                                type="number"
                                placeholder="Ej: -5 (Pérdida) o 10 (Corrección)"
                                value={stockAdjustment}
                                onChange={(e) => setStockAdjustment(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">Use números negativos para restar stock.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdateStock} className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
