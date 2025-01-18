import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login | AI News Agent",
  description: "Login to access your AI News Agent dashboard",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}