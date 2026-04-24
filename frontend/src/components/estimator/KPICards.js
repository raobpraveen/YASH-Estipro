import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export const KPICards = ({ overall, profitMarginPercentage }) => {
  return (
    <>
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Man-Months</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0F172A]" data-testid="total-mm">
              {overall.totalMM.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-mm">
              {overall.onsiteMM.toFixed(2)}
            </p>
            {overall.onsiteMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${(overall.onsiteMM > 0 
                  ? (overall.onsiteSellingPrice / overall.onsiteMM).toFixed(0) 
                  : 0).toLocaleString()}/MM
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-mm">
              {overall.offshoreMM.toFixed(2)}
            </p>
            {overall.offshoreMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${(overall.offshoreMM > 0 
                  ? (overall.offshoreSellingPrice / overall.offshoreMM).toFixed(0) 
                  : 0).toLocaleString()}/MM
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[#8B5CF6] shadow-sm bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Logistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#8B5CF6]" data-testid="total-logistics">
              ${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#10B981] shadow-sm bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#10B981]" data-testid="selling-price">
              ${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Price Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite Avg. $/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-avg-price">
              ${overall.onsiteMM > 0 
                ? (overall.onsiteSellingPrice / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-selling-price">
              ${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">incl. logistics</p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore Avg. $/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-avg-price">
              ${overall.offshoreMM > 0 
                ? (overall.offshoreSellingPrice / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-selling-price">
              ${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default KPICards;
