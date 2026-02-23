export type AccountingHierarchyNode = {
  id: string;
  title: string;
  description: string;
  href?: string;
  status?: "active" | "ready" | "planned";
  children?: AccountingHierarchyNode[];
};

export const accountingHierarchyRoot: AccountingHierarchyNode = {
  id: "entry",
  title: "المدخل: إضافة قيد فردي",
  description: "ابدأ من قيد يومية فردي، ثم وسّع النظام إلى دورة محاسبية كاملة.",
  href: "/dashboard/accounting-v2/gl/journal-entries",
  status: "active",
  children: [
    {
      id: "setup",
      title: "المرحلة 1: التأسيس",
      description: "تعريف الهيكل المحاسبي الأساسي القابل للتوسع.",
      href: "/dashboard/accounting-v2/setup",
      status: "ready",
      children: [
        {
          id: "coa",
          title: "شجرة الحسابات",
          description: "حسابات رئيسية/فرعية هرمية.",
          href: "/dashboard/accounting-v2/setup/accounts",
          status: "ready",
        },
        {
          id: "cost-centers",
          title: "مراكز التكلفة",
          description: "تحليل الأداء حسب فرع/قسم/مشروع.",
          href: "/dashboard/accounting-v2/setup/cost-centers",
          status: "ready",
        },
        {
          id: "masters",
          title: "البيانات الأساسية",
          description: "عملاء، موردون، أصناف، مواقع مخزون.",
          href: "/dashboard/accounting-v2/setup",
          status: "ready",
          children: [
            {
              id: "customers",
              title: "العملاء",
              description: "أساس حسابات العملاء والتحصيل.",
              href: "/dashboard/accounting-v2/setup/customers",
              status: "ready",
            },
            {
              id: "vendors",
              title: "الموردون",
              description: "أساس حسابات الموردين والدفعات.",
              href: "/dashboard/accounting-v2/setup/vendors",
              status: "ready",
            },
            {
              id: "items",
              title: "الأصناف",
              description: "تسعير وتكلفة وتتبع مخزون.",
              href: "/dashboard/accounting-v2/setup/items",
              status: "ready",
            },
            {
              id: "locations",
              title: "المواقع المخزنية",
              description: "إدارة المخزون عبر الحركات فقط.",
              href: "/dashboard/accounting-v2/setup/locations",
              status: "ready",
            },
          ],
        },
      ],
    },
    {
      id: "operations",
      title: "المرحلة 2: التشغيل اليومي",
      description: "دورة المبيعات والمشتريات والخزينة وربطها تلقائيًا بالقيود.",
      status: "ready",
      children: [
        {
          id: "sales",
          title: "المبيعات ونقطة البيع",
          description: "Quotation → Order → Invoice + POS.",
          href: "/dashboard/accounting-v2/sales",
          status: "ready",
        },
        {
          id: "procurement",
          title: "المشتريات والمخزون",
          description: "PO → Receive → Purchase Invoice + Adjustments.",
          href: "/dashboard/accounting-v2/procurement",
          status: "ready",
        },
        {
          id: "treasury",
          title: "الخزينة والبنوك",
          description: "سندات قبض/دفع والشيكات والتسوية البنكية.",
          href: "/dashboard/accounting-v2/treasury",
          status: "ready",
        },
      ],
    },
    {
      id: "control",
      title: "المرحلة 3: القيود والتقارير",
      description: "دفتر الأستاذ، ميزان المراجعة، القوائم المالية، وتحليل الربحية.",
      href: "/dashboard/accounting-v2/reports",
      status: "ready",
      children: [
        {
          id: "gl",
          title: "القيود اليدوية والترحيل",
          description: "قيود يومية مع قواعد الترحيل والضوابط.",
          href: "/dashboard/accounting-v2/gl/journal-entries",
          status: "ready",
        },
        {
          id: "reports",
          title: "التقارير والتحليلات",
          description: "TB / IS / BS / Aging / Profitability.",
          href: "/dashboard/accounting-v2/reports",
          status: "ready",
        },
      ],
    },
    {
      id: "expand",
      title: "المرحلة 4: التوسع والتكامل",
      description: "تكاملات إضافية (CSV Banking متاح الآن) وميزات مستقبلية.",
      href: "/dashboard/accounting-v2/banking",
      status: "planned",
    },
  ],
};
