"use client";

import { Drawer, Badge, Table } from "@medusajs/ui";
import { useCompany } from "../../../hooks/api";
import { Calendar, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanyDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function CompanyDetailsDrawer({ open, onOpenChange, companyId }: CompanyDetailsDrawerProps) {
  const { data, isLoading } = useCompany(companyId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="max-w-3xl">
        <Drawer.Header>
          <Drawer.Title>Company Details</Drawer.Title>
          <Drawer.Description>
            View complete company information
          </Drawer.Description>
        </Drawer.Header>
        
        {isLoading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : data?.company ? (
          <div className="p-6 space-y-6">
            {/* Header with Logo and Banner */}
            <div className="relative">
              {data.company.banner_url && (
                <div className="h-32 rounded-lg overflow-hidden">
                  <img 
                    src={data.company.banner_url} 
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center mt-4">
                {data.company.logo_url ? (
                  <img 
                    src={data.company.logo_url} 
                    alt={data.company.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xl font-bold">
                      {data.company.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="ml-4">
                  <h2 className="text-2xl font-bold">{data.company.name}</h2>
                  <p className="text-gray-500 font-mono text-sm">{data.company.handle}</p>
                </div>
              </div>
            </div>
            
            {/* Company Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{data.company.municipality}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(data.company.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Products Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Products & Pricing</h3>
              </div>
              
              {data.company.products && data.company.products.length > 0 ? (
                <div className="space-y-4">
                  {data.company.products.map((product) => (
                    <div key={product.product_id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{product.product_name}</h4>
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>Variant</Table.HeaderCell>
                            <Table.HeaderCell>Custom Price</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {product.variants.map((variant) => (
                            <Table.Row key={variant.variant_id}>
                              <Table.Cell>{variant.variant_name}</Table.Cell>
                              <Table.Cell>
                                <Badge>
                                  ${(variant.custom_price / 100).toFixed(2)}
                                </Badge>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No products assigned to this company
                </div>
              )}
            </div>
          </div>
        ) : null}
        
        <Drawer.Footer>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}