// components/hero-section.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Package, 
  Store, 
  Truck, 
  Percent, 
  Droplets, 
  Flame, 
  Sparkles,
  ShieldCheck,
  Clock,
  MapPin,
  ShoppingBag,
  Users,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50">
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl">💧</div>
        <div className="absolute bottom-20 right-20 text-7xl">🔥</div>
        <div className="absolute top-1/3 right-1/4 text-5xl">🧺</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🛒</div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl opacity-20">🏪</div>
      </div>

      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            {/* Delivery Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center rounded-full bg-blue-100 border border-blue-200 backdrop-blur-sm px-3 py-1.5 text-sm mb-6"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span className="text-blue-700 font-medium">Same Day Delivery • Tacloban City</span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight"
            >
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Wholesale & Retail
              </span>
              <br />
              <span className="text-gray-900">Delivered to Your Doorstep</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-gray-600 max-w-xl lg:mx-0 mx-auto"
            >
              Your one-stop shop for quality essentials. Get competitive wholesale prices 
              or convenient retail purchases with same-day delivery across Tacloban City.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/catalog">
                <Button
                  size="lg"
                  className="group bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Shop Retail Products
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link 
              href="/contact"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 py-6 text-base font-semibold border-2 border-blue-200 hover:bg-blue-50 transition-all duration-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Become a Partner
                </Button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex flex-wrap justify-center lg:justify-start gap-4"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Same Day Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Percent className="w-4 h-4 text-green-500" />
                <span>Bulk Discounts</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                <span>Quality Guaranteed</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Product Categories Grid */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Water */}
              <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow group cursor-pointer">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Water</h3>
                <p className="text-xs text-gray-500 mt-1">Gallon • Bottles • Mineral</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-medium text-blue-600">Wholesale</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-green-600">Retail</span>
                </div>
              </div>

              {/* Gas */}
              <div className="bg-white rounded-xl p-4 shadow-lg border border-orange-100 hover:shadow-xl transition-shadow group cursor-pointer mt-4 sm:mt-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Gas</h3>
                <p className="text-xs text-gray-500 mt-1">LPG • Tank Refill • Canisters</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-medium text-blue-600">Wholesale</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-green-600">Retail</span>
                </div>
              </div>

              {/* Laundry */}
              <div className="bg-white rounded-xl p-4 shadow-lg border border-purple-100 hover:shadow-xl transition-shadow group cursor-pointer">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Laundry</h3>
                <p className="text-xs text-gray-500 mt-1">Detergent • Fabric Softener</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-medium text-blue-600">Wholesale</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-green-600">Retail</span>
                </div>
              </div>

              {/* Groceries */}
              <div className="bg-white rounded-xl p-4 shadow-lg border border-green-100 hover:shadow-xl transition-shadow group cursor-pointer mt-4 sm:mt-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Store className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Groceries</h3>
                <p className="text-xs text-gray-500 mt-1">Rice • Canned Goods • Snacks</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-medium text-blue-600">Wholesale</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-green-600">Retail</span>
                </div>
              </div>
            </div>

            {/* Additional Categories Row */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-100">
                <span className="text-lg">🥤</span>
                <p className="text-xs text-gray-600 mt-1">Beverages</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-100">
                <span className="text-lg">🍪</span>
                <p className="text-xs text-gray-600 mt-1">Snacks</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-100">
                <span className="text-lg">🧼</span>
                <p className="text-xs text-gray-600 mt-1">Household</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-100">
                <span className="text-lg">🍚</span>
                <p className="text-xs text-gray-600 mt-1">Rice & Grains</p>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-400 rounded-full opacity-20 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-cyan-400 rounded-full opacity-20 blur-2xl" />
          </motion.div>
        </div>

        {/* Delivery Promise Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 pt-8 border-t border-blue-100"
        >
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Same Day Delivery Guaranteed</h3>
                  <p className="text-sm text-white/80">Order before 10 AM for delivery within Tacloban City</p>
                </div>
              </div>
              {/* <Link href="/delivery-info"> */}
                <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 rounded-full">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              {/* </Link> */}
            </div>
          </div>
        </motion.div>

        {/* Partner Benefits Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-gray-500"
        >
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>No minimum order for partners</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Volume discounts available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Dedicated account manager</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};