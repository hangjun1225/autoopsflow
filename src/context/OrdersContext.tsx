import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { ChangeOrder } from '../types';
import { INITIAL_CHANGE_ORDERS } from '../constants';

/** 变更单全局上下文值 */
type OrdersContextValue = {
  orders: ChangeOrder[];
  setOrders: Dispatch<SetStateAction<ChangeOrder[]>>;
  /** 按 id 合并更新单条变更单 */
  updateOrder: (id: string, patch: Partial<ChangeOrder>) => void;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

/** 变更单列表 Provider（列表 / 审批 / 历史等共用） */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<ChangeOrder[]>(INITIAL_CHANGE_ORDERS);

  const updateOrder = (id: string, patch: Partial<ChangeOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  return (
    <OrdersContext.Provider value={{ orders, setOrders, updateOrder }}>{children}</OrdersContext.Provider>
  );
}

/** 读取变更单全局状态 */
export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders 必须在 OrdersProvider 内使用');
  return ctx;
}
