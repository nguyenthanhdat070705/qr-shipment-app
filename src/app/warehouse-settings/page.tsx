import PageLayout from "@/components/PageLayout";
import { Settings } from "lucide-react";
import WarehouseSettingsTabs from "./WarehouseSettingsTabs";
import ProductListPage from "../product/fullproductlist/page";
import ProductsManageClient from "../products-manage/ProductsManageClient";
import SuppliersManageClient from "../suppliers-manage/SuppliersManageClient";
import WarehousesManageClient from "../warehouses-manage/WarehousesManageClient";

export default async function WarehouseSettingsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const params = await props.searchParams;
  const currentTab = params?.tab || "products";

  return (
    <PageLayout title="Quản lý & Khai báo thông tin kho" icon={<Settings size={15} className="text-teal-500" />}>
      <div className="w-full">
        <WarehouseSettingsTabs currentTab={currentTab} />
        
        <div className="mt-2">
          {currentTab === "products" && <ProductListPage />}
          {currentTab === "boxes" && <ProductsManageClient />}
          {currentTab === "suppliers" && <SuppliersManageClient />}
          {currentTab === "warehouses" && <WarehousesManageClient />}
        </div>
      </div>
    </PageLayout>
  );
}
