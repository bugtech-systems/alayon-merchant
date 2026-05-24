// components/product/product-gallery.jsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export function ProductGallery({ product }: any) {
  // Get all product images
  const images = product.images?.length 
    ? product.images 
    : product.thumbnail 
      ? [{ url: product.thumbnail, alt: product.title }]
      : []
  
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedImage = images[selectedIndex]

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-secondary rounded-lg flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">No image available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[3/4] bg-secondary rounded-lg overflow-hidden group">
        <Image
          src={selectedImage.url}
          alt={selectedImage.alt || product.title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Zoom Button */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="absolute bottom-4 right-4 p-2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Zoom image"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black">
            <div className="relative w-full h-full min-h-[50vh]">
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt || product.title}
                fill
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-background/80 backdrop-blur-sm rounded-full text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image: any, index: any) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden transition-all ${
                index === selectedIndex
                  ? 'ring-2 ring-primary'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt || `${product.title} - Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}