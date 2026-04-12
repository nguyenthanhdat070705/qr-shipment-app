import { Metadata } from 'next';
import ProductsManageClient from './ProductsManageClient';

export const metadata: Metadata = {
  title: 'Quản lý sản phẩm — BlackStones SCM',
  description: 'Tạo mã, thêm mới và quản lý danh mục sản phẩm hòm.',
};

export const dynamic = 'force-dynamic';

export default function ProductsManagePage() {
  return <ProductsManageClient />;
}
