"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { getNotifications } from "@/lib/api"

export function NotificationLink() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    getNotifications()
      .then((data) => setCount(data.filter((item) => !item.read).length))
      .catch(() => {})
  }, [])

  return (
    <Link
      href="/dashboard/notifications"
      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <span>Notifications</span>
      {count != null && count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
