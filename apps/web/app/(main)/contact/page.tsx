// app/contact/page.tsx
"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send, Clock, MessageSquare, Store, Package, Truck, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    content: "+63 (936) 826-3352",
    description: "Mon-Sat, 8AM - 8PM",
    highlight: "24/7 Customer Support",
  },
  {
    icon: Mail,
    title: "Email",
    content: "alayon.store@gmail.com",
    description: "Response within 24 hours",
    highlight: "alayon.wholesale@gmail.com",
  },
  {
    icon: MapPin,
    title: "Location",
    content: "Tacloban City, Leyte",
    description: "Philippines",
    highlight: "Free delivery within Tacloban",
  },
  {
    icon: Clock,
    title: "Business Hours",
    content: "Monday - Saturday",
    description: "8:00 AM - 8:00 PM",
    highlight: "Same-day delivery cut-off: 10 AM",
  },
];

const businessTypes = [
  { value: "retail", label: "Retail Customer" },
  { value: "wholesale", label: "Wholesale Partner" },
  { value: "reseller", label: "Reseller" },
  { value: "other", label: "Other" },
];

const inquiryTypes = [
  { value: "order", label: "Order Inquiry" },
  { value: "wholesale", label: "Wholesale Pricing" },
  { value: "delivery", label: "Delivery Status" },
  { value: "product", label: "Product Information" },
  { value: "return", label: "Returns & Refunds" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    businessType: "retail",
    inquiryType: "order",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormState({
      name: "",
      email: "",
      phone: "",
      businessType: "retail",
      inquiryType: "order",
      subject: "",
      message: "",
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Message Sent!</h1>
            <p className="text-gray-500 mb-6">
              Thank you for reaching out to Alayon Store. We'll get back to you within 24 hours.
            </p>
            <Button onClick={() => setIsSubmitted(false)} className="bg-blue-600 hover:bg-blue-700">
              Send Another Message
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-3 py-1 text-sm mb-4">
            <Headphones className="w-4 h-4" />
            <span>We're Here to Help</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Have questions about wholesale pricing, delivery, or your order? 
            We're just a message away.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info) => (
              <div
                key={info.title}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <info.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  {info.title}
                </h3>
                <p className="text-gray-900 font-medium mt-1">{info.content}</p>
                <p className="text-xs text-gray-400 mt-1">{info.description}</p>
                <p className="text-xs text-green-600 mt-2">{info.highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Send us a message</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <Input
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="Juan Dela Cruz"
                        required
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        placeholder="juan@example.com"
                        required
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        placeholder="09123456789"
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Type *
                      </label>
                      <select
                        value={formState.businessType}
                        onChange={(e) => setFormState({ ...formState, businessType: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {businessTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inquiry Type *
                      </label>
                      <select
                        value={formState.inquiryType}
                        onChange={(e) => setFormState({ ...formState, inquiryType: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {inquiryTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject *
                      </label>
                      <Input
                        value={formState.subject}
                        onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                        placeholder="How can we help?"
                        required
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <Textarea
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      rows={5}
                      placeholder="Please provide as much detail as possible..."
                      required
                      className="bg-gray-50 border-gray-200 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send Message
                        <Send className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              {/* Wholesale Inquiry Card */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <Package className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="text-lg font-bold mb-1">Wholesale Inquiry?</h3>
                <p className="text-sm text-blue-100 mb-4">
                  Get bulk pricing and exclusive partner benefits.
                </p>
                <Button 
                  variant="secondary" 
                  className="bg-white text-blue-600 hover:bg-gray-100 w-full"
                  onClick={() => {
                    setFormState({ ...formState, inquiryType: "wholesale", subject: "Wholesale Partnership Inquiry" });
                    window.scrollTo({ top: document.querySelector('form')?.offsetTop || 0, behavior: 'smooth' });
                  }}
                >
                  Request Wholesale Pricing
                </Button>
              </div>

              {/* Delivery Info Card */}
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <Truck className="w-5 h-5 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Same-Day Delivery</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Available within Tacloban City
                </p>
                <p className="text-xs text-gray-400">
                  Order before 10 AM for same-day delivery
                </p>
              </div>

              {/* Store Info Card */}
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <Store className="w-5 h-5 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Alayon Store</h3>
                <p className="text-sm text-gray-500">
                  Your trusted partner for quality essentials
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Serving retailers in a modern ways
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-500 mt-1">Quick answers to common questions</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                q: "How do I qualify for wholesale pricing?",
                a: "Simply select 'Wholesale Partner' as your business type in the form above, and our team will contact you with pricing details."
              },
              {
                q: "What is the minimum order for wholesale?",
                a: "Minimum wholesale order varies by product. Contact us for specific product MOQ requirements."
              },
              {
                q: "Do you offer same-day delivery?",
                a: "Yes! Orders placed before 10 AM within Tacloban City are eligible for same-day delivery."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept GCash, Bank Transfer, Cash on Delivery (COD), and Credit/Debit cards."
              }
            ].map((faq, idx) => (
              <details key={idx} className="group bg-gray-50 rounded-lg">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-medium text-gray-900">
                  {faq.q}
                  <span className="ml-2 text-blue-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-2">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}