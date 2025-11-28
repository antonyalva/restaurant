'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText, Users, Package, UserCircle, CreditCard, DollarSign } from 'lucide-react'

export default function ReportsPage() {
    const router = useRouter()

    const salesReports = [
        {
            title: 'Todas las Ventas',
            description: 'Visualiza el detalle de todas tus ventas por comprobantes.',
            icon: FileText,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            href: '/admin/reports/all-sales'
        },
        {
            title: 'Ventas por Empleado',
            description: 'Visualiza la cantidad, descuentos y total de ventas realizadas por los empleados.',
            icon: Users,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            href: '/admin/reports/sales-by-employee'
        },
        {
            title: 'Ventas por Producto',
            description: 'Conoce cuales fueron los productos más vendidos y con más ingresos.',
            icon: Package,
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            href: '/admin/reports/sales-by-product'
        },
        {
            title: 'Ventas por Cliente',
            description: 'Conoce cuales fueron los clientes que más gastaron o que más productos compraron.',
            icon: UserCircle,
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            href: '/admin/reports/sales-by-customer'
        },
        {
            title: 'Métodos de Pago',
            description: 'Conoce cuales fueron los métodos de pago con más ingresos y la cantidad de transacciones.',
            icon: CreditCard,
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            href: '/admin/reports/payment-methods'
        }
    ]

    const posReports = [
        {
            title: 'Apertura y Cierre de Caja',
            description: 'Visualiza el movimiento de entradas de dinero, las ventas, anulaciones y los resultados por cada uno de los turnos en el punto de venta.',
            icon: DollarSign,
            iconBg: 'bg-teal-100',
            iconColor: 'text-teal-600',
            href: '/admin/shifts'
        }
    ]

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Todos los Reportes</h1>
                        <p className="text-gray-500 mt-1">Análisis y estadísticas de tu negocio</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Panel
                </Button>
            </div>

            {/* Sales Reports Section */}
            <div>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Reportes de Ventas</h2>
                    <p className="text-sm text-gray-500">Análisis detallado de ventas y rendimiento</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salesReports.map((report, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(report.href)}>
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${report.iconBg}`}>
                                        <report.icon className={`w-6 h-6 ${report.iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">{report.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{report.description}</p>
                                        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                            Ver reporte →
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* POS Reports Section */}
            <div>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Reportes del Punto de Venta</h2>
                    <p className="text-sm text-gray-500">Análisis de operaciones de caja</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posReports.map((report, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(report.href)}>
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${report.iconBg}`}>
                                        <report.icon className={`w-6 h-6 ${report.iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">{report.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{report.description}</p>
                                        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                            Ver reporte →
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
