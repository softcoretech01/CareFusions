import { useState, useMemo } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search, CheckCircle, FileText, ArrowLeft, GitCompare, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { DateFilter } from '../../components/ui/DateFilter';
import { useLocalStorage } from '../../utils/useLocalStorage';
import type { RFQRecord } from './RequestForQuotation';
import type { QuotationRecord } from './VendorQuotation';

export const QuotationComparison = () => {
  const [rfqs] = useLocalStorage<RFQRecord[]>('procurement_rfqs_v2', []);
  const [qtns, setQtns] = useLocalStorage<QuotationRecord[]>('procurement_qtns_v2', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRfq, setSelectedRfq] = useState<any | null>(null);

  // Group quotations by RFQ
  const activeComparisons = useMemo(() => {
    // Only care about RFQs that have at least one quotation
    const rfqsWithQuotes = rfqs.filter(rfq => 
      qtns.some(q => q.rfqNo === rfq.rfqNo)
    );

    return rfqsWithQuotes.map(rfq => {
      const rfqQtns = qtns.filter(q => q.rfqNo === rfq.rfqNo);
      
      return {
        rfqNo: rfq.rfqNo,
        rfqDate: rfq.rfqDate,
        prNumber: rfq.prNumber,
        department: rfq.department,
        requestedVendors: rfq.vendors?.length || 0,
        items: rfq.items.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          qty: item.requestedQty,
          uom: item.uom
        })),
        quotations: rfqQtns.map(q => {
          // Map rates by itemId
          const rates: Record<number, any> = {};
          q.items.forEach(item => {
            rates[item.itemId] = {
              rate: item.quotedRate,
              discount: item.discountPercentage,
              gst: item.gstPercentage,
              finalAmt: item.finalAmount
            };
          });

          return {
            quotationNo: q.quotationNo,
            vendor: q.vendorName,
            vendorRating: 4.5, // Mocked rating
            total: q.totalAmount,
            deliveryDays: q.deliveryDays,
            paymentTerms: q.paymentTerms,
            status: q.status,
            recommended: false, // We'll compute this dynamically below if needed
            rates
          };
        })
      };
    });
  }, [rfqs, qtns]);

  const filteredComparisons = activeComparisons.filter(c => {
    const matchesSearch = c.rfqNo.toLowerCase().includes(searchTerm.toLowerCase()) || c.department.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (fromDate && toDate && c.rfqDate) {
      const itemDate = new Date(c.rfqDate);
      const start = new Date(fromDate);
      const end = new Date(toDate);
      matchesDate = itemDate >= start && itemDate <= end;
    }
    return matchesSearch && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  const handleApprove = (rfqNo: string, quotationNo: string) => {
    const updatedQtns = qtns.map(q => {
      if (q.rfqNo === rfqNo) {
        if (q.quotationNo === quotationNo) {
          return { ...q, status: 'Approved' };
        } else {
          return { ...q, status: 'Rejected' };
        }
      }
      return q;
    });
    setQtns(updatedQtns);
    alert(`Quotation ${quotationNo} for ${rfqNo} has been Approved!`);
    setSelectedRfq(null);
  };

  // Paginates the RFQ card grid below. Declared here, above the detail-view
  // early return, so the hook order stays identical on every render.
  const { page, setPage, pageSize, total, paged } = usePagination(filteredComparisons);

  if (selectedRfq) {
    // Calculate bests
    const lowestTotal = Math.min(...selectedRfq.quotations.map((q:any) => q.total));
    const fastestDelivery = Math.min(...selectedRfq.quotations.map((q:any) => q.deliveryDays));
    
    // Auto mark the lowest as recommended for display
    const enrichedQuotations = selectedRfq.quotations.map((q: any) => ({
      ...q,
      recommended: q.total === lowestTotal
    }));

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <button onClick={() => setSelectedRfq(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to List
            </button>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              Compare Quotations
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">{selectedRfq.rfqNo}</span>
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Overall Vendor Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Quotation No</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Rating</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Total Amount (₹)</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Delivery</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Payment Terms</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedQuotations.map((q: any) => (
                    <tr key={q.quotationNo} className={q.recommended ? 'bg-primary/5' : 'bg-white'}>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {q.quotationNo}
                        {q.recommended && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><Award className="w-3 h-3"/> Best Price</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{q.vendor}</td>
                      <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                        <span className="text-amber-500">★</span> {q.vendorRating}/5.0
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${q.total === lowestTotal ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {q.total.toLocaleString()}
                        {q.total === lowestTotal && <span className="block text-[10px] text-emerald-500">Lowest</span>}
                      </td>
                      <td className={`py-3 px-4 text-center ${q.deliveryDays === fastestDelivery ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                        {q.deliveryDays} Days
                        {q.deliveryDays === fastestDelivery && <span className="block text-[10px] text-emerald-500">Fastest</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{q.paymentTerms}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>{q.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {q.status === 'Draft' || q.status === 'Submitted' || q.status === 'Pending Evaluation' ? (
                          <Button variant="filled" color="primary" size="sm" onClick={() => handleApprove(selectedRfq.rfqNo, q.quotationNo)}>
                            Approve
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Item Level Comparison</h3>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" /> Lowest Rate</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> Highest Rate</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">Item Details</th>
                    {enrichedQuotations.map((q: any) => (
                      <th key={q.quotationNo} className="text-center py-3 px-4 font-medium text-slate-600 border-r border-slate-100 last:border-0 bg-slate-50">
                        <div className="font-bold text-slate-800 mb-1">{q.vendor}</div>
                        <div className="text-xs font-normal">{q.quotationNo}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRfq.items.map((item: any) => {
                    // Find highest and lowest rates for this item
                    const validRates = enrichedQuotations.map((q:any) => q.rates[item.itemId]?.rate).filter(Boolean);
                    const minRate = Math.min(...validRates);
                    const maxRate = Math.max(...validRates);

                    return (
                      <tr key={item.itemId} className="hover:bg-slate-50/50">
                        <td className="py-4 px-4 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10">
                          <div className="font-medium text-slate-800">{item.itemName}</div>
                          <div className="text-slate-500 text-xs mt-1">Qty: {item.qty} {item.uom}</div>
                        </td>
                        {enrichedQuotations.map((q: any) => {
                          const rateData = q.rates[item.itemId];
                          if (!rateData) return <td key={q.quotationNo} className="text-center text-slate-400 py-4 border-r border-slate-100 last:border-0 bg-slate-50/30">Not Quoted</td>;

                          const isLowest = rateData.rate === minRate;
                          const isHighest = rateData.rate === maxRate && validRates.length > 1;

                          return (
                            <td key={q.quotationNo} className={`py-4 px-4 text-center border-r border-slate-100 last:border-0 transition-colors ${isLowest ? 'bg-emerald-50/50' : isHighest ? 'bg-red-50/30' : ''}`}>
                              <div className={`font-bold text-lg mb-1 ${isLowest ? 'text-emerald-700' : isHighest ? 'text-red-600' : 'text-slate-800'}`}>
                                {rateData.rate.toLocaleString()}
                              </div>
                              <div className="flex justify-center gap-3 text-[10px] text-slate-500">
                                <span>Disc: {rateData.discount}%</span>
                                <span>GST: {rateData.gst}%</span>
                              </div>
                              <div className="mt-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-200/50 mx-4">
                                Net: {rateData.finalAmt.toLocaleString()}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Procurement</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Quotation Comparison</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Compare Quotations</h1>
        </div>
        <DateFilter
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
          onSearch={() => {}}
          onReset={() => { setFromDate(''); setToDate(''); }}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" placeholder="Search by RFQ No or Department..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paged.map((comp) => (
              <div key={comp.rfqNo} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="p-3 border-b border-slate-100 bg-slate-50 group-hover:bg-primary/5 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{comp.rfqNo}</h3>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {comp.quotations.length} Quotes
                      </span>
                      {comp.requestedVendors > comp.quotations.length && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                          {comp.requestedVendors - comp.quotations.length} Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {comp.department}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">PR Number</span>
                    <span className="font-medium text-slate-800">{comp.prNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-800">{comp.rfqDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Items</span>
                    <span className="font-medium text-slate-800">{comp.items.length}</span>
                  </div>
                  {comp.quotations.find((q: any) => q.status === 'Approved') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                      <span className="font-bold text-slate-800">
                        {comp.quotations.find((q: any) => q.status === 'Approved')?.vendor}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <Button variant="filled" color="primary" className="w-full" icon={GitCompare} onClick={() => setSelectedRfq(comp)}>
                      Compare Quotations
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredComparisons.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">No RFQs with quotations to compare.</div>
            )}
          </div>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>
    </motion.div>
  );
};
