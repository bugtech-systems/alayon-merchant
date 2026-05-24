// app/signup/signup-client.tsx (Client Component)
'use client'

import { Container, Heading } from "@medusajs/ui";
import { SignupForm } from "@/components/dashboard/signup-form";
import { useEffect, useState } from "react";
import { listCompanies } from "@/lib/medusa/data/companies";

export default function SignupPageClient() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCompanies({})
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Container className="flex flex-col gap-4">
        <Heading level="h1" className="text-xl">
          Create your Alayon account
        </Heading>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="flex flex-col gap-4">
      <SignupForm companies={companies} />
    </Container>
  )
}