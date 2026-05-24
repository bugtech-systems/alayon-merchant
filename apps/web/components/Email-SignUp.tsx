// components/email-signup.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmailSignup() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic here
    console.log("Mobile number submitted:", mobileNumber);
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">Join our contact list</CardTitle>
        <CardDescription>
          Get exclusive deals and early access to new products.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="tel"
            placeholder="Mobile number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" variant="default">
            Subscribe
          </Button>
        </form>
        {isSubmitted && (
          <p className="text-sm text-green-600 mt-3">
            Thanks for joining our contact list!
          </p>
        )}
      </CardContent>
    </Card>
  );
}