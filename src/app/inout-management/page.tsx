import PageLayout from "@/components/PageLayout";
import { Truck } from "lucide-react";
import InOutManagementTabs from "./InOutManagementTabs";
import { GoodsReceiptContent } from "../goods-receipt/page";
import { ReceiptManagementContent } from "../receipt-management/page";
import { GoodsIssueContent } from "../goods-issue/page";
import { InventoryContent } from "../inventory/page";
import { VoidedReceiptsContent } from "../voided-receipts/page";

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
          {currentTab === "inventory" && <InventoryContent />}
          {currentTab === "voided-receipts" && <VoidedReceiptsContent />}
        </div>
      </div>
    </PageLayout>
  );
}
