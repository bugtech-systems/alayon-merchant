// app/(dashboard)/dashboard/messages/page.tsx

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { retrieveCompany, retrieveUser } from "@/lib/data";
import { redirect } from "next/navigation";
import MessageApp from "../_components/message-app";
import { getConversations } from "@/lib/actions/message";
import { sanitizePhoneNumber } from "@/lib/utils/helpers";

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await retrieveUser();

  if (!user) return redirect('/login');

  const pricingContext = {
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    companyId: user?.metadata?.role === 'company' 
      ? user.employee?.company_id 
      : user?.driver?.company_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group',
     companyNumber: user?.employee?.company?.phone 
  }


  const company = await retrieveCompany(pricingContext.companyId);

  // Get initial conversations data for SSR
  const initialConversations = await getConversations({
    phoneNumber: sanitizePhoneNumber(company.phone),
    limit: 20,
    offset: 0
  });


  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessageApp 
        initialConversations={initialConversations} 
        currentUser={user}
        company={company}
      />
    </Suspense>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex h-[90vh] overflow-hidden bg-gray-50">
      {/* Conversation List Skeleton */}
      <div className="hidden lg:flex w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="flex flex-col items-end space-y-1">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area Skeleton */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'} space-y-1`}>
                <Skeleton className={`h-10 w-48 ${i % 2 === 0 ? 'rounded-l-lg rounded-tr-lg' : 'rounded-r-lg rounded-tl-lg'}`} />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <Skeleton className="flex-1 h-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}