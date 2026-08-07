// components/dashboard/jags-monitoring-chart.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Package, ArrowLeftRight, AlertTriangle } from 'lucide-react';

interface JagsData {
  ownBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  otherBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  noBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  totalBorrowed: number;
  totalReturned: number;
  outstanding: number;
  overdue: number;
}

interface JagsMonitoringChartProps {
  data: JagsData;
}

const COLORS = {
  ownBrand: ['#3b82f6', '#93c5fd', '#1d4ed8'],
  otherBrand: ['#f59e0b', '#fcd34d', '#b45309'],
  noBrand: ['#6b7280', '#9ca3af', '#374151'],
};

export function JagsMonitoringChart({ data }: JagsMonitoringChartProps) {
  const pieData = [
    { 
      name: 'Own Brand', 
      value: data.ownBrand.inCirculation,
      color: COLORS.ownBrand[0],
      details: data.ownBrand
    },
    { 
      name: 'Other Brand', 
      value: data.otherBrand.inCirculation,
      color: COLORS.otherBrand[0],
      details: data.otherBrand
    },
    { 
      name: 'No Brand', 
      value: data.noBrand.inCirculation,
      color: COLORS.noBrand[0],
      details: data.noBrand
    },
  ];

  const barData = [
    {
      category: 'Own Brand',
      borrowed: data.ownBrand.borrowed,
      returned: data.ownBrand.returned,
      lost: data.ownBrand.lost,
    },
    {
      category: 'Other Brand',
      borrowed: data.otherBrand.borrowed,
      returned: data.otherBrand.returned,
      lost: data.otherBrand.lost,
    },
    {
      category: 'No Brand',
      borrowed: data.noBrand.borrowed,
      returned: data.noBrand.returned,
      lost: data.noBrand.lost,
    },
  ];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <p className="font-bold text-lg">{item.name}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">In Circulation: <span className="font-medium">{item.value}</span></p>
            <p className="text-sm">Borrowed: <span className="font-medium">{item.details.borrowed}</span></p>
            <p className="text-sm">Returned: <span className="font-medium">{item.details.returned}</span></p>
            <p className="text-sm text-red-600">Lost: <span className="font-medium">{item.details.lost}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-blue-600 font-medium">Own Brand Jags</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.ownBrand.inCirculation}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
            <div className="mt-2 text-xs text-blue-600">
              {data.ownBrand.borrowed} borrowed • {data.ownBrand.returned} returned
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-amber-600 font-medium">Other Brand Jags</p>
                <p className="text-2xl font-bold text-amber-700">
                  {data.otherBrand.inCirculation}
                </p>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-amber-400" />
            </div>
            <div className="mt-2 text-xs text-amber-600">
              {data.otherBrand.borrowed} borrowed • {data.otherBrand.returned} returned
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 font-medium">No Brand Jags</p>
                <p className="text-2xl font-bold text-gray-700">
                  {data.noBrand.inCirculation}
                </p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {data.noBrand.borrowed} borrowed • {data.noBrand.returned} returned
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Jags Distribution</span>
              <Badge variant="secondary">
                Total: {data.totalBorrowed + data.totalReturned}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Borrowed vs Returned */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Borrowed vs Returned</span>
              {data.overdue > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {data.overdue} Overdue
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="borrowed" name="Borrowed" fill="#3b82f6" />
                <Bar dataKey="returned" name="Returned" fill="#10b981" />
                <Bar dataKey="lost" name="Lost" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Jags Movement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold text-blue-600">{data.outstanding}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Borrowed</p>
              <p className="text-2xl font-bold text-amber-600">{data.totalBorrowed}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Returned</p>
              <p className="text-2xl font-bold text-green-600">{data.totalReturned}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{data.overdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}