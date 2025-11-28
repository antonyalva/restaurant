// Type declarations for next-pwa
declare module 'next-pwa' {
    import { NextConfig } from 'next'

    interface PWAConfig {
        dest?: string
        disable?: boolean
        register?: boolean
        skipWaiting?: boolean
        runtimeCaching?: any[]
    }

    export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
}
