// components/home/newsletter-form.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    
    try {
      // Add your newsletter signup logic here
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('Thank you for subscribing!')
        setEmail('')
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 3000)
      } else {
        throw new Error('Subscription failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={status === 'loading'}
        className="flex-1 bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
      />
      <Button
        type="submit"
        disabled={status === 'loading'}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider px-8 disabled:opacity-50"
      >
        {status === 'loading' ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
      </Button>
      {message && (
        <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}