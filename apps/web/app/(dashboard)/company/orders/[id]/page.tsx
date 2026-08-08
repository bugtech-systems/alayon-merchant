// app/(dashboard)/company/orders/[id]/page.tsx

import { notFound } from 'next/navigation';
import { OrderViewClient } from '../../_components/order-page';
import { retrieveOrder } from '@/lib/data/orders';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  
  console.log(id, "PARRAMS");
  const order = await retrieveOrder(id);
  if (!order) notFound();
  console.log(order, "ORDER");
  
  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
        <OrderViewClient order={order} />
      </div>
    </div>
  );
}