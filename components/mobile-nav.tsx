"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Map, 
  Camera, 
  MessageCircle, 
  Trophy,
  HelpCircle
} from "lucide-react"

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/recognition", icon: Camera, label: "Scan" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/quiz", icon: HelpCircle, label: "Quiz" },
  { href: "/achievements", icon: Trophy, label: "Profile" },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0F0B1E]/95 backdrop-blur-lg border-t border-[#C9A84C]/30 z-50 safe-area-pb">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 min-w-[60px] ${
                isActive 
                  ? "text-[#C9A84C]" 
                  : "text-[#C4A882]"
              }`}
            >
              <div className={`p-2 rounded-lg transition-all ${isActive ? "bg-[#C9A84C]/20" : ""}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#C9A84C]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
