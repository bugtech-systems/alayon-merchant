// app/(dashboard)/company/orders/[id]/page.tsx

import { notFound } from 'next/navigation';
import { OrderViewClient } from '../../_components/order-page';
import { retrieveOrder } from '@/lib/data/orders';

interface OrderPageProps {
  params: Promise<{ id: string }>; // Note: params is now a Promise
}

export default async function OrderPage({ params }: OrderPageProps) {
  // Unwrap the Promise first
  const { id } = await params;
  
  console.log(id, "PARRAMS");
  const order = await retrieveOrder(id);
  if (!order) notFound();
    console.log(order, "ORDER")
  return (
             <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <OrderViewClient order={order} />
                    </div>
                    )
}