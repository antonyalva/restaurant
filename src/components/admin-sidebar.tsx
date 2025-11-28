'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Store,
    Clock,
    History,
    BarChart3,
    Package,
    Users,
    UserCog,
    Trophy,
    Settings,
    Coffee,
    LogOut,
    ChevronRight,
    ChevronDown,
    Tags,
    Truck,
    ArrowLeftRight,
    Wheat
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SidebarItem {
    title: string
    href: string
    icon: React.ElementType
    variant?: 'default' | 'ghost'
    items?: SidebarItem[] // Nested items
}

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string>('')
    const [expandedMenus, setExpandedMenus] = useState<string[]>([])

    useEffect(() => {
        getUser()
    }, [])

    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        if (data.user?.email) {
            setUserEmail(data.user.email)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const toggleMenu = (title: string) => {
        setExpandedMenus(prev =>
            prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title]
        )
    }

    const menuGroups = [
        {
            title: 'PRINCIPAL',
            items: [
                { title: 'Dashboard', href: '/admin', icon: LayoutDashboard }
            ]
        },
        {
            title: 'OPERACIONES',
            items: [
                { title: 'Punto de Venta', href: '/pos', icon: Store },
                { title: 'Turnos y Caja', href: '/admin/shifts', icon: Clock },
                { title: 'Historial Ventas', href: '/admin/sales', icon: History },
                { title: 'Reportes', href: '/admin/reports', icon: BarChart3 },
            ]
        },
        {
            title: 'CATÁLOGO',
            items: [
                {
                    title: 'Inventario',
                    href: '#',
                    icon: Package,
                    items: [
                        { title: 'Productos', href: '/admin/inventory/products', icon: Package },
                        { title: 'Categorías', href: '/admin/inventory/categories', icon: Tags },
                        { title: 'Inventario', href: '/admin/inventory/ingredients', icon: Wheat },
                        { title: 'Proveedores', href: '/admin/inventory/suppliers', icon: Truck },
                    ]
                },
            ]
        },
        {
            title: 'GESTIÓN',
            items: [
                {
                    title: 'Personas',
                    href: '#',
                    icon: Users,
                    items: [
                        { title: 'Usuarios (Staff)', href: '/admin/people/users', icon: UserCog },
                        { title: 'Clientes', href: '/admin/people/customers', icon: Users },
                    ]
                },
                {
                    title: 'Fidelidad',
                    href: '#',
                    icon: Trophy,
                    items: [
                        { title: 'Dashboard', href: '/admin/loyalty/dashboard', icon: BarChart3 },
                        { title: 'Reglas', href: '/admin/loyalty/rules', icon: Settings },
                    ]
                },
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { title: 'Configuración', href: '/admin/settings', icon: Settings },
            ]
        }
    ]

    return (
        <div className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed left-0 top-0">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                    <Coffee className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Anti-Coffee</span>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {menuGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {group.title}
                        </h3>
                        <div className="space-y-1">
                            {group.items.map((item, itemIndex) => {
                                const hasSubmenu = item.items && item.items.length > 0
                                const isExpanded = expandedMenus.includes(item.title)
                                const isActive = pathname === item.href || (hasSubmenu && item.items?.some(sub => pathname === sub.href))

                                return (
                                    <div key={itemIndex}>
                                        {hasSubmenu ? (
                                            <Button
                                                variant="ghost"
                                                onClick={() => toggleMenu(item.title)}
                                                className={cn(
                                                    "w-full justify-between h-11 px-4 font-medium",
                                                    isActive
                                                        ? "text-purple-700 dark:text-purple-300"
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className={cn("w-5 h-5", isActive ? "text-purple-600" : "text-gray-500")} />
                                                    <span>{item.title}</span>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                )}
                                            </Button>
                                        ) : (
                                            <Link href={item.href}>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full justify-between h-11 px-4 font-medium",
                                                        isActive
                                                            ? "bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className={cn("w-5 h-5", isActive ? "text-purple-600" : "text-gray-500")} />
                                                        <span>{item.title}</span>
                                                    </div>
                                                </Button>
                                            </Link>
                                        )}

                                        {/* Submenu Items */}
                                        {hasSubmenu && isExpanded && (
                                            <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                                                {item.items?.map((subItem, subIndex) => {
                                                    const isSubActive = pathname === subItem.href
                                                    return (
                                                        <Link key={subIndex} href={subItem.href}>
                                                            <Button
                                                                variant="ghost"
                                                                className={cn(
                                                                    "w-full justify-start h-9 px-4 text-sm font-normal",
                                                                    isSubActive
                                                                        ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {/* <subItem.icon className="w-4 h-4 opacity-70" /> */}
                                                                    <span>{subItem.title}</span>
                                                                </div>
                                                            </Button>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                    <Avatar className="h-10 w-10 bg-purple-100 text-purple-700">
                        <AvatarFallback>{userEmail.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {userEmail.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">Admin</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600" onClick={handleLogout}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
