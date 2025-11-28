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
import { Plus, Search, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Category {
    id: string
    name: string
    icon: string | null
    sort_order: number
}

export default function CategoriesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({ name: '', sort_order: 0 })

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })

            if (error) throw error
            setCategories(data || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las categorías',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.name) return

        try {
            if (editingCategory) {
                const { error } = await supabase
                    .from('categories')
                    .update({
                        name: formData.name,
                        sort_order: formData.sort_order
                    })
                    .eq('id', editingCategory.id)

                if (error) throw error
                toast({ title: 'Categoría actualizada' })
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert({
                        name: formData.name,
                        sort_order: formData.sort_order
                    })

                if (error) throw error
                toast({ title: 'Categoría creada' })
            }

            setIsModalOpen(false)
            fetchCategories()
            resetForm()
        } catch (error) {
            console.error('Error saving category:', error)
            toast({
                title: 'Error',
                description: 'No se pudo guardar la categoría',
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Categoría eliminada' })
            fetchCategories()
        } catch (error) {
            console.error('Error deleting category:', error)
            toast({
                title: 'Error',
                description: 'No se pudo eliminar la categoría',
                variant: 'destructive'
            })
        }
    }

    const resetForm = () => {
        setEditingCategory(null)
        setFormData({ name: '', sort_order: 0 })
    }

    const openEdit = (category: Category) => {
        setEditingCategory(category)
        setFormData({ name: category.name, sort_order: category.sort_order })
        setIsModalOpen(true)
    }

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const generateSlug = (name: string) => {
        return name.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Categorías</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Panel
                    </Button>
                    <Dialog open={isModalOpen} onOpenChange={(open) => {
                        setIsModalOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-purple-600 hover:bg-purple-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Categoría
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Bebidas Calientes"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Orden de Visualización</Label>
                                    <Input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Guardar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Categories Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Categorías</h2>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar categorías..."
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
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Orden</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            Cargando categorías...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            No se encontraron categorías
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">
                                                {category.name}
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {generateSlug(category.name)}
                                            </TableCell>
                                            <TableCell>
                                                {category.sort_order}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-500 hover:text-purple-600"
                                                        onClick={() => openEdit(category)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                        onClick={() => handleDelete(category.id)}
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

                    <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
                        <span>Mostrando {filteredCategories.length} registros</span>
                        {/* Pagination placeholder as requested in design, though we don't have enough data to paginate yet */}
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" disabled>Anterior</Button>
                            <Button variant="outline" size="sm" disabled>Siguiente</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
