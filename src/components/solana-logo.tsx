export function SolanaLogo({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 397.7 311.7"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9945FF" />
                    <stop offset="100%" stopColor="#14F195" />
                </linearGradient>
            </defs>
            <path
                fill="url(#solana-gradient)"
                d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5
        c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
            />
            <path
                fill="url(#solana-gradient)"
                d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5
        c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
            />
            <path
                fill="url(#solana-gradient)"
                d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4
        c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
            />
        </svg>
    )
}
