import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <AdminSidebar />
            <main className="pl-64 min-h-screen">
                {children}
            </main>
        </div>
    )
}
