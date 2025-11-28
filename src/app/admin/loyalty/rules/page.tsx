'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus, Trophy, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface LoyaltyRule {
    id: string
    name: string
    condition_type: string
    condition_value: number
    reward_type: string
    reward_value: string
    is_active: boolean
}

export default function LoyaltyRulesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [rules, setRules] = useState<LoyaltyRule[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        condition_type: 'monthly_spending',
        condition_value: '',
        reward_type: 'free_product',
        reward_value: '',
        is_active: true
    })

    useEffect(() => {
        fetchRules()
    }, [])

    const fetchRules = async () => {
        try {
            const { data, error } = await supabase
                .from('loyalty_rules')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setRules(data || [])
        } catch (error) {
            console.error('Error fetching rules:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las reglas',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.name || !formData.condition_value || !formData.reward_value) {
            toast({ title: 'Error', description: 'Completa todos los campos', variant: 'destructive' })
            return
        }

        try {
            const ruleData = {
                name: formData.name,
                condition_type: formData.condition_type,
                condition_value: parseFloat(formData.condition_value),
                reward_type: formData.reward_type,
                reward_value: formData.reward_value,
                is_active: formData.is_active
            }

            if (editingId) {
                const { error } = await supabase
                    .from('loyalty_rules')
                    .update(ruleData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Regla actualizada' })
            } else {
                const { error } = await supabase
                    .from('loyalty_rules')
                    .insert(ruleData)

                if (error) throw error
                toast({ title: 'Regla creada' })
            }

            setIsModalOpen(false)
            fetchRules()
        } catch (error) {
            console.error('Error saving rule:', error)
            toast({ title: 'Error', description: 'No se pudo guardar la regla', variant: 'destructive' })
        }
    }

    const toggleRule = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('loyalty_rules')
                .update({ is_active: !currentStatus })
                .eq('id', id)

            if (error) throw error

            setRules(rules.map(r =>
                r.id === id ? { ...r, is_active: !currentStatus } : r
            ))
            toast({ title: currentStatus ? 'Regla desactivada' : 'Regla activada' })
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo actualizar la regla', variant: 'destructive' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta regla?')) return

        try {
            const { error } = await supabase
                .from('loyalty_rules')
                .delete()
                .eq('id', id)

            if (error) throw error

            setRules(rules.filter(r => r.id !== id))
            toast({ title: 'Regla eliminada' })
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la regla', variant: 'destructive' })
        }
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Programa de Fidelidad</h1>
                        <p className="text-gray-500 mt-1">Configura reglas para premiar a tus clientes</p>
                    </div>
                </div>
                <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                        setEditingId(null)
                        setFormData({
                            name: '',
                            condition_type: 'monthly_spending',
                            condition_value: '',
                            reward_type: 'free_product',
                            reward_value: '',
                            is_active: true
                        })
                        setIsModalOpen(true)
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Regla
                </Button>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map((rule) => (
                    <Card key={rule.id} className="relative">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Trophy className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                                </div>
                                <Switch
                                    checked={rule.is_active}
                                    onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                                />
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Condición:</p>
                                    <p className="text-sm font-medium">
                                        Gasto Mensual &gt; S/ {rule.condition_value.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Premio:</p>
                                    <p className="text-sm font-medium text-blue-600">{rule.reward_value}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 text-gray-600"
                                    onClick={() => {
                                        setEditingId(rule.id)
                                        setFormData({
                                            name: rule.name,
                                            condition_type: rule.condition_type,
                                            condition_value: rule.condition_value.toString(),
                                            reward_type: rule.reward_type,
                                            reward_value: rule.reward_value,
                                            is_active: rule.is_active
                                        })
                                        setIsModalOpen(true)
                                    }}
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => handleDelete(rule.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nueva Regla de Fidelidad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Nombre de la Regla</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Cliente VIP Mensual"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Condición</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.condition_type}
                                    onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                                >
                                    <option value="monthly_spending">Compra Única (Ticket)</option>
                                    <option value="total_spending">Gasto Total</option>
                                    <option value="visit_count">Número de Visitas</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Monto Mínimo (S/)</Label>
                                <Input
                                    type="number"
                                    value={formData.condition_value}
                                    onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Gift Configuration Section */}
                        <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-purple-100 rounded">
                                    <Trophy className="w-4 h-4 text-purple-600" />
                                </div>
                                <h3 className="font-semibold">Configuración del Premio</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Premio</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.reward_type}
                                        onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                                    >
                                        <option value="free_product">Producto Gratis</option>
                                        <option value="custom">Personalizado (Merch, etc)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Producto a Regalar</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.reward_value}
                                        onChange={(e) => setFormData({ ...formData, reward_value: e.target.value })}
                                    >
                                        <option value="">Seleccionar producto</option>
                                        <option value="PROMO FILETE Gratis">PROMO FILETE Gratis</option>
                                        <option value="Café Americano">Café Americano</option>
                                        <option value="Té Verde">Té Verde</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label>Nota (Opcional, visible para el Cajero)</Label>
                                <Input
                                    placeholder="Ej. Válido solo para clientes frecuentes"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                            Guardar Regla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
