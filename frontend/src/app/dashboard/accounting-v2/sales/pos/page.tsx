"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/types";

type OptionRow = { id: number; code?: string; sku?: string; name: string; sales_price?: string };

type PosLine = {
  item: string;
  quantity: string;
  unit_price: string;
};

export default function AccountingV2PosPage() {
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState("");
  const [location, setLocation] = useState("");
  const [line, setLine] = useState<PosLine>({ item: "", quantity: "1.000", unit_price: "0.00" });
  const [error, setError] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["v2-pos-customers"],
    queryFn: () => request<PaginatedResponse<OptionRow>>("/v2/masters/customers/?page=1&page_size=200"),
    staleTime: 60_000,
  });
  const locations = useQuery({
    queryKey: ["v2-pos-locations"],
    queryFn: () => request<PaginatedResponse<OptionRow>>("/v2/inventory/locations/?page=1&page_size=200"),
    staleTime: 60_000,
  });
  const items = useQuery({
    queryKey: ["v2-pos-items"],
    queryFn: () => request<PaginatedResponse<OptionRow>>("/v2/masters/items/?page=1&page_size=200"),
    staleTime: 60_000,
  });

  const selectedItem = useMemo(
    () => items.data?.results.find((row) => String(row.id) === line.item),
    [items.data?.results, line.item],
  );

  const checkout = useMutation({
    mutationFn: () =>
      request("/v2/sales/pos/checkout/", "POST", {
        customer,
        location,
        lines: [
          {
            item: Number(line.item),
            quantity: line.quantity,
            unit_price: line.unit_price,
          },
        ],
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["v2-sales-invoices"] });
      setLine({ item: "", quantity: "1.000", unit_price: "0.00" });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "فشل تنفيذ عملية نقطة البيع.");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer || !location || !line.item) {
      setError("العميل والموقع والصنف حقول إلزامية.");
      return;
    }
    checkout.mutate();
  };

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>نقطة البيع</h3>
          <p>إنشاء فاتورة نقدية في خطوة واحدة مع ترحيل تلقائي لحركة المخزون والقيود المحاسبية.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="resource-form" style={{ marginTop: "0.9rem" }}>
        <div className="resource-form-grid">
          <label>
            <span>العميل</span>
            <select value={customer} onChange={(event) => setCustomer(event.target.value)} required>
              <option value="">اختر العميل</option>
              {(customers.data?.results ?? []).map((row) => (
                <option key={row.id} value={String(row.id)}>{`${row.code ?? row.id} - ${row.name}`}</option>
              ))}
            </select>
          </label>

          <label>
            <span>الموقع المخزني</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)} required>
              <option value="">اختر الموقع</option>
              {(locations.data?.results ?? []).map((row) => (
                <option key={row.id} value={String(row.id)}>{`${row.code ?? row.id} - ${row.name}`}</option>
              ))}
            </select>
          </label>

          <label>
            <span>الصنف</span>
            <select
              value={line.item}
              onChange={(event) => {
                const nextItemId = event.target.value;
                const item = (items.data?.results ?? []).find((row) => String(row.id) === nextItemId);
                setLine((prev) => ({
                  ...prev,
                  item: nextItemId,
                  unit_price: item?.sales_price ? String(item.sales_price) : prev.unit_price,
                }));
              }}
              required
            >
              <option value="">اختر الصنف</option>
              {(items.data?.results ?? []).map((row) => (
                <option key={row.id} value={String(row.id)}>{`${row.sku ?? row.id} - ${row.name}`}</option>
              ))}
            </select>
          </label>

          <label>
            <span>الكمية</span>
            <input
              value={line.quantity}
              onChange={(event) => setLine((prev) => ({ ...prev, quantity: event.target.value }))}
              type="number"
              min="0.001"
              step="0.001"
              required
            />
          </label>

          <label>
            <span>سعر الوحدة</span>
            <input
              value={line.unit_price}
              onChange={(event) => setLine((prev) => ({ ...prev, unit_price: event.target.value }))}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>

          <label>
            <span>إجمالي البند</span>
            <input value={(Number(line.quantity || "0") * Number(line.unit_price || "0")).toFixed(2)} readOnly />
          </label>
        </div>

        <div className="resource-form-actions" style={{ marginTop: "0.8rem" }}>
          <button type="submit" className="btn btn-primary" disabled={checkout.isPending}>
            {checkout.isPending ? "جاري التنفيذ..." : "إتمام البيع"}
          </button>
        </div>
      </form>

      {selectedItem ? <p style={{ marginTop: "0.8rem" }}>الصنف المحدد: {selectedItem.name}</p> : null}
      {error ? <p className="error-banner" style={{ marginTop: "0.8rem" }}>{error}</p> : null}
      {checkout.isSuccess ? <p className="status-success" style={{ marginTop: "0.8rem" }}>تم إنشاء وترحيل فاتورة نقطة البيع بنجاح.</p> : null}
    </section>
  );
}
