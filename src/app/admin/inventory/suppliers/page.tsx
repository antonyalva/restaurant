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
import { Search, Pencil, Trash2, Plus, Truck, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Supplier {
    id: string
    name: string
    ruc: string
    contact_name: string
    phone: string
    email: string
    address: string
}

export default function SuppliersPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        ruc: '',
        contact_name: '',
        phone: '',
        email: '',
        address: ''
    })

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name')

            if (error) throw error
            setSuppliers(data || [])
        } catch (error) {
            console.error('Error fetching suppliers:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los proveedores',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.name) {
            toast({
                title: 'Error',
                description: 'El nombre es obligatorio',
                variant: 'destructive'
            })
            return
        }

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('suppliers')
                    .update(formData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Proveedor actualizado' })
            } else {
                // Create
                const { error } = await supabase
                    .from('suppliers')
                    .insert(formData)

                if (error) throw error
                toast({ title: 'Proveedor creado' })
            }

            setIsModalOpen(false)
            resetForm()
            fetchSuppliers()
        } catch (error) {
            console.error('Error saving supplier:', error)
            toast({
                title: 'Error',
                description: 'No se pudo guardar el proveedor',
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return

        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast({ title: 'Proveedor eliminado' })
            fetchSuppliers()
        } catch (error) {
            console.error('Error deleting supplier:', error)
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el proveedor',
                variant: 'destructive'
            })
        }
    }

    const handleEdit = (supplier: Supplier) => {
        setEditingId(supplier.id)
        setFormData({
            name: supplier.name,
            ruc: supplier.ruc || '',
            contact_name: supplier.contact_name || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || ''
        })
        setIsModalOpen(true)
    }

    const resetForm = () => {
        setEditingId(null)
        setFormData({
            name: '',
            ruc: '',
            contact_name: '',
            phone: '',
            email: '',
            address: ''
        })
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ruc?.includes(searchTerm)
    )

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Proveedores</h1>
                    <p className="text-gray-500 mt-1">Gestiona tu lista de proveedores</p>
                </div>
                <div className="flex-1" />
                <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                        resetForm()
                        setIsModalOpen(true)
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Proveedor
                </Button>
            </div>

            {/* Content */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar por nombre o RUC..."
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
                                    <TableHead>Nombre / Razón Social</TableHead>
                                    <TableHead>RUC / ID</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Cargando proveedores...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSuppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No se encontraron proveedores
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSuppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                                                        {supplier.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {supplier.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{supplier.ruc || '-'}</TableCell>
                                            <TableCell>{supplier.contact_name || '-'}</TableCell>
                                            <TableCell>{supplier.phone || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                                        onClick={() => handleEdit(supplier)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={() => handleDelete(supplier.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre / Razón Social *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Distribuidora Central"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>RUC / ID</Label>
                                <Input
                                    value={formData.ruc}
                                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                    placeholder="11111111111"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="990051580"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre de Contacto</Label>
                            <Input
                                value={formData.contact_name}
                                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                placeholder="Ej. Luis Vallejo"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contacto@proveedor.com"
                            />
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
                            {editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
