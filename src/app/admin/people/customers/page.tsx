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
import { Search, Pencil, Trash2, Plus, Users, ArrowLeft, Trophy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Customer {
    id: string
    name: string
    email: string
    phone: string // Document number
    phone_number: string // Actual phone
    document_type: string
    points: number
    total_spent: number
    created_at: string
}

export default function CustomersPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [quickSearch, setQuickSearch] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name_paternal: '',
        last_name_maternal: '',
        document_type: 'DNI',
        document_number: '',
        email: '',
        phone: '',
        address: ''
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('loyalty_cards')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCustomers(data || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los clientes',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.document_number) {
            toast({ title: 'Error', description: 'El número de documento es obligatorio', variant: 'destructive' })
            return
        }

        try {
            // Combine names for the name field
            const fullName = `${formData.first_name} ${formData.last_name_paternal} ${formData.last_name_maternal}`.trim()

            const customerData = {
                name: fullName,
                phone: formData.document_number, // Document number
                phone_number: formData.phone, // Actual phone
                document_type: formData.document_type,
                email: formData.email,
            }

            if (editingId) {
                const { error } = await supabase
                    .from('loyalty_cards')
                    .update(customerData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Cliente actualizado' })
            } else {
                const { error } = await supabase
                    .from('loyalty_cards')
                    .insert(customerData)

                if (error) throw error
                toast({ title: 'Cliente creado' })
            }

            setIsModalOpen(false)
            resetForm()
            fetchCustomers()
        } catch (error) {
            console.error('Error saving customer:', error)
            toast({ title: 'Error', description: 'No se pudo guardar el cliente', variant: 'destructive' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return

        try {
            const { error } = await supabase
                .from('loyalty_cards')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast({ title: 'Cliente eliminado' })
            fetchCustomers()
        } catch (error) {
            console.error('Error deleting customer:', error)
            toast({ title: 'Error', description: 'No se pudo eliminar el cliente', variant: 'destructive' })
        }
    }

    const handleEdit = (customer: Customer) => {
        setEditingId(customer.id)

        // Try to parse the name back into components
        const nameParts = (customer.name || '').split(' ')
        setFormData({
            first_name: nameParts[0] || '',
            last_name_paternal: nameParts[1] || '',
            last_name_maternal: nameParts[2] || '',
            document_type: customer.document_type || 'DNI',
            document_number: customer.phone || '',
            email: customer.email || '',
            phone: customer.phone_number || '',
            address: ''
        })
        setIsModalOpen(true)
    }

    const resetForm = () => {
        setEditingId(null)
        setFormData({
            first_name: '',
            last_name_paternal: '',
            last_name_maternal: '',
            document_type: 'DNI',
            document_number: '',
            email: '',
            phone: '',
            address: ''
        })
    }

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // KPIs
    const totalCustomers = customers.length
    const customersWithPoints = customers.filter(c => c.points > 0).length
    const totalPoints = customers.reduce((acc, c) => acc + (c.points || 0), 0)

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clientes</h1>
                        <p className="text-gray-500 mt-1">Gestiona tu base de clientes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Consulta Rápida DNI/RUC"
                            className="pl-10 w-64"
                            value={quickSearch}
                            onChange={(e) => {
                                setQuickSearch(e.target.value)
                                setSearchTerm(e.target.value)
                            }}
                        />
                    </div>
                    <Button
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                            resetForm()
                            setIsModalOpen(true)
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Clientes</p>
                                <p className="text-2xl font-bold">{totalCustomers}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Trophy className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Con Puntos de Fidelidad</p>
                                <p className="text-2xl font-bold">{customersWithPoints}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Trophy className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Puntos Totales</p>
                                <p className="text-2xl font-bold text-purple-600">{totalPoints}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar por nombre, documento, email o teléfono..."
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
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Puntos de Fidelidad</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                                    </TableRow>
                                ) : filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No se encontraron clientes
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">
                                                {customer.name || 'Sin Nombre'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">DNI</span>
                                                    <span className="text-sm text-purple-600">{customer.phone || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {customer.email && (
                                                        <span className="text-sm text-blue-600">{customer.email}</span>
                                                    )}
                                                    {customer.phone_number && (
                                                        <span className="text-xs text-gray-500">{customer.phone_number}</span>
                                                    )}
                                                    {!customer.email && !customer.phone_number && '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {customer.points > 0 ? (
                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                                                        {customer.points} pts
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">0 pts</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-600 hover:bg-gray-100"
                                                        onClick={() => handleEdit(customer)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombres</Label>
                            <Input
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="Nombres del cliente"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Apellido Paterno</Label>
                                <Input
                                    value={formData.last_name_paternal}
                                    onChange={(e) => setFormData({ ...formData, last_name_paternal: e.target.value })}
                                    placeholder="Apellido Paterno"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Apellido Materno</Label>
                                <Input
                                    value={formData.last_name_maternal}
                                    onChange={(e) => setFormData({ ...formData, last_name_maternal: e.target.value })}
                                    placeholder="Apellido Materno"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Documento *</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.document_type}
                                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="RUC">RUC</option>
                                    <option value="CE">Carnet de Extranjería</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Número de Documento *</Label>
                                <Input
                                    value={formData.document_number}
                                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                                    placeholder="8 dígitos"
                                    maxLength={formData.document_type === 'DNI' ? 8 : formData.document_type === 'RUC' ? 11 : 20}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="cliente@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="999 888 777"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Dirección</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Av. Principal 123"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                            {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
