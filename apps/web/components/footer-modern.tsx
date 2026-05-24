// components/footer.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook } from "@medusajs/icons";
import { saveCustomerToList } from "@/lib/data/customer";

export function FooterModern() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simple validation
    if (!mobileNumber || mobileNumber.length < 10) {
      setIsSubmitting(false);
      return;
    }

    let {success, message} = await saveCustomerToList(mobileNumber);
    if(!success){
      setErrorMessage(message)
      setIsSubmitting(false);
      return
    }
    // Simulate API call
    setIsSuccess(true);
    setMobileNumber("");
    setIsSubmitting(false);
  };

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8 border-b border-gray-100">
          
          {/* Left Column - Signup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Join our contact list</h3>
            <p className="text-sm text-gray-500">
              Get exclusive deals, early access to new products, and wholesale pricing.
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Your mobile number"
                  className="pl-9 h-11 bg-gray-50 border-gray-200 focus:ring-blue-500"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6"
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
            
            {isSuccess && (!errorMessage ? (
              <p className="text-sm text-green-600">Thanks for subscribing! Check your SMS.</p>
            ) : <p className="text-sm text-red-600">{errorMessage}</p>)}
          </div>

          {/* Right Column - Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/catalog" className="hover:text-gray-900 transition-colors">All Products</Link></li>
                <li><Link href="/catalog?type=wholesale" className="hover:text-gray-900 transition-colors">Wholesale</Link></li>
                <li><Link href="/catalog?sale=true" className="hover:text-gray-900 transition-colors">On Sale</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link></li>
                <li><Link href="/delivery" className="hover:text-gray-900 transition-colors">Delivery Info</Link></li>
                <li><Link href="/faq" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Connect</h4>
              <div className="flex gap-3">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                {/* <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a> */}
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <p className="flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  <span>+63 (936) 826-3352</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  <span>alayon.store@gmail.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-xs text-gray-400">
          <p>© 2026 Alayon Store. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}