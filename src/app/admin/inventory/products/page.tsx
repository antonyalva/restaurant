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
import { Plus, Search, Pencil, Trash2, Package, Layers, X, ChefHat } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Product {
    id: string
    name: string
    base_price: number
    category_id: string
    category?: {
        name: string
    }
    is_active: boolean
    ingredients_count?: number
}

interface Category {
    id: string
    name: string
}

interface Ingredient {
    id: string
    name: string
    unit: string
}

interface RecipeItem {
    ingredient_id: string
    ingredient_name: string
    quantity: number
    unit: string
}

export default function ProductsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [productType, setProductType] = useState<'simple' | 'compound'>('simple')

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        base_price: '',
        cost: '',
        unit: 'UND',
        description: '',
        image_url: ''
    })

    // Recipe builder state
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
    const [ingredientSearch, setIngredientSearch] = useState('')
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [quantity, setQuantity] = useState('1')

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchIngredients()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    category:categories(name),
                    product_ingredients(
                        quantity,
                        ingredient:ingredients(name)
                    )
                `)
                .order('name')

            if (error) throw error

            const formattedProducts = data.map((item: any) => {
                const ingredients = item.product_ingredients || []
                // Heuristic: It's compound if it has > 1 ingredient OR 
                // if it has 1 ingredient but the name doesn't match the product (e.g. Latte -> Coffee)
                // Simple products have 1 ingredient with the exact same name (e.g. Soda -> Soda)
                const isCompound = ingredients.length > 1 ||
                    (ingredients.length === 1 && ingredients[0].ingredient?.name !== item.name)

                return {
                    ...item,
                    ingredients_count: ingredients.length,
                    is_compound: isCompound
                }
            })

            setProducts(formattedProducts)
        } catch (error) {
            console.error('Error fetching products:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los productos',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name')

            if (error) throw error
            setCategories(data || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const fetchIngredients = async () => {
        try {
            const { data, error } = await supabase
                .from('ingredients')
                .select('id, name, unit')
                .order('name')

            if (error) throw error
            setIngredients(data || [])
        } catch (error) {
            console.error('Error fetching ingredients:', error)
        }
    }

    const handleAddRecipeItem = () => {
        if (!selectedIngredient || !quantity) return

        const newItem: RecipeItem = {
            ingredient_id: selectedIngredient.id,
            ingredient_name: selectedIngredient.name,
            quantity: parseFloat(quantity),
            unit: selectedIngredient.unit
        }

        setRecipeItems([...recipeItems, newItem])
        setSelectedIngredient(null)
        setIngredientSearch('')
        setQuantity('1')
    }

    const handleRemoveRecipeItem = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index))
    }

    const handleSaveProduct = async () => {
        if (!formData.name || !formData.category_id || !formData.base_price) {
            toast({
                title: 'Error',
                description: 'Por favor completa los campos obligatorios',
                variant: 'destructive'
            })
            return
        }

        if (productType === 'compound' && recipeItems.length === 0) {
            toast({
                title: 'Error',
                description: 'Un producto compuesto debe tener al menos un ingrediente',
                variant: 'destructive'
            })
            return
        }

        try {
            setLoading(true)

            // 1. Create the Product
            const { data: product, error: productError } = await supabase
                .from('products')
                .insert({
                    name: formData.name,
                    category_id: formData.category_id,
                    base_price: parseFloat(formData.base_price),
                    description: formData.description,
                    image_url: formData.image_url,
                    is_active: true
                })
                .select()
                .single()

            if (productError) throw productError

            // 2. Handle Ingredients based on Type
            if (productType === 'simple') {
                // For Simple Products: Create a 1:1 Ingredient to track stock
                // First, create the ingredient
                const { data: ingredient, error: ingredientError } = await supabase
                    .from('ingredients')
                    .insert({
                        name: formData.name, // Same name as product
                        unit: formData.unit,
                        current_stock: 0, // Initial stock
                        cost_per_unit: parseFloat(formData.cost) || 0
                    })
                    .select()
                    .single()

                if (ingredientError) throw ingredientError

                // Then link them in product_ingredients (1 unit required)
                const { error: linkError } = await supabase
                    .from('product_ingredients')
                    .insert({
                        product_id: product.id,
                        ingredient_id: ingredient.id,
                        quantity: 1
                    })

                if (linkError) throw linkError

            } else {
                // For Compound Products: Link selected existing ingredients
                const recipeData = recipeItems.map(item => ({
                    product_id: product.id,
                    ingredient_id: item.ingredient_id,
                    quantity: item.quantity,
                    variant_id: null
                }))

                const { error: recipeError } = await supabase
                    .from('product_ingredients')
                    .insert(recipeData)

                if (recipeError) throw recipeError
            }

            toast({
                title: 'Producto creado',
                description: 'El producto ha sido creado correctamente'
            })

            resetForm()
            setIsModalOpen(false)
            fetchProducts()
            fetchIngredients() // Refresh ingredients list too
        } catch (error: any) {
            console.error('Error saving product:', error)
            toast({
                title: 'Error',
                description: error.message || 'No se pudo guardar el producto',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            category_id: '',
            base_price: '',
            cost: '',
            unit: 'UND',
            description: '',
            image_url: ''
        })
        setProductType('simple')
        setRecipeItems([])
        setSelectedIngredient(null)
        setIngredientSearch('')
        setQuantity('1')
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({
                title: 'Producto eliminado',
                description: 'El producto ha sido eliminado correctamente'
            })
            fetchProducts()
        } catch (error) {
            console.error('Error deleting product:', error)
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el producto',
                variant: 'destructive'
            })
        }
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
    )

    const totalProducts = products.length
    const totalRecipes = products.filter(p => (p as any).is_compound).length

    const formatCurrency = (amount: number) => `S/. ${amount.toFixed(2)}`

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Catálogo de Productos</h1>
                    <p className="text-gray-500 mt-1">Gestiona tu inventario y recetas</p>
                </div>
                <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Producto
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Total Productos</span>
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-purple-600" />
                                <span className="text-3xl font-bold">{totalProducts}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Compuestos (Recetas)</span>
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-600" />
                                <span className="text-3xl font-bold text-blue-600">{totalRecipes}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Products Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Listado</h2>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar..."
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
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Cargando productos...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No se encontraron productos
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{product.name}</span>
                                                    <span className="text-xs text-gray-400">UND</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(product as any).is_compound ? (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                        Compuesto
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                                                        Simple
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {product.category?.name || 'Sin Categoría'}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(product.base_price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-500 hover:text-purple-600"
                                                        onClick={() => router.push(`/admin/inventory/products/${product.id}`)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                        onClick={() => handleDelete(product.id)}
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

                    <div className="mt-4 text-xs text-gray-500">
                        Mostrando {filteredProducts.length} de {totalProducts} registros
                    </div>
                </CardContent>
            </Card>

            {/* Add Product Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open)
                if (!open) resetForm()
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo Producto</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name and Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre *</Label>
                                <Input
                                    placeholder="Ej. Sandwich Mixto"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoría *</Label>
                                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Price, Cost, Unit */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Precio Venta *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Costo (Ref)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unidad</Label>
                                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UND">Unidad (UND)</SelectItem>
                                        <SelectItem value="KG">Kilogramo (KG)</SelectItem>
                                        <SelectItem value="L">Litro (L)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Product Type */}
                        <div className="space-y-2">
                            <Label>Tipo de Producto</Label>
                            <RadioGroup value={productType} onValueChange={(value: any) => setProductType(value)}>
                                <div className="flex items-center space-x-8">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="simple" id="simple" />
                                        <Label htmlFor="simple" className="font-normal cursor-pointer">
                                            Producto Simple <span className="text-xs text-gray-500">(Control directo de stock)</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="compound" id="compound" />
                                        <Label htmlFor="compound" className="font-normal cursor-pointer">
                                            Producto Compuesto <span className="text-xs text-gray-500">(Usa receta/ingredientes)</span>
                                        </Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Recipe Builder - Only visible for compound products */}
                        {productType === 'compound' && (
                            <div className="border rounded-lg p-6 space-y-6 bg-white shadow-sm">
                                <div className="flex items-center gap-2 text-purple-700">
                                    <ChefHat className="w-5 h-5" />
                                    <h3 className="font-semibold text-lg">Constructor de Receta</h3>
                                </div>

                                <div className="bg-white rounded-xl border p-4 shadow-sm">
                                    <div className="grid grid-cols-[1fr,140px,auto] gap-4 items-end">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingrediente</Label>
                                            {selectedIngredient ? (
                                                <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-md px-3 py-2 h-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-purple-900">{selectedIngredient.name}</span>
                                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none text-[10px] px-1.5 h-5">
                                                            {selectedIngredient.unit}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                        onClick={() => {
                                                            setSelectedIngredient(null)
                                                            setIngredientSearch('')
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                    <Input
                                                        placeholder="Buscar insumo..."
                                                        className="pl-9 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                                                        value={ingredientSearch}
                                                        onChange={(e) => setIngredientSearch(e.target.value)}
                                                    />
                                                    {ingredientSearch && filteredIngredients.length > 0 && (
                                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                                                            {filteredIngredients.map((ing) => (
                                                                <div
                                                                    key={ing.id}
                                                                    className="px-4 py-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between group"
                                                                    onClick={() => {
                                                                        setSelectedIngredient(ing)
                                                                        setIngredientSearch(ing.name)
                                                                    }}
                                                                >
                                                                    <span className="text-gray-700 group-hover:text-purple-700">{ing.name}</span>
                                                                    <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
                                                                        {ing.unit}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                Cant.
                                                {selectedIngredient && (
                                                    <span className="text-purple-600 font-bold">{selectedIngredient.unit}</span>
                                                )}
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="bg-white border-gray-200 text-center font-medium"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>

                                        <Button
                                            type="button"
                                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm px-6"
                                            onClick={handleAddRecipeItem}
                                            disabled={!selectedIngredient}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Agregar
                                        </Button>
                                    </div>
                                </div>

                                {/* Recipe Items List */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Ingredientes actuales ({recipeItems.length})
                                    </Label>

                                    {recipeItems.length === 0 ? (
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
                                            <p className="text-gray-400 italic">No hay ingredientes agregados a esta receta</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {recipeItems.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:border-purple-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                                                            {index + 1}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{item.ingredient_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-sm font-medium bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                                                            {item.quantity} <span className="text-gray-500 text-xs ml-1">{item.unit}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                            onClick={() => handleRemoveRecipeItem(index)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                            <Label>URL de Imagen</Label>
                            <Input
                                placeholder="https://ejemplo.com/imagen.jpg"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={handleSaveProduct}
                        >
                            Crear Producto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
