// components/footer.tsx
import Link from "next/link";
import { EmailSignup } from "@/components/Email-SignUp"

export function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <EmailSignup />
          <div className="text-center lg:text-right">
            <p className="text-sm text-muted-foreground">
              © 2026 Alayon Store. All rights reserved.
            </p>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}