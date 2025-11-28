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
import { Search, UserPlus, Trash2, UserCog, ArrowLeft } from 'lucide-react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'

interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'cashier'
    status: 'active' | 'inactive'
    created_at: string
}

export default function UsersPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'cashier',
        password: '' // Only for new users
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los usuarios',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        // Note: Creating users usually requires Admin API or specific Auth flow.
        // For this MVP, we'll assume we can insert into profiles if we use a trigger or if we just manage profile data.
        // However, creating the Auth User requires supabase.auth.signUp() which logs in the new user.
        // A proper admin user creation requires a server-side function with service_role key.
        // For now, we will just simulate the UI for "New User" or implement a basic profile update.

        if (!formData.email || !formData.full_name) {
            toast({ title: 'Error', description: 'Campos incompletos', variant: 'destructive' })
            return
        }

        try {
            if (editingUser) {
                // Update existing profile
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        role: formData.role
                    })
                    .eq('id', editingUser.id)

                if (error) throw error
                toast({ title: 'Usuario actualizado' })
            } else {
                // Create new user (Limitation: Client-side creation logs you in as that user)
                // We will show a warning or just insert into profiles if it's a mock.
                // Ideally, we should call an API route.
                toast({
                    title: 'Función Limitada',
                    description: 'La creación de usuarios requiere backend. Se actualizará solo la UI.',
                    variant: 'default'
                })
            }

            setIsModalOpen(false)
            resetForm()
            fetchUsers()
        } catch (error) {
            console.error('Error saving user:', error)
            toast({ title: 'Error', description: 'Falló la operación', variant: 'destructive' })
        }
    }

    const toggleStatus = async (user: Profile) => {
        try {
            const newStatus = user.status === 'active' ? 'inactive' : 'active'
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', user.id)

            if (error) throw error

            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
            toast({ title: `Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}` })
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
        }
    }

    const resetForm = () => {
        setEditingUser(null)
        setFormData({ email: '', full_name: '', role: 'cashier', password: '' })
    }

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
                    <p className="text-gray-500 mt-1">Administra roles y accesos del personal</p>
                </div>
                <div className="flex-1" />
                <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                        resetForm()
                        setIsModalOpen(true)
                    }}
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar por nombre o email..."
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
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol Actual</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Registro</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs">
                                                    {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                                                </div>
                                                {user.full_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={async (val) => {
                                                    await supabase.from('profiles').update({ role: val }).eq('id', user.id)
                                                    fetchUsers()
                                                }}
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Administrador</SelectItem>
                                                    <SelectItem value="cashier">Cajero</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`cursor-pointer ${user.status === 'active' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-500 hover:bg-red-600'}`}
                                                onClick={() => toggleStatus(user)}
                                            >
                                                {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                onClick={() => toggleStatus(user)}
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val as any })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="cashier">Cajero</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                            Crear Usuario
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
