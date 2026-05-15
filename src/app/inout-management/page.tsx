import PageLayout from "@/components/PageLayout";
import { Truck } from "lucide-react";
import InOutManagementTabs from "./InOutManagementTabs";
import { GoodsReceiptContent } from "../goods-receipt/page";
import { ReceiptManagementContent } from "../receipt-management/page";
import { GoodsIssueContent } from "../goods-issue/page";
import { InventoryContent } from "../inventory/page";
import { VoidedReceiptsContent } from "../voided-receipts/page";
import ExportReviewTab from "../io-management/components/ExportReviewTab";

export default async function InOutManagementPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const params = await props.searchParams;
  const currentTab = params?.tab || "import";

  return (
    <PageLayout title="Quản lý Xuất Nhập" icon={<Truck size={15} className="text-blue-500" />}>
      <div className="w-full">
        <InOutManagementTabs currentTab={currentTab} />
        
        <div className="mt-2">
          {currentTab === "import" && <GoodsReceiptContent />}
          {currentTab === "receipt-management" && <ReceiptManagementContent />}
          {currentTab === "export" && <GoodsIssueContent />}
          {currentTab === "export-management" && <ExportReviewTab />}
          {currentTab === "void-receipt" && (
            <div className="flex items-center justify-center h-64 text-gray-500 font-semibold bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 mt-4">
              Tính năng đang phát triển...
            </div>
          )}
          {currentTab === "voided-receipts" && <VoidedReceiptsContent />}
          {currentTab === "inventory" && <InventoryContent />}
        </div>
      </div>
    </PageLayout>
  );
}
