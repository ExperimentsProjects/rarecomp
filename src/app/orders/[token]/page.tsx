import OrderPage from '@/components/order-page';
export const metadata={title:'Your order — Experiments_Projects',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <OrderPage token={token}/>;}
